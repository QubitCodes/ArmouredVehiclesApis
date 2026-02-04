import { NextRequest, NextResponse } from 'next/server';
import { ProductSpecification } from '@/models/ProductSpecification';
import { verifyAccessToken } from '@/utils/jwt';
import { User, Product } from '@/models';
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

const updateSpecSchema = z.object({
	label: z.string().optional().nullable(),
	value: z.string().optional().nullable(),
	type: z.enum(['general', 'title_only', 'value_only']).optional(),
	active: z.boolean().optional(),
	sort: z.number().optional(),
});

/**
 * @swagger
 * /api/v1/products/{id}/specifications/{specId}:
 *   put:
 *     summary: Update a single specification
 *     tags: [Product Specifications]
 */
export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string; specId: string }> }
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
		const specId = resolvedParams.specId;

		if (!productId) {
			return NextResponse.json(
				{ status: false, message: 'Invalid product ID', code: 400, data: null, errors: [] },
				{ status: 400 }
			);
		}

		const specification = await ProductSpecification.findByPk(specId);
		if (!specification || specification.product_id !== productId) {
			return NextResponse.json(
				{ status: false, message: 'Specification not found', code: 404, data: null, errors: [] },
				{ status: 404 }
			);
		}

		const body = await req.json();
		const parsed = updateSpecSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ status: false, message: 'Validation error', code: 400, data: null, errors: parsed.error.issues },
				{ status: 400 }
			);
		}

		await specification.update(parsed.data);

		await syncProductAttributes(productId);

		return NextResponse.json({
			status: true,
			message: 'Specification updated',
			code: 200,
			data: specification,
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
 * @swagger
 * /api/v1/products/{id}/specifications/{specId}:
 *   delete:
 *     summary: Delete a specification
 *     tags: [Product Specifications]
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string; specId: string }> }
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
		const specId = resolvedParams.specId;

		if (!productId) {
			return NextResponse.json(
				{ status: false, message: 'Invalid product ID', code: 400, data: null, errors: [] },
				{ status: 400 }
			);
		}

		const specification = await ProductSpecification.findByPk(specId);
		if (!specification || specification.product_id !== productId) {
			return NextResponse.json(
				{ status: false, message: 'Specification not found', code: 404, data: null, errors: [] },
				{ status: 404 }
			);
		}

		await specification.destroy();

		await syncProductAttributes(productId);

		return NextResponse.json({
			status: true,
			message: 'Specification deleted',
			code: 200,
			data: null,
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
