import { NextRequest } from 'next/server';
import { getFileUrl } from '../utils/fileUrl';
import { BaseController } from './BaseController';
import { Product, ProductMedia, Category, ProductPricingTier, ProductStatus, User, UserProfile, ProductSpecification, RefProductBrand, PlatformSetting } from '../models';
import { applyCommission } from '../utils/priceHelper';
import { Op, fn, col, literal } from 'sequelize';
import { z } from 'zod';
import { verifyAccessToken } from '../utils/jwt';
import { parse } from 'csv-parse/sync';
// import * as ExcelJS from 'exceljs';
import { PermissionService } from '../services/PermissionService';
import { FileUploadService } from '../services/FileUploadService';
import { FileDeleteService } from '../services/FileDeleteService';
import { sequelize } from '../config/database';

// Mock schema for create - expand later
const pricingTierSchema = z.object({
    min_quantity: z.coerce.number().int().nonnegative(),
    max_quantity: z.coerce.number().int().positive().optional().nullable(),
    price: z.coerce.number().nonnegative(),
});

// Mock schema for create - expand later
// Schema for create product (Handles both JSON and Multipart)
const createProductSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    category_id: z.coerce.number().optional(),
    main_category_id: z.coerce.number().optional().nullable(),
    sub_category_id: z.coerce.number().optional().nullable(),
    sku: z.string().optional(),
    base_price: z.coerce.number().optional(),
    currency: z.string().optional(),
    vendor_id: z.string().uuid().optional().nullable(),
    pricing_tiers: z.array(pricingTierSchema).optional(),

    // Specs
    dimension_length: z.coerce.number().optional().nullable(),
    dimension_width: z.coerce.number().optional().nullable(),
    dimension_height: z.coerce.number().optional().nullable(),
    dimension_unit: z.string().optional().nullable(),
    materials: z.array(z.string()).optional().nullable(),
    features: z.array(z.string()).optional().nullable(),
    performance: z.array(z.string()).optional().nullable(),
    technical_description: z.string().optional().nullable(),

    // Variants
    drive_types: z.array(z.string()).optional().nullable(),
    // sizes: z.array(z.string()).optional().nullable(), // REMOVED
    thickness: z.array(z.string()).optional().nullable(),
    colors: z.array(z.string()).optional().nullable(),
    weight_value: z.coerce.number().optional().nullable(),
    weight_unit: z.string().optional().nullable(),

    // Packing
    packing_length: z.coerce.number().optional().nullable(),
    packing_width: z.coerce.number().optional().nullable(),
    packing_height: z.coerce.number().optional().nullable(),
    packing_dimension_unit: z.string().optional().nullable(),
    packing_weight: z.coerce.number().optional().nullable(),
    packing_weight_unit: z.string().optional().nullable(),
    min_order_quantity: z.string().optional().nullable(),

    // Pricing & Stock
    pricing_terms: z.array(z.string()).optional().nullable(),
    production_lead_time: z.coerce.number().optional().nullable(),
    ready_stock_available: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional().nullable(),
    stock: z.coerce.number().optional().nullable(),

    // Compliance
    manufacturing_source: z.string().optional().nullable(),
    manufacturing_source_name: z.string().optional().nullable(),
    requires_export_license: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional().nullable(),
    has_warranty: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional().nullable(),
    warranty_duration: z.coerce.number().optional().nullable(),
    warranty_duration_unit: z.string().optional().nullable(),
    warranty_terms: z.string().optional().nullable(),
    compliance_confirmed: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional().nullable(),
    supplier_signature: z.string().optional().nullable(),
    submission_date: z.string().optional().nullable().transform(val => val ? new Date(val) : null), // Handle Date string

    // Legacy/Computed
    price: z.coerce.number().optional().nullable(),
    original_price: z.coerce.number().optional().nullable(),
    brand_id: z.coerce.number().optional().nullable(),
    model: z.string().optional().nullable(),
    year: z.coerce.number().optional().nullable(),
    specifications: z.string().optional().nullable(),
    vehicle_fitment: z.string().optional().nullable(),
    warranty: z.string().optional().nullable(),
    action_type: z.string().optional().nullable(),

    // Additional
    certifications: z.array(z.string()).optional().nullable(),
    country_of_origin: z.string().optional().nullable(),
    controlled_item_type: z.string().optional().nullable(),
    vehicle_compatibility: z.string().optional().nullable(),
    is_featured: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
    is_top_selling: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional(),
    status: z.enum(['draft', 'published', 'inactive', 'out_of_stock', 'pending_review', 'approved', 'rejected', 'suspended']).optional(),
    individual_product_pricing: z.array(z.object({
        name: z.string(),
        amount: z.coerce.number()
    })).optional().nullable(),
});

export class ProductController extends BaseController {

    /**
     * Helper: Get user from request (Soft Auth)
     */
    /**
     * Helper: Get user from request (Soft Auth)
     */
    private async getUserFromRequest(req: NextRequest): Promise<any | null> {
        try {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;
            if (!userId) return null;
            return await User.findByPk(userId);
        } catch (e) {
            return null;
        }
    }

    /**
     * Helper: Format Product (Transform Sequelize Instance to JSON and attach Media URLs)
     * Decoupled from Access Control
     */
    private async formatProduct(data: any | any[], discountPercent: number = 0) {
        const fmt = async (item: any) => {
            if (!item) return null;
            // Ensure we have a POJO
            let p = item;

            // If item is a Sequelize model, convert to JSON
            if (item.toJSON && typeof item.toJSON === 'function') {
                p = item.toJSON();
            } else {
                p = { ...item };
            }

            // --- Media Flattening Logic ---
            // Default Empty
            p.gallery = [];
            p.image = null;

            // Check media on both the POJO (p) and original item (item)
            const mediaList = p.media || item.media;

            if (mediaList && Array.isArray(mediaList) && mediaList.length > 0) {
                // Filter out nulls/undefineds and get clean URLs
                const validUrls = mediaList.map((m: any) => {
                    const url = m.url || (m.getDataValue ? m.getDataValue('url') : null);
                    return getFileUrl(url);
                }).filter((u: any) => u !== null && u !== '') as string[];

                p.gallery = validUrls;

                // Set cover image
                const coverMedia = mediaList.find((m: any) => m.is_cover);
                if (coverMedia) {
                    const url = coverMedia.url || (coverMedia.getDataValue ? coverMedia.getDataValue('url') : null);
                    p.image = getFileUrl(url);
                } else if (validUrls.length > 0) {
                    p.image = validUrls[0];
                }
            }

            // Fallback: If p.image is still null, try p.image field if it exists (legacy)
            if (!p.image && item.image) {
                p.image = getFileUrl(item.image);
            }

            // --- JSON Parsing for Array Fields stored as Text ---
            const arrayFields = ['vehicle_fitment', 'specifications', 'features', 'materials', 'performance', 'drive_types', 'thickness', 'colors', 'pricing_terms', 'individual_product_pricing', 'certifications'];

            arrayFields.forEach(field => {
                if (typeof p[field] === 'string') {
                    try {
                        // Check if it looks like a JSON array
                        if (p[field].trim().startsWith('[')) {
                            p[field] = JSON.parse(p[field]);
                        }
                    } catch (e) {
                        // If parse fails, leave as string or split by comma?
                        // Legacy fallback: if it contains commas but not brackets, split it
                        if (p[field].includes(',') && !p[field].includes('[')) {
                            p[field] = p[field].split(',').map((s: string) => s.trim());
                        }
                    }
                }
            });

            // Ensure price is backfilled from base_price for legacy frontend components

            if (p.base_price !== undefined && p.base_price !== null) {
                p.price = p.base_price; // Prefer base_price
            } else if (p.price) {
                p.base_price = p.price; // or vice-versa
            }

            // --- is_controlled Logic ---
            const mainCat = p.main_category || item.main_category;
            const cat = p.category || item.category;
            const subCat = p.sub_category || item.sub_category;

            p.is_controlled = (
                (mainCat?.is_controlled === true) ||
                (cat?.is_controlled === true) ||
                (subCat?.is_controlled === true)
            );

            // Apply Commission Calculation (Inflates price and removes commission field)
            p = await applyCommission(p, discountPercent);

            return p;
        };

        if (Array.isArray(data)) {
            const results = await Promise.all(data.map(d => fmt(d)));
            return results.filter(d => d !== null);
        }
        return await fmt(data);
    }

    /**
     * Helper: Mask product prices if user is not logged in
     */
    private maskProducts(data: any | any[], user: any | null) {

        if (user) {
            return data; // No masking
        }

        const mask = (item: any) => {
            if (!item) return item;
            let p = { ...item }; // Shallow clone

            // Mask price fields with -1
            p.base_price = -1;
            p.price = -1;

            if (p.pricing_tiers) {
                p.pricing_tiers = p.pricing_tiers.map((t: any) => ({
                    ...t,
                    price: -1,
                    min_quantity: t.min_quantity
                }));
            }
            return p;
        };

        if (Array.isArray(data)) {
            return data.map(d => mask(d));
        }
        return mask(data);
    }

    /**
     * Helper: Get All Descendant Category IDs (Recursive)
     */
    /**
     * Helper: Get All Descendant Category IDs (Recursive CTE)
     */
    private async getAllCategoryDescendants(rootId: number): Promise<number[]> {
        // Safe recursive query using CTE
        const query = `
            WITH RECURSIVE category_tree AS (
                SELECT id, parent_id
                FROM categories
                WHERE id = :rootId
                UNION ALL
                SELECT c.id, c.parent_id
                FROM categories c
                INNER JOIN category_tree ct ON c.parent_id = ct.id
            )
            SELECT id FROM category_tree;
        `;

        try {
            const results: any[] = await sequelize.query(query, {
                replacements: { rootId },
                type: (sequelize as any).QueryTypes.SELECT,
                raw: true
            });

            return results.map(r => r.id);
        } catch (error) {
            console.error('Error fetching category descendants via CTE:', error);
            // Fallback to just the root ID if something explodes, though unlikely
            return [rootId];
        }
    }

