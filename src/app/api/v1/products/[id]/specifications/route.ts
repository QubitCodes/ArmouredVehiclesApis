import { NextRequest, NextResponse } from 'next/server';
import { ProductSpecification } from '@/models/ProductSpecification';
import { Product } from '@/models/Product';
import { verifyAccessToken } from '@/utils/jwt';
import { User } from '@/models';
import { z } from 'zod';

/**
 * Helper to verify auth without abstract controller
 */
async function verifyAuth(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return { user: null, error: 'Unauthorized' };
	}

	try {
		const token = authHeader.split(' ')[1];
		const decoded: any = verifyAccessToken(token);
		const userId = decoded.userId || decoded.sub;
		if (!userId) return { user: null, error: 'Invalid Token' };

		const user = await User.findByPk(userId);
		if (!user) return { user: null, error: 'User not found' };

		return { user, error: null };
	} catch (e: any) {
		return { user: null, error: e.name === 'TokenExpiredError' ? 'Token Expired' : 'Invalid Token' };
	}
}

/**
 * @swagger
 * /api/v1/products/{id}/specifications:
 *   get:
 *     summary: Get all specifications for a product
 *     tags: [Product Specifications]
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const resolvedParams = await params;
		const productId = resolvedParams.id;
		if (!productId) {
			return NextResponse.json(
				{ status: false, message: 'Invalid product ID', code: 400, data: null, errors: [] },
				{ status: 400 }
			);
		}

		const specifications = await ProductSpecification.findAll({
			where: { product_id: productId },
			order: [['sort', 'ASC'], ['created_at', 'ASC']],
		});

		return NextResponse.json({
			status: true,
			message: 'Success',
			code: 200,
			data: specifications,
			errors: [],
		});
	} catch (error: any) {
		return NextResponse.json(
			{ status: false, message: error.message, code: 500, data: null, errors: [] },
			{ status: 500 }
		);
	}
}

const createSpecSchema = z.object({
	label: z.string().optional().nullable(),
	value: z.string().optional().nullable(),
	type: z.enum(['general', 'title_only', 'value_only']).optional().default('general'),
	active: z.boolean().optional().default(true),
	sort: z.number().optional().default(0),
});

const bulkUpdateSchema = z.array(z.object({
	id: z.string().uuid().optional(),
	label: z.string().optional().nullable(),
	value: z.string().optional().nullable(),
	type: z.enum(['general', 'title_only', 'value_only']).optional().default('general'),
	active: z.boolean().optional().default(true),
	sort: z.number().optional().default(0),
}));

/**
 * @swagger
 * /api/v1/products/{id}/specifications:
 *   post:
 *     summary: Create a new specification for a product
 *     tags: [Product Specifications]
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { user, error } = await verifyAuth(req);
		if (error) {
			return NextResponse.json(
				{ status: false, message: error, code: 401, data: null, errors: [] },
				{ status: 401 }
			);
		}

		const resolvedParams = await params;
		const productId = resolvedParams.id;
		if (!productId) {
			return NextResponse.json(
				{ status: false, message: 'Invalid product ID', code: 400, data: null, errors: [] },
				{ status: 400 }
			);
		}

		const product = await Product.findByPk(productId);
		if (!product) {
			return NextResponse.json(
				{ status: false, message: 'Product not found', code: 404, data: null, errors: [] },
				{ status: 404 }
			);
		}

		const body = await req.json();
		const parsed = createSpecSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ status: false, message: 'Validation error', code: 400, data: null, errors: parsed.error.issues },
				{ status: 400 }
			);
		}

		const specification = await ProductSpecification.create({
			product_id: productId,
			...parsed.data,
		});

		await syncProductAttributes(productId);

		return NextResponse.json({
			status: true,
			message: 'Specification created',
			code: 201,
			data: specification,
			errors: [],
		}, { status: 201 });
	} catch (error: any) {
		return NextResponse.json(
			{ status: false, message: error.message, code: 500, data: null, errors: [] },
			{ status: 500 }
		);
	}
}

/**
 * @swagger
 * /api/v1/products/{id}/specifications:
 *   put:
 *     summary: Bulk update/create specifications for a product
 *     tags: [Product Specifications]
 */
export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { user, error } = await verifyAuth(req);
		if (error) {
			return NextResponse.json(
				{ status: false, message: error, code: 401, data: null, errors: [] },
				{ status: 401 }
			);
		}

		const resolvedParams = await params;
		const productId = resolvedParams.id;
		if (!productId) {
			return NextResponse.json(
				{ status: false, message: 'Invalid product ID', code: 400, data: null, errors: [] },
				{ status: 400 }
			);
		}

		const body = await req.json();
		const parsed = bulkUpdateSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ status: false, message: 'Validation error', code: 400, data: null, errors: parsed.error.issues },
				{ status: 400 }
			);
		}

		const results = [];
		for (const spec of parsed.data) {
			if (spec.id) {
				const existing = await ProductSpecification.findByPk(spec.id);
				if (existing && existing.product_id === productId) {
					await existing.update({
						label: spec.label,
						value: spec.value,
						type: spec.type,
						active: spec.active,
						sort: spec.sort,
					});
					results.push(existing);
				}
			} else {
				const created = await ProductSpecification.create({
					product_id: productId,
					label: spec.label,
					value: spec.value,
					type: spec.type,
					active: spec.active,
					sort: spec.sort,
				});
				results.push(created);
			}
		}

		await syncProductAttributes(productId);

		return NextResponse.json({
			status: true,
			message: 'Specifications updated',
			code: 200,
			data: results,
			errors: [],
		});
	} catch (error: any) {
		return NextResponse.json(
			{ status: false, message: error.message, code: 500, data: null, errors: [] },
			{ status: 500 }
		);
	}
}

/**
 * Helper: Sync Product Attributes (sizes, colors) from Specifications
 */
async function syncProductAttributes(productId: string) {
	try {
		const specs = await ProductSpecification.findAll({ where: { product_id: productId } });
		const sizes: string[] = [];
		const colors: string[] = [];

		for (const s of specs) {
			if (s.active === false) continue;
			const label = (s.label || '').trim();
			const value = (s.value || '').trim();
			if (!value) continue;

			if (label === 'Size') {
				sizes.push(value);
			} else if (label === 'Color') {
				const parts = value.split(',').map(x => x.trim()).filter(Boolean);
				colors.push(...parts);
			}
		}

		await Product.update(
			{ sizes: Array.from(new Set(sizes)), colors: Array.from(new Set(colors)) },
			{ where: { id: productId } }
		);
	} catch (err) {
		console.error('Failed to sync product attributes:', err);
	}
}
