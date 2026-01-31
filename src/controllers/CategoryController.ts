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
	 * Helper: Check if controlled categories should be filtered
	 */
	private async shouldFilterControlled(req: NextRequest): Promise<boolean> {
		const { searchParams } = new URL(req.url);
		if (searchParams.get('filter_controlled') !== 'true') return false;

		const authHeader = req.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token => Filter
			return true;
		}

		try {
			const token = authHeader.split(' ')[1];
			const decoded: any = verifyAccessToken(token);
            // Need to fetch user with profile to check onboarding_status
			const user = await User.findByPk(decoded.userId || decoded.sub, { include: ['profile'] });

			if (!user) return true; // User not found => Filter

            // Allow Admins and Vendors to see everything (User instruction: vendors access everything)
            if (['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
                return false; // Do NOT filter
            }
            
            // Check onboarding status for Customers or others
            const profile: any = user.profile; 
            if (profile && profile.onboarding_status === 'approved_controlled') {
                return false; // Approved => Do NOT filter
            }

            return true; // Not approved => Filter

		} catch (e) {
			return true; // Invalid token => Filter
		}
	}

	/**
	 * GET /api/v1/categories
	 * List all categories
	 */
	async list(req: NextRequest) {
		try {
            const filterControlled = await this.shouldFilterControlled(req);
            const whereClause: any = {};
            
            if (filterControlled) {
                // exclude controlled categories
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
                        attributes: ['id', 'is_controlled', 'parent_id'] 
                    }
                ]
			});

			// Get product counts based on category level:
			// Level 0 (Main Category, parent_id = null): products.main_category_id
			// Level 1 (Category, parent is main): products.category_id  
			// Level 2 (Subcategory, parent is category): products.sub_category_id

			// Count by main_category_id (for Level 0 categories)
			const mainCounts = await Product.findAll({
				attributes: [
					'main_category_id',
					[Product.sequelize!.fn('COUNT', Product.sequelize!.col('id')), 'count']
				],
				where: { main_category_id: { [Op.not]: null } },
				group: ['main_category_id'],
				raw: true
			}) as unknown as { main_category_id: number; count: string }[];

			const mainCountMap = new Map<number, number>();
			mainCounts.forEach((pc: any) => {
				mainCountMap.set(pc.main_category_id, parseInt(pc.count) || 0);
			});

			// Count by category_id (for Level 1 categories)
			const catCounts = await Product.findAll({
				attributes: [
					'category_id',
					[Product.sequelize!.fn('COUNT', Product.sequelize!.col('id')), 'count']
				],
				where: { category_id: { [Op.not]: null } },
				group: ['category_id'],
				raw: true
			}) as unknown as { category_id: number; count: string }[];

			const catCountMap = new Map<number, number>();
			catCounts.forEach((pc: any) => {
				catCountMap.set(pc.category_id, parseInt(pc.count) || 0);
			});

			// Count by sub_category_id (for Level 2 categories)
			const subCounts = await Product.findAll({
				attributes: [
					'sub_category_id',
					[Product.sequelize!.fn('COUNT', Product.sequelize!.col('id')), 'count']
				],
				where: { sub_category_id: { [Op.not]: null } },
				group: ['sub_category_id'],
				raw: true
			}) as unknown as { sub_category_id: number; count: string }[];

			const subCountMap = new Map<number, number>();
			subCounts.forEach((pc: any) => {
				subCountMap.set(pc.sub_category_id, parseInt(pc.count) || 0);
			});

			// Add product_count to each category based on its level
			const categoriesWithCount = categories.map((cat: any) => {
				const catJson = cat.toJSON ? cat.toJSON() : { ...cat };
				
				// Determine category level based on parent_id
				// Level 0: no parent_id (Main Category)
				// Level 1: has parent_id but parent has no parent (Category)
				// Level 2: parent has parent_id (Subcategory)
				if (!catJson.parent_id) {
					// Level 0 - Main Category
					catJson.product_count = mainCountMap.get(catJson.id) || 0;
				} else if (catJson.parent && !catJson.parent.parent_id) {
					// Level 1 - Category (parent is main category)
					catJson.product_count = catCountMap.get(catJson.id) || 0;
				} else {
					// Level 2 - Subcategory
					catJson.product_count = subCountMap.get(catJson.id) || 0;
				}
				
				return catJson;
			});

            if (filterControlled) {
                // Filter in memory for parent/grandparent control status
                const filtered = categoriesWithCount.filter((cat: any) => {
                    if (cat.is_controlled) return false;
                    if (cat.parent && cat.parent.is_controlled) return false;
                    return true;
                });
                return this.sendSuccess(filtered);
            }

			return this.sendSuccess(categoriesWithCount);
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
            const whereClause: any = { parent_id: null };

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

            if (filterControlled) {
                // Check if Parent is Controlled. If so, return empty.
                const parent = await Category.findByPk(parentId);
                if (parent && parent.is_controlled) {
                    return this.sendSuccess([]);
                }
            }

            const whereClause: any = { parent_id: parentId };
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
            if (filterControlled) {
                whereClause.is_controlled = { [Op.not]: true };
                // Search might return children of controlled parents.
                // We should probably include parent to check.
            }

			const categories = await Category.findAll({
				where: whereClause,
				order: [['name', 'ASC']],
                include: filterControlled ? [{ model: Category, as: 'parent' }] : undefined
			});

            if (filterControlled) {
                const filtered = categories.filter((cat: any) => {
                     if (cat.is_controlled) return false;
                     if (cat.parent && cat.parent.is_controlled) return false;
                     return true;
                });
                return this.sendSuccess(filtered);
            }

			return this.sendSuccess(categories);
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
            if (filterControlled) {
                // If category is controlled, or parent is controlled
                if (category.is_controlled) return this.sendError('Category not found', 404); // Hide it
                if (category.parent && category.parent.is_controlled) return this.sendError('Category not found', 404);
                
                // Also, filter children in the response?
                if (category.children && category.children.length > 0) {
                    category.children = category.children.filter((child: any) => !child.is_controlled);
                }
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
                
                if (filterControlled && category.is_controlled) {
                    hidden = true;
                    // Dont break immediately if we want to check ancestors, 
                    // but if any node in path is controlled, the whole path to target is compromised?
                    // Actually, if a user can't see a parent, they shouldn't see the child.
                    // So if we find a controlled node, the request for 'id' should fail.
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
}