    /**
     * list
     * GET /api/v1/products
     * Filtering, Pagination, Sorting
     */
    async list(req: NextRequest) {
        try {
            const user = await this.getUserFromRequest(req);
            const { searchParams } = new URL(req.url);

            // Pagination
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            // 2. Sorting
            // Options: 'newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'year_asc', 'year_desc'
            const sortParam = searchParams.get('sort') || 'newest';
            let order: any = [['created_at', 'DESC']]; // Default

            switch (sortParam) {
                case 'price_asc': order = [['base_price', 'ASC']]; break;
                case 'price_desc': order = [['base_price', 'DESC']]; break;
                case 'name_asc': order = [['name', 'ASC']]; break;
                case 'name_desc': order = [['name', 'DESC']]; break;
                case 'year_asc': order = [['year', 'ASC']]; break;
                case 'year_desc': order = [['year', 'DESC']]; break;
                case 'newest': order = [['created_at', 'DESC']]; break;
            }

            // 3. Base Filters
            const whereClause: any = {};

            const isAdmin = user && ['admin', 'super_admin'].includes(user.user_type);

            if (isAdmin) {
                // Admin Constraints

                // 1. Author Status (Draft, Active, etc.)
                const statusParam = searchParams.get('status');
                if (statusParam && statusParam !== 'all') {
                    whereClause.status = statusParam;
                }

                // 2. Approval Status (Pending, Approved, Rejected)
                const approvalStatusParam = searchParams.get('approval_status');
                if (approvalStatusParam && approvalStatusParam !== 'all') {
                    whereClause.approval_status = approvalStatusParam;
                }

                // 3. Scope Filtering
                const scope = searchParams.get('scope');
                if (scope === 'vendor') {
                    whereClause.vendor_id = { [Op.ne]: null };
                } else if (scope === 'admin') {
                    whereClause.vendor_id = null;
                } else {
                    // Default to Admin products only (if scope is 'all' or undefined)
                }
            } else {
                // Public / Restricted View
                const isVendor = user && user.user_type === 'vendor';

                if (isVendor) {
                    // Vendor sees their own, all statuses usually?
                    // If status param provided, use it.
                    const statusParam = searchParams.get('status');
                    if (statusParam && statusParam !== 'all') {
                        whereClause.status = statusParam;
                    }
                    // No default status filter for vendor, so they see drafts.
                } else {
                    // Public Guest: show published + out_of_stock
                    whereClause.status = { [Op.in]: [ProductStatus.PUBLISHED, ProductStatus.OUT_OF_STOCK] };
                    whereClause.approval_status = 'approved';
                }
            }

            // 4. Advanced Search (Text)
            const searchQuery = searchParams.get('search') || searchParams.get('q');
            if (searchQuery) {
                const searchLower = `%${searchQuery.toLowerCase()}%`;

                // Pre-query: Find product IDs matching in specifications
                const specMatches = await ProductSpecification.findAll({
                    where: {
                        [Op.or]: [
                            { label: { [Op.iLike]: searchLower } },
                            { value: { [Op.iLike]: searchLower } }
                        ]
                    },
                    attributes: ['product_id'],
                    group: ['product_id'],
                    raw: true
                }) as any[];
                const specProductIds = specMatches.map((s: any) => s.product_id);

                whereClause[Op.or] = [
                    { name: { [Op.iLike]: searchLower } },
                    { sku: { [Op.iLike]: searchLower } },
                    { description: { [Op.iLike]: searchLower } },
                    { technical_description: { [Op.iLike]: searchLower } },
                    // Include products that matched via specifications
                    ...(specProductIds.length > 0 ? [{ id: { [Op.in]: specProductIds } }] : [])
                ];
            }

            // 5. Exact/Checkbox Filters (Arrays allowed)
            const handleArrayFilter = (paramName: string, dbCol: string, isArrayCol: boolean = false) => {
                const val = searchParams.get(paramName);
                if (val) {
                    const values = val.split(',').map(v => v.trim());
                    if (values.length > 0) {
                        if (isArrayCol) {
                            // Postgres Array Overlap
                            whereClause[dbCol] = { [Op.overlap]: values };
                        } else {
                            // String IN clause
                            whereClause[dbCol] = { [Op.in]: values };
                        }
                    }
                }
            };

            handleArrayFilter('condition', 'condition');
            handleArrayFilter('country_of_origin', 'country_of_origin');
            if (searchParams.get('brand_id')) {
                const brands = searchParams.get('brand_id')!.split(',').map(s => parseInt(s)).filter(n => !isNaN(n));
                if (brands.length > 0) whereClause.brand_id = { [Op.in]: brands };
            }

            // Array Columns
            handleArrayFilter('drive_types', 'drive_types', true);
            handleArrayFilter('colors', 'colors', true);
            // handleArrayFilter('sizes', 'sizes', true); // REMOVED sizes filter

            // Category Filter (Recursive)
            const categoryId = searchParams.get('category_id');
            if (categoryId) {
                const catIdNum = parseInt(categoryId);
                if (!isNaN(catIdNum)) {
                    // Fetch all descendants
                    const allCategoryIds = await this.getAllCategoryDescendants(catIdNum);

                    // Logic: Product belongs to this category hierarchy if:
                    // 1. product.category_id IN [ids]
                    // 2. product.main_category_id IN [ids]
                    // 3. product.sub_category_id IN [ids]

                    const categoryCondition = {
                        [Op.or]: [
                            { category_id: { [Op.in]: allCategoryIds } },
                            { main_category_id: { [Op.in]: allCategoryIds } },
                            { sub_category_id: { [Op.in]: allCategoryIds } }
                        ]
                    };

                    // Handle potential collision with Search [Op.or] logic above
                    if (whereClause[Op.or]) {
                        // If Search already exists, we must AND them: (Search ORs) AND (Category ORs)
                        if (!whereClause[Op.and]) {
                            whereClause[Op.and] = [];
                        }

                        // Move existing search ORs into AND array
                        whereClause[Op.and].push({ [Op.or]: whereClause[Op.or] });

                        // Add Category ORs to AND array
                        whereClause[Op.and].push(categoryCondition);

                        // Remove top-level Op.or to clearly switch to AND mode
                        delete whereClause[Op.or];

                    } else {
                        // No collision, just assign
                        Object.assign(whereClause, categoryCondition);
                    }
                }
            }

            const mainCatId = searchParams.get('main_category_id');
            if (mainCatId) whereClause.main_category_id = mainCatId;

            const subCatId = searchParams.get('sub_category_id');
            if (subCatId) whereClause.sub_category_id = subCatId;

            // Filter out products under inactive categories (non-admin only)
            if (!isAdmin) {
                const inactiveCats = await Category.findAll({
                    where: { is_active: false },
                    attributes: ['id'],
                    raw: true
                }) as any[];

                if (inactiveCats.length > 0) {
                    const inactiveIds = inactiveCats.map((c: any) => c.id);
                    // Also get all descendants of inactive categories
                    const allInactiveIds = new Set<number>(inactiveIds);
                    let currentLevelIds = inactiveIds;
                    while (currentLevelIds.length > 0) {
                        const children = await Category.findAll({
                            where: { parent_id: { [Op.in]: currentLevelIds } },
                            attributes: ['id'],
                            raw: true
                        }) as any[];
                        const childIds = children.map((c: any) => c.id).filter((id: number) => !allInactiveIds.has(id));
                        if (childIds.length === 0) break;
                        childIds.forEach((id: number) => allInactiveIds.add(id));
                        currentLevelIds = childIds;
                    }

                    const excludeIds = Array.from(allInactiveIds);
                    const inactiveFilter = {
                        [Op.and]: [
                            { main_category_id: { [Op.or]: [{ [Op.notIn]: excludeIds }, { [Op.is]: null }] } },
                            { category_id: { [Op.or]: [{ [Op.notIn]: excludeIds }, { [Op.is]: null }] } },
                            { sub_category_id: { [Op.or]: [{ [Op.notIn]: excludeIds }, { [Op.is]: null }] } }
                        ]
                    };

                    if (!whereClause[Op.and]) {
                        whereClause[Op.and] = [];
                    }
                    whereClause[Op.and].push(inactiveFilter);
                }
            }

            // Vendor Filter (Admin Only)
            const vendorId = searchParams.get('vendor_id');
            if (vendorId && user && ['admin', 'super_admin'].includes(user.user_type)) {
                whereClause.vendor_id = vendorId;
            }

            // 6. Range Filters
            // Price
            const minPrice = searchParams.get('min_price');
            const maxPrice = searchParams.get('max_price');
            if (minPrice || maxPrice) {
                whereClause.base_price = {};
                if (minPrice) whereClause.base_price[Op.gte] = parseFloat(minPrice);
                if (maxPrice) whereClause.base_price[Op.lte] = parseFloat(maxPrice);
            }

            // Year
            const minYear = searchParams.get('year_min');
            const maxYear = searchParams.get('year_max');
            if (minYear || maxYear) {
                whereClause.year = {};
                if (minYear) whereClause.year[Op.gte] = parseInt(minYear);
                if (maxYear) whereClause.year[Op.lte] = parseInt(maxYear);
            }

            // 7. Dimension Filters (Physical Dimensions in CM)
            // Inputs: length_min, length_max, width_min, width_max, height_min, height_max
            // Logic: Convert stored value (based on dimension_unit) to CM and compare.

            const dimParams = [
                { param: 'length', col: 'dimension_length', unitCol: 'dimension_unit' },
                { param: 'width', col: 'dimension_width', unitCol: 'dimension_unit' },
                { param: 'height', col: 'dimension_height', unitCol: 'dimension_unit' }
            ];

            dimParams.forEach(dim => {
                const minVal = parseFloat(searchParams.get(`${dim.param}_min`) || '');
                const maxVal = parseFloat(searchParams.get(`${dim.param}_max`) || '');

                if (!isNaN(minVal) || !isNaN(maxVal)) {
                    // SQL to convert stored value to CM
                    // CASE dimension_unit WHEN 'mm' THEN val/10 WHEN 'm' THEN val*100 WHEN 'in' THEN val*2.54 ...
                    // REMOVED "Product". prefix to avoid "missing FROM-clause entry" error
                    const valueInCm = literal(`
                        (
                            CASE "${dim.unitCol}"
                                WHEN 'mm' THEN "${dim.col}" / 10.0
                                WHEN 'm' THEN "${dim.col}" * 100.0
                                WHEN 'in' THEN "${dim.col}" * 2.54
                                WHEN 'ft' THEN "${dim.col}" * 30.48
                                ELSE "${dim.col}"
                            END
                        )
                    `);

                    if (!isNaN(minVal)) {
                        whereClause[Op.and] = [
                            ...(whereClause[Op.and] || []),
                            literal(`${valueInCm.val} >= ${minVal}`)
                        ];
                    }
                    if (!isNaN(maxVal)) {
                        whereClause[Op.and] = [
                            ...(whereClause[Op.and] || []),
                            literal(`${valueInCm.val} <= ${maxVal}`)
                        ];
                    }
                }
            });

            const { count, rows } = await Product.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order,
                include: [
                    {
                        model: User,
                        as: 'vendor',
                        include: [{ model: UserProfile, as: 'profile', attributes: ['onboarding_status'] }]
                    },
                    {
                        model: ProductMedia,
                        as: 'media',
                        where: { is_cover: true },
                        required: false
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'is_controlled']
                    },
                    {
                        model: Category,
                        as: 'main_category',
                        attributes: ['id', 'name', 'is_controlled']
                    },
                    {
                        model: Category,
                        as: 'sub_category',
                        attributes: ['id', 'name', 'is_controlled']
                    },
                    {
                        model: RefProductBrand,
                        as: 'brand',
                        attributes: ['id', 'name', 'icon']
                    }
                ],
                distinct: true // Important for correct count with includes
            });

            // Filters Generation
            const needFilters = searchParams.get('need_filters') === 'true';
            let filters = {};
            if (needFilters) {
                filters = await this.generateFilters(whereClause);
            }

            // Format first (JSON + Media) -> Then Mask
            const userProfile = user?.profile || (user ? await UserProfile.findOne({ where: { user_id: user.id } }) : null);
            const discount = userProfile?.discount || 0;

            const formattedRows = await this.formatProduct(rows, discount);
            const maskedRows = this.maskProducts(formattedRows, user);

            return this.sendSuccess(maskedRows, 'Success', 200, {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit),
                filters,
                placeholder_image: getFileUrl('/placeholder.svg')
            }, req);

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * Helper: Generate dynamic filters based on current query
     */
    private async generateFilters(whereClause: any) {
        const filters: any = {};

        // 1. Price Range
        try {
            const priceStats = await Product.findOne({
                where: whereClause,
                attributes: [
                    [fn('MIN', col('base_price')), 'min_price'],
                    [fn('MAX', col('base_price')), 'max_price']
                ],
                raw: true
            }) as any;
            filters.price = {
                min: priceStats?.min_price || 0,
                max: priceStats?.max_price || 0
            };
        } catch (e) {
            console.error('Filter Generation Error (Price):', e);
            filters.price = { min: 0, max: 0 };
        }

        // 2. Categories (Product Type)
        // Aggregating counts from main_category, category, and sub_category columns
        try {
            const catCounts = new Map<number, number>();

            // Helper to aggregate counts
            const aggregate = async (field: string) => {
                const counts = await Product.findAll({
                    where: { ...whereClause, [field]: { [Op.ne]: null } },
                    attributes: [
                        [field, 'id'],
                        [fn('COUNT', literal('*')), 'count']
                    ],
                    group: [field],
                    raw: true
                }) as any[];

                counts.forEach(c => {
                    const id = c.id;
                    const count = parseInt(c.count) || 0;
                    catCounts.set(id, (catCounts.get(id) || 0) + count);
                });
            };

            await Promise.all([
                aggregate('main_category_id'),
                aggregate('category_id'),
                aggregate('sub_category_id')
            ]);

            if (catCounts.size > 0) {
                const categoryIds = Array.from(catCounts.keys());
                const categories = await Category.findAll({
                    where: { id: { [Op.in]: categoryIds } },
                    attributes: ['id', 'name'],
                    raw: true
                });

                filters.categories = categories.map(c => ({
                    id: c.id,
                    name: c.name,
                    count: catCounts.get(c.id) || 0
                })).sort((a, b) => a.name.localeCompare(b.name));
            } else {
                filters.categories = [];
            }
        } catch (e) {
            console.error('Filter Generation Error (Categories):', e);
            filters.categories = [];
        }

        // 3. Brands (RefProductBrand)
        try {
            const brands = await Product.findAll({
                attributes: [
                    [fn('COUNT', literal('*')), 'count']
                ],
                include: [{
                    model: RefProductBrand,
                    as: 'brand',
                    attributes: ['id', 'name'],
                    required: true
                }],
                group: ['brand.id', 'brand.name'],
                where: whereClause,
                raw: true
            }) as any[];

            filters.brands = brands.map(b => ({
                id: b['brand.id'],
                name: b['brand.name'],
                count: parseInt(b.count)
            }));
        } catch (e) {
            console.error('Filter Generation Error (Brands):', e);
            filters.brands = [];
        }

        // 4. Conditions (DISABLED)
        filters.conditions = [];
        if (false) {
            try {
                const conditions = await Product.findAll({
                    attributes: [
                        'condition',
                        [fn('COUNT', col('id')), 'count']
                    ],
                    group: ['condition'],
                    where: {
                        ...whereClause,
                        condition: { [Op.ne]: null }
                    },
                    raw: true
                }) as any[];
                filters.conditions = conditions.map(c => ({
                    name: c.condition ? c.condition.charAt(0).toUpperCase() + c.condition.slice(1) : '',
                    count: parseInt(c.count)
                }));
            } catch (e) {
                console.error('Filter Generation Error (Conditions):', e);
                filters.conditions = [];
            }
        }

        // 5. Country of Origin (DISABLED)
        filters.countries = [];
        if (false) {
            try {
                const countries = await Product.findAll({
                    attributes: [
                        'country_of_origin',
                        [fn('COUNT', col('id')), 'count']
                    ],
                    group: ['country_of_origin'],
                    where: {
                        ...whereClause,
                        country_of_origin: { [Op.ne]: null }
                    },
                    raw: true
                }) as any[];
                filters.countries = countries.map(c => ({
                    name: c.country_of_origin,
                    count: parseInt(c.count)
                }));
            } catch (e) {
                console.error('Filter Generation Error (Countries):', e);
                filters.countries = [];
            }
        }

        // 6. Array Fields Helper (Contextual Counts) (DISABLED)
        filters.drive_types = [];
        filters.colors = [];
        if (false) {
            const getArrayCounts = async (field: string) => {
                try {
                    const counts = await Product.findAll({
                        attributes: [
                            [literal(`unnest("${field}")`), 'value'],
                            [fn('COUNT', col('id')), 'count']
                        ],
                        where: {
                            ...whereClause,
                            [field]: { [Op.ne]: null }
                        },
                        group: [literal(`unnest("${field}")`) as any],
                        raw: true
                    }) as any[];
                    return counts.map(c => ({ name: c.value, count: parseInt(c.count) }));
                } catch (e) {
                    console.error(`Filter Generation Error (ArrayField: ${field}):`, e);
                    return [];
                }
            };

            filters.drive_types = await getArrayCounts('drive_types');

            // COLORS: From View (Global Options) intersected with Contextual Counts
            try {
                const validColorRows = await Product.sequelize?.query(
                    `SELECT color FROM ref_product_color_view ORDER BY color ASC`,
                    { type: (Product.sequelize as any).QueryTypes.SELECT }
                ) as any[];

                const colorCounts = await getArrayCounts('colors');
                const colorMap = new Map(colorCounts.map(c => [c.name, c.count]));

                filters.colors = validColorRows ? validColorRows.map(c => ({
                    name: c.color,
                    count: colorMap.get(c.color) || 0
                })) : [];
            } catch (e) {
                console.error('Filter Generation Error (Colors):', e);
                filters.colors = [];
            }
        }

        // Calculate Global Min/Max for L, W, H in CM
        try {
            const dimStats = await Product.findOne({
                where: whereClause,
                attributes: [
                    // Length
                    [literal(`MIN(CASE dimension_unit WHEN 'mm' THEN dimension_length / 10.0 WHEN 'm' THEN dimension_length * 100.0 WHEN 'in' THEN dimension_length * 2.54 WHEN 'ft' THEN dimension_length * 30.48 ELSE dimension_length END)`), 'min_length'],
                    [literal(`MAX(CASE dimension_unit WHEN 'mm' THEN dimension_length / 10.0 WHEN 'm' THEN dimension_length * 100.0 WHEN 'in' THEN dimension_length * 2.54 WHEN 'ft' THEN dimension_length * 30.48 ELSE dimension_length END)`), 'max_length'],
                    // Width
                    [literal(`MIN(CASE dimension_unit WHEN 'mm' THEN dimension_width / 10.0 WHEN 'm' THEN dimension_width * 100.0 WHEN 'in' THEN dimension_width * 2.54 WHEN 'ft' THEN dimension_width * 30.48 ELSE dimension_width END)`), 'min_width'],
                    [literal(`MAX(CASE dimension_unit WHEN 'mm' THEN dimension_width / 10.0 WHEN 'm' THEN dimension_width * 100.0 WHEN 'in' THEN dimension_width * 2.54 WHEN 'ft' THEN dimension_width * 30.48 ELSE dimension_width END)`), 'max_width'],
                    // Height
                    [literal(`MIN(CASE dimension_unit WHEN 'mm' THEN dimension_height / 10.0 WHEN 'm' THEN dimension_height * 100.0 WHEN 'in' THEN dimension_height * 2.54 WHEN 'ft' THEN dimension_height * 30.48 ELSE dimension_height END)`), 'min_height'],
                    [literal(`MAX(CASE dimension_unit WHEN 'mm' THEN dimension_height / 10.0 WHEN 'm' THEN dimension_height * 100.0 WHEN 'in' THEN dimension_height * 2.54 WHEN 'ft' THEN dimension_height * 30.48 ELSE dimension_height END)`), 'max_height'],
                ],
                raw: true
            }) as any;

            filters.dimensions = {
                length: { min: Math.floor(dimStats?.min_length || 0), max: Math.ceil(dimStats?.max_length || 0) },
                width: { min: Math.floor(dimStats?.min_width || 0), max: Math.ceil(dimStats?.max_width || 0) },
                height: { min: Math.floor(dimStats?.min_height || 0), max: Math.ceil(dimStats?.max_height || 0) }
            };
        } catch (e) {
            console.error('Filter Generation Error (Dimensions):', e);
            filters.dimensions = { length: { min: 0, max: 0 }, width: { min: 0, max: 0 }, height: { min: 0, max: 0 } };
        }

        return filters;
    }

    /**
     * adminList
     * GET /api/v1/admin/products
     * specialized list for admin/dashboard views
     */
    async adminList(req: NextRequest) {
        try {
            const user = await this.getUserFromRequest(req);
            if (!user) return this.sendError('Unauthorized', 401);

            if (!['admin', 'super_admin', 'vendor'].includes(user.user_type)) {
                return this.sendError('Forbidden', 403);
            }

            // --- Permission & Visibility Logic (Admin Only) ---
            let canViewAll = true;
            let canViewControlled = false;

            if (user.user_type === 'admin') {
                const permissionService = new PermissionService();
                canViewAll = await permissionService.hasPermission(user.id, 'product.view');
                canViewControlled = await permissionService.hasPermission(user.id, 'product.controlled.approve'); // Grants visibility to Controlled

                if (!canViewAll && !canViewControlled) {
                    // If they have NEITHER, they can't see list
                    return this.sendError('Forbidden: Missing product.view or product.controlled.approve', 403);
                }
            }


            const { searchParams } = new URL(req.url);

            // Pagination
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            // Sorting
            const sortField = searchParams.get('sort') || 'created_at';
            const sortOrder = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

            // Filters
            const whereClause: any = {};

            // If Vendor, enforce finding ONLY their products
            if (user.user_type === 'vendor') {
                whereClause.vendor_id = user.id;
            } else {
                // Admin:
                // If vendor_id param provided, filter by it.
                // Else, default to Admin inventory (vendor_id IS NULL).
                // Admin:
                // Handle Scope & Vendor Filtering
                const vendorParam = searchParams.get('vendor_id');
                const scope = searchParams.get('scope');

                if (vendorParam) {
                    whereClause.vendor_id = vendorParam;
                } else if (scope === 'all') {
                    // Show ALL (Admin + All Vendors) -> No filter
                } else if (scope === 'vendor') {
                    // Show Only Vendor Products
                    whereClause.vendor_id = { [Op.ne]: null };
                } else {
                    // Default: Admin Inventory Only
                    whereClause.vendor_id = null;
                }

                if (whereClause.vendor_id) {
                    // Strictly enforce PUBLISHED for vendor products shown to admin
                    whereClause.status = ProductStatus.PUBLISHED;
                } else {
                    // Default Admin Inventory to PUBLISHED if no status provided
                    const statusParam = searchParams.get('status');
                    if (!statusParam || statusParam === 'all') {
                        whereClause.status = ProductStatus.PUBLISHED;
                    }
                }
            }

            if (user.user_type === 'admin') {
                // Visibility Filters
                // If NO View All (General), then MUST be Controlled Only
                if (!canViewAll && canViewControlled) {

                    whereClause[Op.or] = [
                        { '$main_category.is_controlled$': true },
                        { '$category.is_controlled$': true },
                        { '$sub_category.is_controlled$': true }
                    ];
                }

                // Existing Filters...
                const statusParam = searchParams.get('status');
                if (statusParam && statusParam !== 'all') {
                    whereClause.status = statusParam;
                }

                const approvalStatusParam = searchParams.get('approval_status');
                if (approvalStatusParam && approvalStatusParam !== 'all') whereClause.approval_status = approvalStatusParam;

                const vendorId = searchParams.get('vendor_id');
                if (vendorId) whereClause.vendor_id = vendorId;
            } else if (user.user_type === 'vendor') {
                whereClause.vendor_id = user.id;
            }
            // Categories
            const categoryId = searchParams.get('category_id');
            if (categoryId) whereClause.category_id = categoryId;

            const mainCatId = searchParams.get('main_category_id');
            if (mainCatId) whereClause.main_category_id = mainCatId;

            const subCatId = searchParams.get('sub_category_id');
            if (subCatId) whereClause.sub_category_id = subCatId;

            // Range Filters (Price / Year) matches list()
            const minPrice = searchParams.get('min_price');
            const maxPrice = searchParams.get('max_price');
            if (minPrice || maxPrice) {
                whereClause.base_price = {};
                if (minPrice) whereClause.base_price[Op.gte] = parseFloat(minPrice);
                if (maxPrice) whereClause.base_price[Op.lte] = parseFloat(maxPrice);
            }

            const minYear = searchParams.get('year_min');
            const maxYear = searchParams.get('year_max');
            if (minYear || maxYear) {
                whereClause.year = {};
                if (minYear) whereClause.year[Op.gte] = parseInt(minYear);
                if (maxYear) whereClause.year[Op.lte] = parseInt(maxYear);
            }

            // Search
            const search = searchParams.get('search');

            if (search) {
                const searchLower = `%${search.toLowerCase()}%`;
                whereClause[Op.or] = [
                    { name: { [Op.iLike]: searchLower } },
                    { sku: { [Op.iLike]: searchLower } },
                    literal(`EXISTS (
                        SELECT 1 FROM product_specifications ps 
                        WHERE ps.product_id = "Product"."id" 
                        AND (ps.label ILIKE '${searchLower}' OR ps.value ILIKE '${searchLower}')
                    )`)
                ];
            }

            const { count, rows } = await Product.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [[sortField, sortOrder]],
                include: [
                    {
                        model: ProductMedia,
                        as: 'media',
                        where: { is_cover: true },
                        required: false
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['id', 'name', 'is_controlled']
                    },
                    {
                        model: Category,
                        as: 'main_category',
                        attributes: ['id', 'name', 'is_controlled']
                    },
                    {
                        model: Category,
                        as: 'sub_category',
                        attributes: ['id', 'name', 'is_controlled']
                    },
                    {
                        model: User,
                        as: 'vendor',
                        attributes: ['id', 'name', 'email'],
                        include: [{
                            model: UserProfile, // Ensure UserProfile is imported
                            as: 'profile',
                            attributes: ['company_name']
                        }]
                    },
                    {
                        model: RefProductBrand,
                        as: 'brand',
                        attributes: ['id', 'name', 'icon']
                    }
                ],
                distinct: true
            });

            const formattedRows = await this.formatProduct(rows);
            // No masking for admin/vendor own products
            return this.sendSuccess(formattedRows, 'Success', 200, {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit),
                placeholder_image: getFileUrl('/placeholder.svg')
            });

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * create
     * POST /api/v1/products
     */
    async create(req: NextRequest, parsedData?: { data: any, files: File[], coverImage?: File | null }) {
        try {
            // 1. Auth Check
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return this.sendError('Unauthorized', 401);
            }


            let decoded: any;
            try {
                const token = authHeader.split(' ')[1];
                decoded = verifyAccessToken(token);
            } catch (e: any) {
                return this.sendError('Invalid Token', 401);
            }

            const user = await User.findByPk(decoded.userId || decoded.sub);
            if (!user) {
                return this.sendError('User not found', 401);
            }

            // Enforce Onboarding
            const onboardingError = await this.checkOnboarding(user);
            if (onboardingError) return onboardingError;

            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'product.manage');
                if (!hasPerm) return this.sendError('Forbidden: Missing product.manage Permission', 403);
            }

            // Use parsedData if provided (from multipart), otherwise json
            let body = parsedData ? parsedData.data : await req.json();
            const files = parsedData ? parsedData.files : [];

            // Quick fix for pricing_tiers if it came as string (JSON stringified in FormData)
            if (typeof body.pricing_tiers === 'string') {
                try {
                    body.pricing_tiers = JSON.parse(body.pricing_tiers);
                } catch (e) {
                    body.pricing_tiers = [];
                }
            }
            // Quick fix for arrays if they came as string
            ['materials', 'features', 'performance', 'drive_types', 'thickness', 'colors', 'pricing_terms', 'individual_product_pricing', 'individualProductPricing', 'certifications'].forEach(field => {
                if (typeof body[field] === 'string') {
                    try {
                        body[field] = JSON.parse(body[field]);
                    } catch (e) {
                        // if not json, maybe comma separated?
                        if (field !== 'pricing_tiers' && field !== 'individual_product_pricing' && field !== 'individualProductPricing') {
                            body[field] = body[field].split(',').map((s: string) => s.trim());
                        }
                    }
                }
            });

            // Handle CamelCase -> SnakeCase mapping for robustness (FormData sends camelCase from frontend)
            const mapping: any = {
                basePrice: 'base_price',
                minOrderQuantity: 'min_order_quantity',
                productionLeadTime: 'production_lead_time',
                weightValue: 'weight_value',
                warrantyDuration: 'warranty_duration',
                readyStockAvailable: 'ready_stock_available',
                requiresExportLicense: 'requires_export_license',
                hasWarranty: 'has_warranty',
                complianceConfirmed: 'compliance_confirmed',
                manufacturingSource: 'manufacturing_source',
                manufacturingSourceName: 'manufacturing_source_name',
                vehicleFitment: 'vehicle_fitment',
                specifications: 'specifications',
                technicalDescription: 'technical_description',
                controlledItemType: 'controlled_item_type',
                subCategoryId: 'sub_category_id',
                mainCategoryId: 'main_category_id',
                countryOfOrigin: 'country_of_origin',
                vehicleCompatibility: 'vehicle_compatibility',
                isFeatured: 'is_featured',
                isTopSelling: 'is_top_selling',
                individualProductPricing: 'individual_product_pricing',
                individual_product_pricing: 'individual_product_pricing',
                brandId: 'brand_id'
            };

            Object.keys(mapping).forEach(camelKey => {
                if (body[camelKey] !== undefined) {
                    body[mapping[camelKey]] = body[camelKey];
                }
            });


            const validated = createProductSchema.parse(body);

            // Auto-generate SKU if not provided
            if (!validated.sku || validated.sku.trim() === '') {
                // Format: AV-[TIMESTAMP]-[RANDOM]
                const timestamp = Math.floor(Date.now() / 1000);
                const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
                validated.sku = `AV-${timestamp}-${random}`;
            }

            // 2. Determine Vendor Ownership
            let finalVendorId: string | null = null; // Default: Admin-owned (null)

            if (user.user_type === 'vendor') {
                // Vendors MUST own their products
                finalVendorId = user.id;
            } else if (['admin', 'super_admin'].includes(user.user_type)) {
                // Admins can assign to a vendor OR keep it null (admin-owned)
                if (validated.vendor_id) {
                    const targetVendor = await User.findByPk(validated.vendor_id);
                    // Verify the target is actually a vendor
                    if (!targetVendor || targetVendor.user_type !== 'vendor') {
                        return this.sendError('Invalid vendor_id provided', 400);
                    }
                    finalVendorId = validated.vendor_id;
                }
                // If validated.vendor_id is null/undefined, finalVendorId remains null (admin owned)
            } else {
                return this.sendError('Forbidden: Customers cannot create products', 403);
            }

            // Fetch Admin Commission Setting
            let commissionValue = 0;

            if (finalVendorId !== null) {
                try {
                    const setting = await PlatformSetting.findOne({ where: { key: 'admin_commission' } });
                    if (setting && setting.value) {
                        commissionValue = parseInt(setting.value);
                        if (isNaN(commissionValue)) commissionValue = 0;
                    }
                } catch (e) {
                    console.error("Failed to fetch admin_commission", e);
                }
            }

            const product = await Product.create({
                ...validated,
                commission: commissionValue,
                vendor_id: finalVendorId as string,
                status: ['admin', 'super_admin'].includes(user.user_type) ? ProductStatus.PUBLISHED : ProductStatus.PENDING_REVIEW,
                approval_status: ['admin', 'super_admin'].includes(user.user_type) ? 'approved' : 'pending'
            });

            // Create Pricing Tiers             
            if (validated.pricing_tiers && validated.pricing_tiers.length > 0) {
                if (!product.id) {
                    throw new Error("Product ID is missing after creation");
                }

                // Use sequential create to avoid bulkCreate validation quirks
                for (const t of validated.pricing_tiers) {
                    await ProductPricingTier.create({
                        min_quantity: t.min_quantity,
                        max_quantity: t.max_quantity,
                        price: t.price,
                        product_id: product.id
                    });
                }
            }

            // Handle Files (Gallery)
            if (files && files.length > 0) {
                for (const file of files) {
                    // Determine type and subdir
                    let type = 'product_image';
                    let folder = 'gallery';

                    if (file.type.startsWith('video/')) {
                        type = 'video';
                        folder = 'gallery';
                    }
                    if (file.type.includes('pdf') || file.type.includes('application/')) {
                        type = 'document';
                        folder = 'documents';
                    }

                    // Structure: products/{sku}/{folder}
                    const subdir = `products/${product.sku}/${folder}`;
                    const path = await FileUploadService.saveFile(file, subdir);

                    await ProductMedia.create({
                        product_id: product.id,
                        type: type,
                        url: path,
                        file_name: file.name,
                        file_size: file.size,
                        mime_type: file.type,
                        is_cover: false
                    });
                }
            }

            // Handle Cover Image
            if (parsedData?.coverImage) {
                const file = parsedData.coverImage;
                const subdir = `products/${product.sku}/gallery`;
                const path = await FileUploadService.saveFile(file, subdir);

                await ProductMedia.create({
                    product_id: product.id,
                    type: 'product_image',
                    url: path,
                    file_name: file.name,
                    file_size: file.size,
                    mime_type: file.type,
                    is_cover: true
                });
            }

            // If no cover set (after gallery and cover handling), set first image as cover
            const hasCover = await ProductMedia.findOne({ where: { product_id: product.id, is_cover: true } });
            if (!hasCover) {
                const firstImage = await ProductMedia.findOne({ where: { product_id: product.id } });
                if (firstImage) {
                    firstImage.is_cover = true;
                    await firstImage.save();
                }
            }

            // Create does not need masking as user is auth'd
            if ((files && files.length > 0) || parsedData?.coverImage) {
                // Reload to get media URLs properly

                // SYNC SPECS
                await this.syncSpecifications(product.id, body);

                const reloaded = await Product.findByPk(product.id, {
                    include: [
                        { model: ProductMedia, as: 'media' },
                        { model: ProductSpecification, as: 'product_specifications' }
                    ]
                });
                const formatted = await this.formatProduct(reloaded);
                return this.sendSuccess(formatted, 'Product created', 201, { placeholder_image: getFileUrl('/placeholder.svg') });
            } else {
                await this.syncSpecifications(product.id, body);
                const formatted = await this.formatProduct(product);
                return this.sendSuccess(formatted, 'Product created', 201, { placeholder_image: getFileUrl('/placeholder.svg') });
            }

        } catch (error) {
            if (error instanceof z.ZodError) {
                return this.sendError('Validation Error', 400, error.issues);
            }
            return this.sendError('Internal Server Error', 500, [], error);
        }
    }

    /**
     * adminGetById
     * GET /api/v1/admin/products/:id
     * Admin/Vendor fetch single product details (bypasses status checks)
     */
    async adminGetById(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const id = params.id;
            if (!id) return this.sendError('Invalid ID', 400);

            const { product, user, error } = await this.verifyProductAccess(req, id, 'product.view');
            if (error) return error;

            // Re-fetch with all associations for detail view
            const fullProduct = await Product.findByPk(id, {
                include: [
                    { model: ProductMedia, as: 'media' },
                    { model: ProductPricingTier, as: 'pricing_tiers' },
                    { model: ProductSpecification, as: 'product_specifications' },
                    { model: Category, as: 'main_category', attributes: ['id', 'name', 'is_controlled', 'slug'] },
                    { model: Category, as: 'category', attributes: ['id', 'name', 'is_controlled', 'slug'] },
                    { model: Category, as: 'sub_category', attributes: ['id', 'name', 'is_controlled', 'slug'] },
                    { model: RefProductBrand, as: 'brand', attributes: ['id', 'name', 'icon'] }
                ]
            });

            if (!fullProduct) return this.sendError('Product not found', 404);

            // Invisibility for unpublished products for Admins - REMOVED to allow reviewing drafts/pending
            // if (fullProduct.status !== ProductStatus.PUBLISHED) {
            //    return this.sendError('Product not available for review (Draft status)', 403);
            // }

            const formatted = await this.formatProduct(fullProduct);
            return this.sendSuccess(formatted, 'Success', 200, { placeholder_image: getFileUrl('/placeholder.svg') });

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
    * getById
    * GET /api/v1/products/:id
    */
    async getById(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const user = await this.getUserFromRequest(req);
            const id = params.id;

            if (!id) return this.sendError('Invalid Product ID', 400);

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            // If not UUID, assume it's a SKU and ensure it has the 'SKU-' prefix
            const whereClause = isUuid ? { id } : { sku: id.startsWith('SKU-') ? id : `SKU-${id}` };

            const product = await Product.findOne({
                where: whereClause,
                include: [
                    { model: ProductMedia, as: 'media', required: false },
                    { model: ProductPricingTier, as: 'pricing_tiers' },
                    { model: ProductSpecification, as: 'product_specifications' },
                    { model: Category, as: 'category', attributes: ['id', 'name', 'is_controlled'] },
                    { model: Category, as: 'main_category', attributes: ['id', 'name', 'is_controlled'] },
                    { model: Category, as: 'sub_category', attributes: ['id', 'name', 'is_controlled'] },
                    { model: RefProductBrand, as: 'brand', attributes: ['id', 'name', 'icon'] }
                ]
            });

            if (!product) return this.sendError('Product not found', 404);

            const isAdmin = user && ['admin', 'super_admin'].includes(user.user_type);
            // Check ownership directly or via parsed ID comparison
            const isOwner = user && (String(user.id) === String(product.vendor_id));
            const isPublic = (product.status === ProductStatus.PUBLISHED || product.status === ProductStatus.OUT_OF_STOCK) && product.approval_status === 'approved';

            if (!isPublic && !isAdmin && !isOwner) {
                // Return 404 to hide existence
                return this.sendError('Product not found', 404);
            }

            const userProfile = user?.profile || (user ? await UserProfile.findOne({ where: { user_id: user.id } }) : null);
            const discount = userProfile?.discount || 0;

            const formatted = await this.formatProduct(product, discount);
            const maskedProduct = this.maskProducts(formatted, user);

            return this.sendSuccess(maskedProduct, 'Success', 200, { placeholder_image: getFileUrl('/placeholder.svg') });

        } catch (error) {
            return this.sendError('Internal Server Error', 500, [], error);
        }
    }

    /**
     * update
     * PATCH/PUT /api/v1/products/:id
     */
    async update(req: NextRequest, { params, parsedData }: { params: { id: string }, parsedData?: { data: any, files: File[], coverImage?: File | null } }) {
        try {
            const id = params.id;

            if (!id) return this.sendError('Invalid Product ID', 400);

            const { product, user, error } = await this.verifyProductAccess(req, id);
            if (error) return error;

            let body = parsedData ? parsedData.data : await req.json();
            const files = parsedData ? parsedData.files : [];

            // Handle Parsing for arrays if stringified
            const arrayFields = ['pricing_tiers', 'materials', 'features', 'performance', 'drive_types', 'thickness', 'colors', 'pricing_terms', 'individual_product_pricing', 'individualProductPricing', 'certifications'];
            arrayFields.forEach(field => {
                if (typeof body[field] === 'string') {
                    try {
                        body[field] = JSON.parse(body[field]);
                    } catch (e) {
                        if (field !== 'pricing_tiers' && field !== 'individual_product_pricing' && field !== 'individualProductPricing') { // object arrays
                            body[field] = body[field].split(',').map((s: string) => s.trim());
                        }
                    }
                }
            });

            // Handle CamelCase -> SnakeCase mapping for robustness
            const mapping: any = {
                basePrice: 'base_price',
                minOrderQuantity: 'min_order_quantity',
                productionLeadTime: 'production_lead_time',
                weightValue: 'weight_value',
                warrantyDuration: 'warranty_duration',
                readyStockAvailable: 'ready_stock_available',
                requiresExportLicense: 'requires_export_license',
                hasWarranty: 'has_warranty',
                complianceConfirmed: 'compliance_confirmed',
                manufacturingSource: 'manufacturing_source',
                manufacturingSourceName: 'manufacturing_source_name',
                vehicleFitment: 'vehicle_fitment',
                specifications: 'specifications',
                technicalDescription: 'technical_description',
                controlledItemType: 'controlled_item_type',
                subCategoryId: 'sub_category_id',
                mainCategoryId: 'main_category_id',
                countryOfOrigin: 'country_of_origin',
                vehicleCompatibility: 'vehicle_compatibility',
                isFeatured: 'is_featured',
                isTopSelling: 'is_top_selling',
                individualProductPricing: 'individual_product_pricing'
            };

            Object.keys(mapping).forEach(camelKey => {
                if (body[camelKey] !== undefined) {
                    body[mapping[camelKey]] = body[camelKey];
                    delete body[camelKey]; // optional cleanup
                }
            });

            // --- Controlled Product Approval Logic (Universal UAE Rule) ---
            // If Status is changing AND User is Admin
            if (user.user_type === 'admin') {

                // If status is present in body (being updated)
                if (body.status || body.approval_status) {
                    // Determine if Product is Controlled + UAE
                    // We need full product with Categories and Vendor Profile
                    const fullProduct = await Product.findByPk(id, {
                        include: [
                            { model: Category, as: 'main_category' },
                            { model: Category, as: 'category' },
                            { model: Category, as: 'sub_category' },
                            {
                                model: User,
                                as: 'vendor',
                                include: [{ model: UserProfile, as: 'profile' }]
                            }
                        ]
                    }) as any;

                    if (fullProduct) {
                        const isControlled = (
                            fullProduct.main_category?.is_controlled ||
                            fullProduct.category?.is_controlled ||
                            fullProduct.sub_category?.is_controlled
                        );

                        const vendorProfile = fullProduct.vendor?.profile;
                        const isUAE = vendorProfile ? ['UAE', 'United Arab Emirates', 'United Arab Emirates (UAE)'].includes(vendorProfile.country) : false;

                        if (isControlled && isUAE) {
                            // Strict Permission Required
                            const hasPerm = await new PermissionService().hasPermission(user.id, 'product.controlled.approve');
                            if (!hasPerm) {
                                return this.sendError('Forbidden: Missing product.controlled.approve Permission for UAE Controlled Product', 403);
                            }
                        } else {
                            // General Product (or Non-UAE Controlled)
                        }
                    }
                }
            }

            // Ensure numeric fields are numbers (FormData sends strings)
            if (body.base_price !== undefined) body.base_price = Number(body.base_price);
            if (body.weight_value !== undefined) body.weight_value = Number(body.weight_value);
            // if (body.min_order_quantity !== undefined) body.min_order_quantity = Number(body.min_order_quantity); // DEPRECATED: Now TEXT
            if (body.production_lead_time !== undefined) body.production_lead_time = Number(body.production_lead_time);
            if (body.year !== undefined) body.year = Number(body.year);
            if (body.warranty_duration !== undefined) body.warranty_duration = Number(body.warranty_duration);
            if (body.stock !== undefined) body.stock = Number(body.stock);

            // Boolean conversions
            if (body.is_featured !== undefined) body.is_featured = String(body.is_featured) === 'true';
            if (body.is_top_selling !== undefined) body.is_top_selling = String(body.is_top_selling) === 'true';

            // Update Product Fields
            // Filter allowed fields? For now allow all
            // Prevent changing important fields if needed
            delete body.id;
            delete body.vendor_id; // Cannot change owner
            delete body.created_at;
            delete body.updated_at;

            // Extract gallery for synchronization (URLs of images to KEEP)
            let galleryToKeep: string[] = [];
            if (body.gallery) {
                if (Array.isArray(body.gallery)) {
                    galleryToKeep = body.gallery;
                } else if (typeof body.gallery === 'string') {
                    try {
                        const parsed = JSON.parse(body.gallery);
                        if (Array.isArray(parsed)) galleryToKeep = parsed;
                        else galleryToKeep = [body.gallery];
                    } catch (e) {
                        galleryToKeep = [body.gallery];
                    }
                }
            }

            delete body.gallery; // Remove from bodyUpdate
            delete body.image;   // Remove legacy image field if present

            // --- Vendor Approval Logic ---
            if (user.user_type === 'vendor') {
                const contentFields = [
                    'name', 'description', 'base_price', 'category_id', 'main_category_id',
                    'sub_category_id', 'condition', 'year', 'brand_id', 'vehicle_compatibility',
                    'min_order_quantity', 'compliance_declaration', 'individual_product_pricing'
                ];
                const hasContentChanges = contentFields.some(f => body[f] !== undefined);
                const hasMediaChanges = (files && files.length > 0) || (parsedData?.coverImage !== undefined);

                if ((hasContentChanges || hasMediaChanges) && product.status !== ProductStatus.DRAFT) {
                    body.status = ProductStatus.DRAFT;
                    body.approval_status = 'pending';
                }

                if (body.status && body.status !== ProductStatus.DRAFT && product.status === ProductStatus.DRAFT) {
                    body.approval_status = 'pending';
                }
            }

            await product.update(body);

            // Handle Pricing Tiers Update (Full Replace Strategy for now)
            if (body.pricing_tiers && Array.isArray(body.pricing_tiers)) {
                // Delete old
                await ProductPricingTier.destroy({ where: { product_id: id } });
                // Create new
                const tiers = body.pricing_tiers.map((t: any) => ({
                    min_quantity: t.min_quantity,
                    max_quantity: t.max_quantity,
                    price: t.price,
                    product_id: id
                }));
                await ProductPricingTier.bulkCreate(tiers);
            }

            // --- Handle Media Synchronization (Deletions) ---
            if (galleryToKeep.length > 0) {
                // 1. Fetch all existing media
                const existingMedia = await ProductMedia.findAll({ where: { product_id: id } });

                // 2. Filter out media that is NOT in the galleryToKeep list
                const mediaToDelete = existingMedia.filter(m => {
                    const rawUrl = m.getDataValue('url');
                    // Check if the media URL is contained in any of the kept URLs (handling relative/absolute differences)
                    const isKept = galleryToKeep.some(keptUrl => keptUrl && (keptUrl.includes(rawUrl) || rawUrl.includes(keptUrl)));
                    return !isKept;
                });

                if (mediaToDelete.length > 0) {
                    const idsToDelete = mediaToDelete.map(m => m.id);
                    await ProductMedia.destroy({ where: { id: idsToDelete } });
                }
            }

            // Handle New Files (Gallery)
            if (files && files.length > 0) {
                for (const file of files) {
                    let type = 'product_image';
                    let folder = 'gallery';

                    if (file.type.startsWith('video/')) {
                        type = 'video';
                        folder = 'gallery';
                    }
                    if (file.type.includes('pdf') || file.type.includes('application/')) {
                        type = 'document';
                        folder = 'documents';
                    }

                    const subdir = `products/${product.sku}/${folder}`;
                    const path = await FileUploadService.saveFile(file, subdir);

                    const media = await ProductMedia.create({
                        product_id: product.id,
                        type: type,
                        url: path,
                        file_name: file.name,
                        file_size: file.size,
                        mime_type: file.type,
                        is_cover: false
                    });
                }
            }

            // Handle New Cover Image
            if (parsedData?.coverImage) {
                const file = parsedData.coverImage;
                const subdir = `products/${product.sku}/gallery`;
                const path = await FileUploadService.saveFile(file, subdir);

                // 1. Set all existing covers to false
                await ProductMedia.update(
                    { is_cover: false },
                    { where: { product_id: id, is_cover: true } }
                );

                // 2. Create new cover
                await ProductMedia.create({
                    product_id: product.id,
                    type: 'product_image',
                    url: path,
                    file_name: file.name,
                    file_size: file.size,
                    mime_type: file.type,
                    is_cover: true
                });
            }

            // Finally, Ensure ANY product image is set as cover if none exist
            const existingCover = await ProductMedia.findOne({ where: { product_id: id, is_cover: true } });
            if (!existingCover) {
                const first = await ProductMedia.findOne({ where: { product_id: id, type: 'product_image' } });
                if (first) {
                    first.is_cover = true;
                    await first.save();
                }
            }

            // --- SYNC Specifications (Dual Write) ---
            // We sync 'colors' and 'sizes' to ProductSpecification table to satisfy architectural requirements
            await this.syncSpecifications(id, body);

            // Fetch fresh
            const updatedProduct = await Product.findByPk(id, {
                include: [
                    { model: ProductMedia, as: 'media' },
                    { model: ProductPricingTier, as: 'pricing_tiers' },
                    { model: ProductSpecification, as: 'product_specifications' }, // Include specs
                    { model: Category, as: 'category' }
                ]
            });
            const formatted = await this.formatProduct(updatedProduct);
            return this.sendSuccess(formatted, "Product updated successfully");

        } catch (error) {
            if (error instanceof z.ZodError) { return this.sendError('Validation Error', 400, error.issues); }
            return this.sendError('Internal Server Error', 500, [], error);
        }
    }

    /**
     * Helper: Sync Colors/Sizes to ProductSpecification table
     */
    private async syncSpecifications(productId: string, body: any) {
        // 1. Define specs to sync
        const specsToSync = [
            { key: 'colors', label: 'Color', type: 'general' },
            { key: 'sizes', label: 'Size', type: 'general' }
        ];

        for (const specDef of specsToSync) {
            // Check if key is present in body. If undefined, SKIP.
            if (body[specDef.key] === undefined) {
                continue;
            }

            const values: string[] = body[specDef.key] || []; // e.g. ["Red", "Blue"]

            // Delete existing generic specs for this Label
            await ProductSpecification.destroy({
                where: {
                    product_id: productId,
                    label: specDef.label
                }
            });

            // Insert new rows
            if (values && Array.isArray(values) && values.length > 0) {
                const rows = values.map((val, idx) => ({
                    product_id: productId,
                    label: specDef.label,
                    value: val,
                    type: specDef.type,
                    active: true,
                    sort: idx
                }));
                await ProductSpecification.bulkCreate(rows as any);
            }
        }
    }





    /**
     * Helper: Verify vendor/admin auth and product ownership
     */
    private async verifyProductAccess(req: NextRequest, productId: string, requiredPermission: string = 'product.manage'): Promise<{ product: any; user: any; error: Response | null }> {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { product: null, user: null, error: this.sendError('Unauthorized', 401) };
        }

        try {
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const user = await User.findByPk(decoded.userId || decoded.sub);

            if (!user) {
                return { product: null, user: null, error: this.sendError('User not found', 401) };
            }

            // Enforce Onboarding
            const onboardingError = await this.checkOnboarding(user);
            if (onboardingError) return { product: null, user: null, error: onboardingError };

            if (!['vendor', 'admin', 'super_admin'].includes(user.user_type)) {
                return { product: null, user: null, error: this.sendError('Vendor authentication required', 401) };
            }

            if (user.user_type === 'admin') {
                // Check generic manage first
                let hasPerm = await new PermissionService().hasPermission(user.id, requiredPermission); // product.manage

                if (!hasPerm) {
                    // Quick check for controlled permission
                    const hasControlled = await new PermissionService().hasPermission(user.id, 'product.controlled.approve');
                    if (hasControlled) {
                    } else {
                        return { product: null, user: null, error: this.sendError(`Forbidden: Missing ${requiredPermission} Permission`, 403) };
                    }
                }
            }

            const product = await Product.findByPk(productId);
            if (!product) {
                return { product: null, user: null, error: this.sendError('Product not found', 404) };
            }

            // Logic Re-Check for Admin with ONLY controlled permission
            if (user.user_type === 'admin') {
                const hasManage = await new PermissionService().hasPermission(user.id, requiredPermission);
                if (!hasManage) {
                    const hasControlled = await new PermissionService().hasPermission(user.id, 'product.controlled.approve');
                    if (!hasControlled) {
                        // Neither Manage nor Controlled
                        return { product: null, user: null, error: this.sendError(`Forbidden: Missing ${requiredPermission}`, 403) };
                    }

                    // Has Controlled BUT Not Manage.
                    // Check if Product is Controlled.
                    // We need categories.
                    // Re-fetch product with categories
                    const fullP = await Product.findByPk(productId, {
                        include: [
                            { model: Category, as: 'main_category' },
                            { model: Category, as: 'category' },
                            { model: Category, as: 'sub_category' }
                        ]
                    }) as any;

                    const isControlled = (fullP.main_category?.is_controlled || fullP.category?.is_controlled || fullP.sub_category?.is_controlled);

                    if (!isControlled) {
                        // User only has Controlled perm, but product is General. Block.
                        return { product: null, user: null, error: this.sendError('Forbidden: No access to General Products', 403) };
                    }
                }
            }

            // Vendors can only access their own products
            if (user.user_type === 'vendor' && String(product.vendor_id) !== String(user.id)) {
                return { product: null, user: null, error: this.sendError('Access denied', 403) };
            }

            return { product, user, error: null };
        } catch (e) {
            return { product: null, user: null, error: this.sendError('Invalid token', 401) };
        }
    }

    /**
     * addMedia
     * POST /api/v1/vendor/products/:id/media
     * Content-Type: application/json
     * Request: { type, url, fileName?, fileSize?, mimeType?, isCover?, displayOrder? }
     */
    async addMedia(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const productId = params.id;
            if (!productId) return this.sendError('Invalid product ID', 400);

            const { product, user, error } = await this.verifyProductAccess(req, productId);
            if (error) return error;

            const body = await req.json();
            const { type, url, fileName, fileSize, mimeType, isCover, displayOrder } = body;

            if (!type || !url) {
                return this.sendError('Type and URL are required', 400);
            }

            const validTypes = ['product_image', 'cad_file', 'certificate', 'msds', 'manual', 'video'];
            if (!validTypes.includes(type)) {
                return this.sendError(`Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);
            }

            const media = await ProductMedia.create({
                product_id: productId,
                type,
                url,
                file_name: fileName,
                file_size: fileSize,
                mime_type: mimeType,
                is_cover: isCover || false,
                display_order: displayOrder || 0,
            });

            return this.sendSuccess(media, 'Media added', 201);

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * deleteMedia
     * DELETE /api/v1/vendor/products/:id/media/:mediaId
     */
    async deleteMedia(req: NextRequest, { params }: { params: { id: string; mediaId: string } }) {
        try {
            const productId = params.id;
            const mediaId = parseInt(params.mediaId);
            if (!productId || isNaN(mediaId)) {
                return this.sendError('Invalid ID', 400);
            }

            const { product, user, error } = await this.verifyProductAccess(req, productId);
            if (error) return error;

            const media = await ProductMedia.findOne({
                where: { id: mediaId, product_id: productId }
            });

            if (!media) {
                return this.sendError('Media not found', 404);
            }

            const wasCover = media.is_cover;
            const fileUrl = media.getDataValue('url');

            // Delete file from disk first
            if (fileUrl) {
                await FileDeleteService.deleteFile(fileUrl);
            }

            await media.destroy();

            // If we deleted the cover, promote another image
            if (wasCover) {
                const nextCover = await ProductMedia.findOne({
                    where: { product_id: productId }
                });
                if (nextCover) {
                    nextCover.is_cover = true;
                    await nextCover.save();
                }
            }

            return this.sendSuccess(null, 'Media deleted', 200);

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * bulkDeleteMedia
     * DELETE /api/v1/admin/products/:id/media
     * Body: { mediaIds: number[] }
     */
    async bulkDeleteMedia(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const productId = params.id;
            if (!productId) return this.sendError('Invalid ID', 400);

            const { product, user, error } = await this.verifyProductAccess(req, productId);
            if (error) return error;

            const body = await req.json();
            const { mediaIds } = body;

            if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
                return this.sendError('mediaIds array is required', 400);
            }

            // Fetch media to get file URLs before deleting
            const mediaToDelete = await ProductMedia.findAll({
                where: {
                    id: { [Op.in]: mediaIds },
                    product_id: productId
                }
            });

            // Delete files from disk
            for (const media of mediaToDelete) {
                const fileUrl = media.getDataValue('url');
                if (fileUrl) {
                    await FileDeleteService.deleteFile(fileUrl);
                }
            }

            // Destroy DB records
            await ProductMedia.destroy({
                where: {
                    id: { [Op.in]: mediaIds },
                    product_id: productId
                }
            });

            // Ensure a cover still exists
            const hasCover = await ProductMedia.findOne({ where: { product_id: productId, is_cover: true } });
            if (!hasCover) {
                const nextCover = await ProductMedia.findOne({
                    where: { product_id: productId }
                });
                if (nextCover) {
                    nextCover.is_cover = true;
                    await nextCover.save();
                }
            }

            return this.sendSuccess(null, 'Media deleted successfully', 200);

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * setCoverImage
     * POST /api/v1/vendor/products/:id/media/:mediaId/cover
     */
    async setCoverImage(req: NextRequest, { params }: { params: { id: string; mediaId: string } }) {
        try {
            const productId = params.id;
            const mediaId = parseInt(params.mediaId);
            if (!productId || isNaN(mediaId)) {
                return this.sendError('Invalid ID', 400);
            }

            const { product, user, error } = await this.verifyProductAccess(req, productId);
            if (error) return error;

            // Remove cover flag from all media for this product
            await ProductMedia.update(
                { is_cover: false },
                { where: { product_id: productId } }
            );

            // Set cover flag on specified media
            const [updated] = await ProductMedia.update(
                { is_cover: true },
                { where: { id: mediaId, product_id: productId } }
            );

            if (updated === 0) {
                return this.sendError('Media not found', 404);
            }

            return this.sendSuccess({ success: true }, 'Cover image set');

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * listFeatured
     * GET /api/v1/products/featured
     * Returns products where is_featured = true
     */
    async listFeatured(req: NextRequest) {
        try {
            const user = await this.getUserFromRequest(req);
            const { searchParams } = new URL(req.url);
            const limit = parseInt(searchParams.get('limit') || '10');

            const products = await Product.findAll({
                where: {
                    status: { [Op.in]: [ProductStatus.APPROVED, ProductStatus.PUBLISHED] },
                    approval_status: 'approved',
                    is_featured: true,
                },
                limit,
                order: [['created_at', 'DESC']],
                include: [
                    { model: ProductMedia, as: 'media', required: true }, // Fetch ALL media for gallery, but REQUIRE at least one
                    { model: Category, as: 'category', attributes: ['id', 'name'] },
                ],
            });

            const formatted = await this.formatProduct(products);
            const masked = this.maskProducts(formatted, user);

            return this.sendSuccess(masked, 'Success', 200, { placeholder_image: getFileUrl('/placeholder.svg') });
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * listTopSelling
     * GET /api/v1/products/top-selling
     * Returns top rated/ordered products
     */
    async listTopSelling(req: NextRequest) {
        try {
            const user = await this.getUserFromRequest(req);
            // User Request: "Top products must only return 6 items exactly. else return null"
            const limit = 6;

            const products = await Product.findAll({
                where: {
                    status: { [Op.in]: [ProductStatus.APPROVED, ProductStatus.PUBLISHED] },
                    approval_status: 'approved',
                    is_top_selling: true
                },
                limit: limit,
                order: [literal('RANDOM()')],
                include: [
                    { model: ProductMedia, as: 'media', required: true },
                    { model: Category, as: 'category', attributes: ['id', 'name'] },
                ],
            });

            if (products.length < 6) {
                return this.sendSuccess(null);
            }

            const formatted = await this.formatProduct(products);
            return this.sendSuccess(this.maskProducts(formatted, user), 'Success', 200, { placeholder_image: getFileUrl('/placeholder.svg') });
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * getSimilar
     * GET /api/v1/products/:id/similar
     * Returns products in the same category
     */
    async getSimilar(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const user = await this.getUserFromRequest(req);
            const id = params.id;
            if (!id) return this.sendError('Invalid ID', 400);

            const product = await Product.findByPk(id);
            if (!product) return this.sendError('Product not found', 404);

            const { searchParams } = new URL(req.url);
            const limit = parseInt(searchParams.get('limit') || '6');

            const whereClause: any = {
                status: ProductStatus.APPROVED,
                id: { [Op.ne]: id },
            };

            if (product.category_id) {
                whereClause.category_id = product.category_id;
            }

            const similar = await Product.findAll({
                where: whereClause,
                limit,
                // order: [['rating', 'DESC']],
                include: [
                    { model: ProductMedia, as: 'media', where: { is_cover: true }, required: false },
                ],
            });
            const formatted = await this.formatProduct(similar);
            return this.sendSuccess(this.maskProducts(formatted, user));
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * getRecommended
     * GET /api/v1/products/:id/recommended
     * Returns personalized recommendations (currently: top rated products)
     */
    async getRecommended(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const user = await this.getUserFromRequest(req);
            const { searchParams } = new URL(req.url);
            const limit = parseInt(searchParams.get('limit') || '6');

            const products = await Product.findAll({
                where: { status: ProductStatus.APPROVED },
                limit,
                // order: [['rating', 'DESC'], ['review_count', 'DESC']],
                include: [
                    { model: ProductMedia, as: 'media', where: { is_cover: true }, required: false },
                ],
            });

            const formatted = await this.formatProduct(products);
            return this.sendSuccess(this.maskProducts(formatted, user));
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * bulkCreate
     * POST /api/v1/products/bulk
     * Create multiple products from JSON array
     */
    async bulkCreate(req: NextRequest) {
        try {
            // Auth Check
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return this.sendError('Unauthorized', 401);
            }

            let decoded: any;
            try {
                const token = authHeader.split(' ')[1];
                decoded = verifyAccessToken(token);
            } catch (e) {
                return this.sendError('Invalid Token', 401);
            }

            const user = await User.findByPk(decoded.userId || decoded.sub);
            if (!user) {
                return this.sendError('User not found', 401);
            }

            // Enforce Onboarding
            const onboardingError = await this.checkOnboarding(user);
            if (onboardingError) return onboardingError;

            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'product.manage');
                if (!hasPerm) return this.sendError('Forbidden: Missing product.manage Permission', 403);
            }

            if (!['vendor', 'admin', 'super_admin'].includes(user.user_type)) {
                return this.sendError('Forbidden: Only vendors and admins can bulk create products', 403);
            }

            const body = await req.json();
            const { products, vendorId } = body;

            if (!products || !Array.isArray(products) || products.length === 0) {
                return this.sendError('Products array is required', 400);
            }

            // Determine vendor ownership
            let finalVendorId: string | null = null;
            if (user.user_type === 'vendor') {
                finalVendorId = user.id;
            } else if (vendorId) {
                const targetVendor = await User.findByPk(vendorId);
                if (!targetVendor || targetVendor.user_type !== 'vendor') {
                    return this.sendError('Invalid vendorId provided', 400);
                }
                finalVendorId = vendorId;
            }

            const created: any[] = [];
            const errors: any[] = [];

            for (let i = 0; i < products.length; i++) {
                try {
                    const validated = createProductSchema.parse(products[i]);
                    const product = await Product.create({
                        ...validated,
                        vendor_id: finalVendorId as string,
                        status: ProductStatus.DRAFT,
                    });

                    if (validated.pricing_tiers && validated.pricing_tiers.length > 0) {
                        const tiers = validated.pricing_tiers.map(t => ({
                            ...t,
                            product_id: product.id
                        }));
                        await ProductPricingTier.bulkCreate(tiers);
                    }

                    created.push(product);
                } catch (err: any) {
                    errors.push({ index: i, error: err.message || 'Validation failed' });
                }
            }

            return this.sendSuccess({
                count: created.length,
                products: created,
                errors,
            }, 'Bulk create completed', 201);

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * bulkUpload
     * POST /api/v1/products/bulk-upload
     * Create multiple products from Excel or CSV file upload
     * Supports: .xlsx, .csv
     */
    /*
   async bulkUpload(req: NextRequest) {
       try {
           // 1. Auth Check
           const authHeader = req.headers.get('authorization');
           if (!authHeader || !authHeader.startsWith('Bearer ')) return this.sendError('Unauthorized', 401);

           let decoded: any;
           try {
               const token = authHeader.split(' ')[1];
               decoded = verifyAccessToken(token);
           } catch (e) {
               return this.sendError('Invalid Token', 401);
           }

           const user = await User.findByPk(decoded.userId || decoded.sub);
           if (!user) return this.sendError('User not found', 401);

           // Enforce Onboarding
           const onboardingError = await this.checkOnboarding(user);
           if (onboardingError) return onboardingError;

           // Permission Check
           if (user.user_type === 'admin') {
               const hasPerm = await new PermissionService().hasPermission(user.id, 'product.manage');
               if (!hasPerm) return this.sendError('Forbidden: Missing product.manage Permission', 403);
           }

           if (!['vendor', 'admin', 'super_admin'].includes(user.user_type)) {
               return this.sendError('Forbidden: Only vendors and admins can bulk upload products', 403);
           }

           // 2. Parse Form Data
           const formData = await req.formData();
           const file = formData.get('file') as File | null;

           // Allow admin to force a specific vendor for ALL items in file (optional override)
           // But usually, we want per-row 'vendor_email' support for admins
           const forceVendorId = formData.get('vendorId') as string | null;

           if (!file) return this.sendError('File is required in "file" field', 400);

           // 3. Read File Content
           const fileBuffer = await file.arrayBuffer();
           const buffer = Buffer.from(fileBuffer);

           let records: any[] = [];

           // Detect format
           if (file.name.endsWith('.xlsx')) {
               const workbook = new ExcelJS.Workbook();
               await workbook.xlsx.load(buffer as any);
               const worksheet = workbook.worksheets[0];

               if (!worksheet) return this.sendError('Excel file is empty', 400);

               // Get headers from first row
               const headers: string[] = [];
               const firstRow = worksheet.getRow(1);
               firstRow.eachCell((cell, colNumber) => {
                   headers[colNumber] = cell.value ? String(cell.value).trim() : '';
               });

               // Iterate validation rows
               worksheet.eachRow((row, rowNumber) => {
                   if (rowNumber === 1) return; // Skip header
                   const rowData: any = {};
                   row.eachCell((cell, colNumber) => {
                       const header = headers[colNumber];
                       if (header) {
                           // Handle potential rich text or formulas (simple value)
                           rowData[header] = cell.value;
                           if (typeof cell.value === 'object' && cell.value !== null && 'text' in cell.value) {
                               rowData[header] = (cell.value as any).text; // Rich text
                           } else if (typeof cell.value === 'object' && cell.value !== null && 'result' in cell.value) {
                               rowData[header] = (cell.value as any).result; // Formula
                           }
                       }
                   });
                   if (Object.keys(rowData).length > 0) records.push(rowData);
               });

           } else {
               // Fallback to CSV
               const fileContent = new TextDecoder('utf-8').decode(fileBuffer);
               records = parse(fileContent, {
                   columns: true,
                   skip_empty_lines: true,
                   trim: true,
                   relax_column_count: true
               }) as any[];
           }

           if (!records || records.length === 0) {
               return this.sendError('File is empty or could not be parsed', 400);
           }

           // 4. Pre-fetch Data for Lookups (Optimization)
           const categories = await Category.findAll({ attributes: ['id', 'name'] });
           const brands = await RefProductBrand.findAll({ attributes: ['id', 'name'] });

           // Map Name -> ID (Case insensitive)
           const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
           const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));

           const results = {
               success: 0,
               failed: 0,
               errors: [] as any[]
           };

           const createdProducts = [];

           // 5. Process Records
           for (let i = 0; i < records.length; i++) {
               const row = records[i];
               const rowNum = i + 2; // Excel row number (1-based + header)

               try {
                   // Normalization
                   const normalize = (val: any) => val ? String(val).trim() : undefined;
                   const normalizeNum = (val: any) => {
                       if (val === undefined || val === null || val === '') return undefined;
                       const num = Number(val);
                       return isNaN(num) ? undefined : num;
                   };

                   // --- Lookups ---

                   // 1. Category
                   let categoryId = normalizeNum(row.category_id);
                   if (!categoryId && row.category) {
                       const catName = String(row.category).toLowerCase().trim();
                       categoryId = catMap.get(catName);
                   }
                   if (!categoryId) throw new Error(`Category '${row.category || 'undefined'}' not found.`);

                   // 2. Brand
                   let brandId = normalizeNum(row.brand_id);
                   if (!brandId && row.brand) {
                       const brandName = String(row.brand).toLowerCase().trim();
                       brandId = brandMap.get(brandName);
                   }
                   // Optional: Create brand if not exists? No, strict for now.

                   // 3. Vendor (Admin Only)
                   let targetVendorId = user.user_type === 'vendor' ? user.id : (forceVendorId || null); // Default to specified or null (admin owned)

                   if (user.user_type === 'admin') {
                       if (row.vendor_email) {
                           const email = String(row.vendor_email).toLowerCase().trim();
                           const vendor = await User.findOne({ where: { email } });
                           if (vendor) {
                               if (vendor.user_type === 'vendor') {
                                   targetVendorId = vendor.id;
                               } else {
                                   throw new Error(`User with email '${email}' is not a vendor.`);
                               }
                           } else {
                               throw new Error(`Vendor with email '${email}' not found.`);
                           }
                       }
                   }

                   // --- Construction ---
                   const productData: any = {
                       name: normalize(row.name),
                       sku: normalize(row.sku), // Will auto-gen if empty in create logic
                       description: normalize(row.description),
                       base_price: normalizeNum(row.base_price),
                       category_id: categoryId,
                       brand_id: brandId,
                       vendor_id: targetVendorId, // Can be null if admin owned
                       stock: normalizeNum(row.stock) || 0,
                       raw_data: row // Store original for debugging/meta if needed? No schema/col for it.
                   };

                   // --- Validation ---
                   if (!productData.name) throw new Error('Product Name is required');
                   if (!productData.base_price) throw new Error('Base Price is required');

                   // Using the schema? simplified for bulk
                   const validated = createProductSchema.parse(productData);

                   // Auto-generate SKU if missing (logic copied from create)
                   if (!validated.sku || validated.sku.trim() === '') {
                       const timestamp = Math.floor(Date.now() / 1000);
                       const random = Math.floor(1000 + Math.random() * 9000);
                       validated.sku = `AV-${timestamp}-${random}-${i}`; // Add index to avoid collision in same batch
                   }

                   const product = await Product.create({
                       ...validated,
                       vendor_id: targetVendorId as string, // Cast to string | undefined
                       status: ProductStatus.DRAFT, // Always draft for bulk
                       approval_status: 'pending'
                   });

                   results.success++;
                   createdProducts.push(product);

               } catch (error: any) {
                   results.failed++;
                   results.errors.push({
                       row: rowNum,
                       name: row.name || 'Unknown',
                       error: error.message || 'Unknown error'
                   });
               }
           }

           return this.sendSuccess({
               ...results,
               created_count: createdProducts.length
           }, 'Bulk upload processed', 200);

       } catch (error: any) {
           console.error('Bulk Upload Error:', error);
           return this.sendError(String((error as any).message), 500);
       }
   }

   */

    /**
     * NOT NEEDED
     */

    /**
     * bulkCreateFromCsv
     * POST /api/v1/products/bulk/csv
     * Create multiple products from CSV file upload
     * Note: Accesses req.formData() which handles multipart
     */
    async bulkCreateFromCsv(req: NextRequest) {
        try {
            // Auth Check
            const authHeader = req.headers.get('authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return this.sendError('Unauthorized', 401);
            }

            let decoded: any;
            try {
                const token = authHeader.split(' ')[1];
                decoded = verifyAccessToken(token);
            } catch (e) {
                return this.sendError('Invalid Token', 401);
            }

            const user = await User.findByPk(decoded.userId || decoded.sub);
            if (!user) {
                return this.sendError('User not found', 401);
            }

            // Enforce Onboarding
            const onboardingError = await this.checkOnboarding(user);
            if (onboardingError) return onboardingError;

            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'product.manage');
                if (!hasPerm) return this.sendError('Forbidden: Missing product.manage Permission', 403);
            }

            if (!['vendor', 'admin', 'super_admin'].includes(user.user_type)) {
                return this.sendError('Forbidden: Only vendors and admins can bulk create products', 403);
            }

            // Parse Form Data
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            const vendorId = formData.get('vendorId') as string | null;

            if (!file) {
                return this.sendError('CSV file is required in "file" field', 400);
            }

            // Determine vendor ownership
            let finalVendorId: string | null = null;
            if (user.user_type === 'vendor') {
                finalVendorId = user.id;
            } else if (vendorId) {
                const targetVendor = await User.findByPk(vendorId);
                if (!targetVendor || targetVendor.user_type !== 'vendor') {
                    return this.sendError('Invalid vendorId provided', 400);
                }
                finalVendorId = vendorId;
            }

            // Read file content
            const fileBuffer = await file.arrayBuffer();
            const fileContent = new TextDecoder('utf-8').decode(fileBuffer);

            // Parse CSV
            const records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            }) as any[];

            if (!records || records.length === 0) {
                return this.sendError('CSV file is empty', 400);
            }

            const created: any[] = [];
            const errors: any[] = [];

            for (let i = 0; i < records.length; i++) {
                try {
                    // Map CSV fields to schema
                    const row = records[i];
                    const productData = {
                        name: row.name,
                        description: row.description,
                        sku: row.sku,
                        base_price: row.base_price ? parseFloat(row.base_price) : undefined,
                        category_id: row.category_id ? parseInt(row.category_id) : undefined,
                        vendor_id: finalVendorId,
                    };

                    const validated = createProductSchema.parse(productData);

                    const product = await Product.create({
                        ...validated,
                        vendor_id: finalVendorId as string,
                        status: ProductStatus.DRAFT,
                    });
                    created.push(product);
                } catch (err: any) {
                    errors.push({ index: i + 1, error: err.message || 'Validation failed' });
                }
            }

            return this.sendSuccess({
                count: created.length,
                products: created,
                errors,
            }, 'Bulk create directly from CSV completed', 201);

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }



    /**
     * delete
     * DELETE /api/v1/products/:id
     */
    async delete(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const id = params.id;
            if (!id) return this.sendError('Invalid ID', 400);

            const { product, user, error } = await this.verifyProductAccess(req, id);
            if (error) return error;

            // Soft delete
            await product.destroy();

            return this.sendSuccess(null, 'Product deleted', 200);

        } catch (error) {
            return this.sendError(error instanceof Error ? error.message : 'Delete failed', 500);
        }
    }
    /**
     * approve
     * PATCH /api/v1/admin/products/:id/approval
     * Admin only: Approve or Reject a product
     */
    async approve(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const user = await this.getUserFromRequest(req);
            if (!user) return this.sendError('Unauthorized', 401);

            if (!['admin', 'super_admin'].includes(user.user_type)) {
                return this.sendError('Forbidden', 403);
            }

            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'product.manage');
                if (!hasPerm) return this.sendError('Forbidden: Missing product.manage Permission', 403);
            }

            const productId = params.id;
            const body = await req.json();
            const { status, rejection_reason } = body; // 'approved' or 'rejected'

            if (!status) {
                return this.sendError('Status is required', 400);
            }

            const normalizedStatus = status.toLowerCase();

            if (!['approved', 'rejected'].includes(normalizedStatus)) {
                return this.sendError('Invalid status. Must be approved or rejected.', 400);
            }

            const product = await Product.findByPk(productId);
            if (!product) {
                return this.sendError('Product not found', 404);
            }

            // Update Status
            product.approval_status = normalizedStatus as 'approved' | 'rejected';

            if (normalizedStatus === 'approved') {
                product.approval_status = 'approved';
                product.rejection_reason = undefined; // Clear previous rejection reason
            } else if (normalizedStatus === 'rejected') {
                product.status = ProductStatus.REJECTED;
                product.rejection_reason = rejection_reason || 'No reason provided';
            }

            // Audit
            product.reviewed_by = user.id;
            product.reviewed_at = new Date();

            await product.save();

            return this.sendSuccess(await this.formatProduct(product), `Product ${status} successfully`);

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * toggleAttributes
     * PATCH /api/v1/admin/products/:id/attributes
     * Toggle is_featured and is_top_selling flags
     */
    async toggleAttributes(req: NextRequest, { params }: { params: { id: string } }) {
        try {
            const user = await this.getUserFromRequest(req);
            if (!user) return this.sendError('Unauthorized', 401);

            if (!['admin', 'super_admin'].includes(user.user_type)) {
                return this.sendError('Forbidden: Only admins can update attributes', 403);
            }

            if (user.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user.id, 'product.manage');
                if (!hasPerm) return this.sendError('Forbidden: Missing product.manage Permission', 403);
            }

            const { id } = params;
            const body = await req.json();
            const { is_featured, is_top_selling } = body;

            // Fetch Product with Media check
            const product = await Product.findByPk(id, {
                include: [{ model: ProductMedia, as: 'media' }]
            });

            if (!product) {
                return this.sendError('Product not found', 404);
            }

            // Invisibility for unpublished products
            if (product.status !== ProductStatus.PUBLISHED && product.status !== ProductStatus.OUT_OF_STOCK) {
                return this.sendError('Product not available for review (Draft/Inactive status)', 403);
            }

            // Validation: Must have at least one image/media to be featured/top selling
            // Only apply this check if we are turning ON one of the flags
            if ((is_featured === true || is_top_selling === true)) {
                const mediaCount = await ProductMedia.count({ where: { product_id: id } });
                if (mediaCount === 0) {
                    return this.sendError('Product must have at least one image to be marked as Featured or Top Selling', 400);
                }
            }

            // Validation: Max 15 Featured limit
            if (is_featured === true && product.is_featured !== true) {
                const featuredCount = await Product.count({ where: { is_featured: true } });
                if (featuredCount >= 15) {
                    return this.sendError('Maximum limit of 15 Featured products reached. Please unmark another product first.', 400);
                }
            }

            // Validation: Max 15 Top Selling limit
            if (is_top_selling === true && product.is_top_selling !== true) {
                const topSellingCount = await Product.count({ where: { is_top_selling: true } });
                if (topSellingCount >= 15) {
                    return this.sendError('Maximum limit of 15 Top Selling products reached. Please unmark another product first.', 400);
                }
            }

            // Update fields if provided
            if (is_featured !== undefined) product.is_featured = is_featured;
            if (is_top_selling !== undefined) product.is_top_selling = is_top_selling;

            await product.save();

            return this.sendSuccess(product, 'Product attributes updated successfully');

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }
}
