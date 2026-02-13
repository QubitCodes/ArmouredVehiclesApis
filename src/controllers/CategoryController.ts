import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { Category, Product, User } from '../models';
import { Op } from 'sequelize';
import { z } from 'zod';
import { verifyAccessToken } from '../utils/jwt';
import { PermissionService } from '../services/PermissionService';

import { FileUploadService } from '../services/FileUploadService';

/**
 * Category Controller
 * Implements full CRUD with nesting validation matching legacy behavior
 * Max nesting: 2 levels (main > category > subcategory)
 */

const createCategorySchema = z.object({
	name: z.string().min(1),
	image: z.string().optional().nullable(), // Image may be file or url
	description: z.string().optional().nullable(),
	parentId: z.number().optional().nullable(),
	isControlled: z.boolean().optional(),
});

const updateCategorySchema = z.object({
	name: z.string().min(1).optional(),
	image: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	parentId: z.number().optional().nullable(),
	isControlled: z.boolean().optional(),
});

export class CategoryController extends BaseController {

	/**
	 * Helper: Get category level (0 = main, 1 = category, 2 = subcategory)
	 */
	private async getCategoryLevel(categoryId: number): Promise<number> {
		let level = 0;
		let currentId: number | null = categoryId;

		while (currentId) {
			const category: any = await Category.findByPk(currentId);
			if (!category || !category.parent_id) break;
			currentId = category.parent_id;
			level++;
		}
		return level;
	}



	/**
	 * Helper: Verify admin authentication
	 */
	private async verifyAdmin(req: NextRequest): Promise<{ user: User | null; error: Response | null }> {
		const authHeader = req.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return { user: null, error: this.sendError('Unauthorized', 401) };
		}

		try {
			const token = authHeader.split(' ')[1];
			const decoded: any = verifyAccessToken(token);
			const user = await User.findByPk(decoded.userId || decoded.sub);

			if (!user) {
				return { user: null, error: this.sendError('User not found', 401) };
			}

			if (!['admin', 'super_admin'].includes(user.user_type)) {
				return { user: null, error: this.sendError('Only admins can perform this action', 403) };
			}

			if (user.user_type === 'admin') {
				const hasPerm = await new PermissionService().hasPermission(user.id, 'category.manage');
				if (!hasPerm) {
					return { user: null, error: this.sendError('Forbidden: Missing category.manage Permission', 403) };
				}
			}

			return { user, error: null };
		} catch (e) {
			return { user: null, error: this.sendError('Invalid token', 401) };
		}
	}

	/**
	 * Helper: Check if the requester is an admin
	 */
	private async isAdminRequest(req: NextRequest): Promise<boolean> {
		const authHeader = req.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
		try {
			const token = authHeader.split(' ')[1];
			const decoded: any = verifyAccessToken(token);
			const user = await User.findByPk(decoded.userId || decoded.sub);
			if (!user) return false;
			return ['admin', 'super_admin'].includes(user.user_type);
		} catch (e) {
			return false;
		}
	}

	/**
	 * Helper: Check if controlled categories should be filtered
	 */
	private async shouldFilterControlled(req: NextRequest): Promise<boolean> {
		const { searchParams } = new URL(req.url);
		if (searchParams.get('filter_controlled') !== 'true') return false;

		const authHeader = req.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return true;
		}

		try {
			const token = authHeader.split(' ')[1];
			const decoded: any = verifyAccessToken(token);
			const user = await User.findByPk(decoded.userId || decoded.sub, { include: ['profile'] });

			if (!user) return true;

			if (['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
				return false;
			}

			const profile: any = user.profile;
			if (profile && profile.onboarding_status === 'approved_controlled') {
				return false;
			}

			return true;

		} catch (e) {
			return true;
		}
	}

	/**
	 * GET /api/v1/categories
	 * List all categories
	 */
	async list(req: NextRequest) {
		try {
			const filterControlled = await this.shouldFilterControlled(req);
			const isAdmin = await this.isAdminRequest(req);
			const whereClause: any = {};

			// Non-admins only see active categories
			if (!isAdmin) {
				whereClause.is_active = true;
			}

			if (filterControlled) {
				whereClause.is_controlled = { [Op.not]: true };
			}

			const categories = await Category.findAll({
				where: Object.keys(whereClause).length ? whereClause : undefined,
				order: [['name', 'ASC']],
				// Always include parent to determine category level for product counts
				include: [
					{
						model: Category,
						as: 'parent',
						attributes: ['id', 'is_controlled', 'is_active', 'parent_id']
					}
				]
			});

			// Get product counts based on category level:
			// Level 0 (Main Category, parent_id = null): products.main_category_id
			// Level 1 (Category, parent is main): products.category_id  
			// Level 2 (Subcategory, parent is category): products.sub_category_id

			/**
			 * Helper: Build total and published count maps for a given category field.
			 * Returns { totalMap, pubMap } where each maps category ID -> count.
			 */
			const buildCountMaps = async (field: string) => {
				// Total count (all statuses)
				const totalCounts = await Product.findAll({
					attributes: [
						[field, 'cat_id'],
						[Product.sequelize!.fn('COUNT', Product.sequelize!.col('id')), 'count']
					],
					where: { [field]: { [Op.not]: null } },
					group: [field],
					raw: true
				}) as any[];

				// Published-only count
				const pubCounts = await Product.findAll({
					attributes: [
						[field, 'cat_id'],
						[Product.sequelize!.fn('COUNT', Product.sequelize!.col('id')), 'count']
					],
					where: { [field]: { [Op.not]: null }, status: 'published' },
					group: [field],
					raw: true
				}) as any[];

				const totalMap = new Map<number, number>();
				totalCounts.forEach((pc: any) => {
					totalMap.set(pc.cat_id, parseInt(pc.count) || 0);
				});

				const pubMap = new Map<number, number>();
				pubCounts.forEach((pc: any) => {
					pubMap.set(pc.cat_id, parseInt(pc.count) || 0);
				});

				return { totalMap, pubMap };
			};

			// Build count maps for all three category levels in parallel
			const [mainMaps, catMaps, subMaps] = await Promise.all([
				buildCountMaps('main_category_id'),
				buildCountMaps('category_id'),
				buildCountMaps('sub_category_id')
			]);

			// Add product_count (total) and published_product_count to each category
			const categoriesWithCount = categories.map((cat: any) => {
				const catJson = cat.toJSON ? cat.toJSON() : { ...cat };

				// Determine category level based on parent_id
				// Level 0: no parent_id (Main Category)
				// Level 1: has parent_id but parent has no parent (Category)
				// Level 2: parent has parent_id (Subcategory)
				if (!catJson.parent_id) {
					// Level 0 - Main Category
					catJson.product_count = mainMaps.totalMap.get(catJson.id) || 0;
					catJson.published_product_count = mainMaps.pubMap.get(catJson.id) || 0;
				} else if (catJson.parent && !catJson.parent.parent_id) {
					// Level 1 - Category (parent is main category)
					catJson.product_count = catMaps.totalMap.get(catJson.id) || 0;
					catJson.published_product_count = catMaps.pubMap.get(catJson.id) || 0;
				} else {
					// Level 2 - Subcategory
					catJson.product_count = subMaps.totalMap.get(catJson.id) || 0;
					catJson.published_product_count = subMaps.pubMap.get(catJson.id) || 0;
				}

				return catJson;
			});

			// --- Compute recursive totals (bottom-up aggregation) ---
			// Build a child map from the flat list
			const childMap = new Map<number, any[]>();
			categoriesWithCount.forEach((cat: any) => {
				if (cat.parent_id) {
					if (!childMap.has(cat.parent_id)) childMap.set(cat.parent_id, []);
					childMap.get(cat.parent_id)!.push(cat);
				}
			});

			// Set direct_subcategory_count for each category
			categoriesWithCount.forEach((cat: any) => {
				const children = childMap.get(cat.id) || [];
				cat.direct_subcategory_count = children.length;
			});

			/**
			 * Recursive helper: compute total product counts and subcategory counts
			 * by summing this category's direct counts + all descendants' direct counts.
			 */
			const computeRecursiveTotals = (cat: any): { totalProducts: number; totalPublished: number; totalSubcats: number } => {
				const children = childMap.get(cat.id) || [];
				let totalProducts = cat.product_count || 0;
				let totalPublished = cat.published_product_count || 0;
				let totalSubcats = children.length; // direct children

				for (const child of children) {
					const childTotals = computeRecursiveTotals(child);
					totalProducts += childTotals.totalProducts;
					totalPublished += childTotals.totalPublished;
					totalSubcats += childTotals.totalSubcats; // grandchildren + deeper
				}

				cat.total_product_count = totalProducts;
				cat.total_published_product_count = totalPublished;
				cat.total_subcategory_count = totalSubcats;

				return { totalProducts, totalPublished, totalSubcats };
			};

			// Run bottom-up from roots (categories with no parent)
			categoriesWithCount.filter((cat: any) => !cat.parent_id).forEach(computeRecursiveTotals);

			// Filter out categories whose parent is inactive (non-admin only)
			let result = categoriesWithCount;
			if (!isAdmin) {
				result = result.filter((cat: any) => {
					// If this category's parent is inactive, hide it
					if (cat.parent && cat.parent.is_active === false) return false;
					return true;
				});
			}

			if (filterControlled) {
				// Filter in memory for parent/grandparent control status
				result = result.filter((cat: any) => {
					if (cat.is_controlled) return false;
					if (cat.parent && cat.parent.is_controlled) return false;
					return true;
				});
			}

			return this.sendSuccess(result);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * GET /api/v1/categories/main
	 * Get main categories (level 0, no parent)
	 */
	async listMain(req: NextRequest) {
		try {
			const filterControlled = await this.shouldFilterControlled(req);
			const isAdmin = await this.isAdminRequest(req);
			const whereClause: any = { parent_id: null };

			// Always filter active categories for dropdowns/navigation
			// Management tables use list() instead
			whereClause.is_active = true;

			if (filterControlled) {
				whereClause.is_controlled = { [Op.not]: true };
			}

			const categories = await Category.findAll({
				where: whereClause,
				order: [['name', 'ASC']],
			});
			return this.sendSuccess(categories);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * GET /api/v1/categories/by-parent/:parentId
	 * Get subcategories by parent
	 */
	async listByParent(req: NextRequest, { params }: { params: { parentId: string } }) {
		try {
			const parentId = parseInt(params.parentId);
			if (isNaN(parentId)) {
				return this.sendError('Invalid parent ID', 400);
			}

			const filterControlled = await this.shouldFilterControlled(req);

			// Always check if parent is active/controlled before returning children
			// This endpoint is used by the public web sidebar; admin panel uses list() instead
			const parent = await Category.findByPk(parentId);
			if (parent) {
				if (parent.is_active === false) {
					return this.sendSuccess([]);
				}
				if (filterControlled && parent.is_controlled) {
					return this.sendSuccess([]);
				}
			}

			const whereClause: any = { parent_id: parentId, is_active: true };
			if (filterControlled) {
				whereClause.is_controlled = { [Op.not]: true };
			}

			const categories = await Category.findAll({
				where: whereClause,
				order: [['name', 'ASC']],
			});
			return this.sendSuccess(categories);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * GET /api/v1/categories/search
	 * Search categories by name
	 */
	async search(req: NextRequest) {
		try {
			const { searchParams } = new URL(req.url);
			const name = searchParams.get('name');
			const parentId = searchParams.get('parentId');

			if (!name) {
				return this.sendError('Name query parameter is required', 400);
			}

			const whereClause: any = {
				name: { [Op.iLike]: `%${name}%` },
			};

			if (parentId) {
				const pid = parseInt(parentId);
				if (isNaN(pid)) {
					return this.sendError('Invalid parent ID', 400);
				}
				whereClause.parent_id = pid;
			}

			const filterControlled = await this.shouldFilterControlled(req);
			const isAdmin = await this.isAdminRequest(req);

			if (!isAdmin) {
				whereClause.is_active = true;
			}

			if (filterControlled) {
				whereClause.is_controlled = { [Op.not]: true };
			}

			const needsParent = !isAdmin || filterControlled;
			const categories = await Category.findAll({
				where: whereClause,
				order: [['name', 'ASC']],
				include: needsParent ? [{ model: Category, as: 'parent', attributes: ['id', 'is_controlled', 'is_active', 'parent_id'] }] : undefined
			});

			let result: any[] = categories.map((c: any) => c.toJSON ? c.toJSON() : c);

			// Filter out categories whose parent is inactive
			if (!isAdmin) {
				result = result.filter((cat: any) => {
					if (cat.parent && cat.parent.is_active === false) return false;
					return true;
				});
			}

			if (filterControlled) {
				result = result.filter((cat: any) => {
					if (cat.is_controlled) return false;
					if (cat.parent && cat.parent.is_controlled) return false;
					return true;
				});
			}

			return this.sendSuccess(result);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * GET /api/v1/categories/:id
	 * Get single category with parent and children
	 */
	async getById(req: NextRequest, { params }: { params: { id: string } }) {
		try {
			const id = parseInt(params.id);
			if (isNaN(id)) {
				return this.sendError('Invalid category ID', 400);
			}

			const category: any = await Category.findByPk(id, {
				include: [
					{ model: Category, as: 'parent' },
					{ model: Category, as: 'children' },
				],
			});

			if (!category) {
				return this.sendError('Category not found', 404);
			}

			// Check Control Logic
			const filterControlled = await this.shouldFilterControlled(req);

			// Always block access to inactive categories
			// This endpoint is used by the web frontend; admin panel uses list() for its table
			if (category.is_active === false) {
				return this.sendError('Category not found', 404);
			}
			// Also block if parent category is inactive
			if (category.parent && category.parent.is_active === false) {
				return this.sendError('Category not found', 404);
			}

			if (filterControlled) {
				if (category.is_controlled) return this.sendError('Category not found', 404);
				if (category.parent && category.parent.is_controlled) return this.sendError('Category not found', 404);

				if (category.children && category.children.length > 0) {
					category.children = category.children.filter((child: any) => !child.is_controlled);
				}
			}

			// Filter inactive children
			if (category.children && category.children.length > 0) {
				category.children = category.children.filter((child: any) => child.is_active !== false);
			}

			return this.sendSuccess(category);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * GET /api/v1/categories/:id/hierarchy
	 * Get full path from root to this category
	 */
	async getHierarchy(req: NextRequest, { params }: { params: { id: string } }) {
		try {
			const id = parseInt(params.id);
			if (isNaN(id)) {
				return this.sendError('Invalid category ID', 400);
			}

			const filterControlled = await this.shouldFilterControlled(req);

			const path: Category[] = [];
			let currentId: number | null = id;
			let hidden = false;

			while (currentId) {
				const category: any = await Category.findByPk(currentId);
				if (!category) break;

				// Always hide inactive categories
				if (category.is_active === false) {
					hidden = true;
					break;
				}

				if (filterControlled && category.is_controlled) {
					hidden = true;
					break;
				}

				path.unshift(category);
				currentId = category.parent_id;
			}

			if (hidden) return this.sendError('Category not found', 404);

			return this.sendSuccess(path);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * Helper: Generate unique slug
	 */
	private async generateUniqueSlug(name: string, excludeId?: number): Promise<string> {
		const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
		let slug = baseSlug;
		let counter = 1;

		while (true) {
			const whereClause: any = { slug };
			if (excludeId) {
				whereClause.id = { [Op.ne]: excludeId };
			}
			const existing = await Category.findOne({ where: whereClause });
			if (!existing) break;

			slug = `${baseSlug}-${counter}`;
			counter++;
		}
		return slug;
	}

	/**
	 * POST /api/v1/categories
	 * Create category (Admin only)
	 * Content-Type: multipart/form-data (or application/json)
	 */
	async create(req: NextRequest, parsedData?: { data: any, files: File[] }) {
		try {
			const { user, error } = await this.verifyAdmin(req);
			if (error) return error;

			let body = parsedData ? parsedData.data : await req.json();
			const files = parsedData ? parsedData.files : [];

			// If body fields came as strings in FormData, parse/clean them
			if (typeof body.parentId === 'string') {
				body.parentId = body.parentId === "null" || body.parentId === "" ? null : parseInt(body.parentId);
			}
			if (typeof body.isControlled === 'string') {
				body.isControlled = body.isControlled === 'true';
			}

			const validated = createCategorySchema.parse(body);

			// Validate nesting level (max 2 levels deep)
			if (validated.parentId) {
				const level = await this.getCategoryLevel(validated.parentId);
				if (level >= 2) {
					return this.sendError(
						'Maximum nesting level reached. Categories can only go 2 levels deep (main category > category > subcategory)',
						400
					);
				}
			}

			// Generate unique slug
			const slug = await this.generateUniqueSlug(validated.name);

			// Handle Image Upload
			let imagePath = validated.image || null;
			if (files && files.length > 0) {
				// Assuming first file is the image
				const file = files[0];
				// Save to categories/{slug} or categories/{timestamp}
				const subdir = `categories`;
				// saveFile logic: file_uploads/categories/UUID-name.ext
				imagePath = await FileUploadService.saveFile(file, subdir);
				// The service returns relative path "file_uploads/..."
			}

			const category = await Category.create({
				name: validated.name,
				image: imagePath,
				description: validated.description || null,
				parent_id: validated.parentId || null,
				is_controlled: validated.isControlled || false,
				slug: slug,
			});

			return this.sendSuccess(category, 'Category created', 201);
		} catch (error: any) {
			if (error instanceof z.ZodError) {
				return this.sendError('Validation Error', 400, error.issues);
			}
			if (error.name === 'SequelizeUniqueConstraintError') {
				return this.sendError('Category already exists', 400);
			}
			if (error.name === 'SequelizeForeignKeyConstraintError') {
				return this.sendError('Invalid Parent Category ID', 400);
			}
			return this.sendError('Internal Server Error', 500, [], error);
		}
	}

	/**
	 * PUT /api/v1/categories/:id
	 * Update category (Admin only)
	 * Content-Type: multipart/form-data
	 */
	async update(req: NextRequest, { params, parsedData }: { params: { id: string }, parsedData?: { data: any, files: File[] } }) {
		try {
			const { user, error } = await this.verifyAdmin(req);
			if (error) return error;

			const id = parseInt(params.id);
			if (isNaN(id)) {
				return this.sendError('Invalid category ID', 400);
			}

			const existing = await Category.findByPk(id);
			if (!existing) {
				return this.sendError('Category not found', 404);
			}

			let body = parsedData ? parsedData.data : await req.json();
			const files = parsedData ? parsedData.files : [];

			// clean types
			if (typeof body.parentId === 'string') {
				body.parentId = body.parentId === "null" || body.parentId === "" ? null : parseInt(body.parentId);
			}
			if (typeof body.isControlled === 'string') {
				body.isControlled = body.isControlled === 'true';
			}

			const validated = updateCategorySchema.parse(body);

			// Validate nesting level if parentId is being changed
			if (validated.parentId !== undefined && validated.parentId !== existing.parent_id) {
				if (validated.parentId !== null) {
					const level = await this.getCategoryLevel(validated.parentId);
					if (level >= 2) {
						return this.sendError('Maximum nesting level reached', 400);
					}
				}

				// Check if this category has children - moving would exceed limits
				const children = await Category.findAll({ where: { parent_id: id } });
				if (children.length > 0 && validated.parentId !== null) {
					const newParentLevel = await this.getCategoryLevel(validated.parentId);
					if (newParentLevel >= 1) {
						return this.sendError(
							'Cannot move this category - it has subcategories and moving would exceed nesting limit',
							400
						);
					}
				}
			}

			let slug = undefined;
			if (validated.name && validated.name !== existing.name) {
				slug = await this.generateUniqueSlug(validated.name, id);
			}

			// Handle Image
			let imagePath = validated.image; // If string url passed
			if (files && files.length > 0) {
				const file = files[0];
				const subdir = `categories`;
				imagePath = await FileUploadService.saveFile(file, subdir);
			}

			await existing.update({
				name: validated.name ?? existing.name,
				slug: slug,
				image: imagePath ?? existing.image,
				description: validated.description !== undefined ? validated.description : existing.description,
				parent_id: validated.parentId !== undefined ? validated.parentId : existing.parent_id,
				is_controlled: validated.isControlled !== undefined ? validated.isControlled : existing.is_controlled,
			});

			return this.sendSuccess(existing, 'Category updated');
		} catch (error) {
			if (error instanceof z.ZodError) {
				return this.sendError('Validation Error', 400, error.issues);
			}
			return this.sendError('Internal Server Error', 500, [], error);
		}
	}

	/**
	 * DELETE /api/v1/categories/:id
	 * Delete category (Admin only)
	 * Cannot delete if has children or products
	 */
	async delete(req: NextRequest, { params }: { params: { id: string } }) {
		try {
			const { user, error } = await this.verifyAdmin(req);
			if (error) return error;

			const id = parseInt(params.id);
			if (isNaN(id)) {
				return this.sendError('Invalid category ID', 400);
			}

			const existing = await Category.findByPk(id);
			if (!existing) {
				return this.sendError('Category not found', 404);
			}

			// Check if category has children
			const children = await Category.findAll({ where: { parent_id: id } });
			if (children.length > 0) {
				return this.sendError(
					'Cannot delete category - it has subcategories. Delete subcategories first.',
					400
				);
			}

			// Check if category has products (via any of the three category fields)
			const productCount = await Product.count({
				where: {
					[Op.or]: [
						{ main_category_id: id },
						{ category_id: id },
						{ sub_category_id: id }
					]
				}
			});
			if (productCount > 0) {
				return this.sendError(
					`Cannot delete category - it has ${productCount} associated product(s). Move or delete products first.`,
					400
				);
			}

			await existing.destroy();
			return this.sendSuccess(null, 'Category deleted');
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * PATCH /api/v1/categories/:id
	 * Toggle category active status (Admin only)
	 */
	async toggleActive(req: NextRequest, { params }: { params: { id: string } }) {
		try {
			const { user, error } = await this.verifyAdmin(req);
			if (error) return error;

			const id = parseInt(params.id);
			if (isNaN(id)) {
				return this.sendError('Invalid category ID', 400);
			}

			const category = await Category.findByPk(id);
			if (!category) {
				return this.sendError('Category not found', 404);
			}

			// Read the desired state from the request body
			let body: any = {};
			try { body = await req.json(); } catch (e) { /* empty body */ }

			// If is_active is provided in body, use it; otherwise toggle
			const newStatus = typeof body.is_active === 'boolean'
				? body.is_active
				: !(category.is_active !== false);

			await category.update({ is_active: newStatus });

			const message = newStatus
				? 'Category activated successfully'
				: 'Category deactivated. It and any subcategories/products under it will be hidden from the public storefront.';

			return this.sendSuccess(category, message);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}
}
