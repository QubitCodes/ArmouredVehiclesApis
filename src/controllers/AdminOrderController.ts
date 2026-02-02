import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { Order, OrderItem, User, Product, Address, UserProfile, Category, sequelize } from '../models'; // Added sequelize
import { Op, literal } from 'sequelize';
import { FinanceService } from '../services/FinanceService';
import { getFileUrl } from '../utils/fileUrl';
import { PermissionService } from '../services/PermissionService';

export class AdminOrderController extends BaseController {

    /**
     * GET /api/v1/admin/orders
     */
    static async getOrders(req: NextRequest) {
        try {
            const controller = new AdminOrderController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            // --- Permission & Visibility Logic ---
            let canViewAll = true;
            let canViewControlled = false;

            if (user!.user_type === 'super_admin') {
                canViewAll = true;
                canViewControlled = true;
            } else if (user!.user_type === 'admin') {
                const permissionService = new PermissionService();
                canViewAll = await permissionService.hasPermission(user!.id, 'order.view');
                canViewControlled = await permissionService.hasPermission(user!.id, 'order.controlled.approve');

                if (!canViewAll && !canViewControlled) {
                    return controller.sendError('Forbidden: Missing order.view or order.controlled.approve', 403);
                }
            } else if (user!.user_type === 'vendor') {
                canViewAll = false; // Vendors generally only see their own
            }

            const searchParams = req.nextUrl.searchParams;
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            const status = searchParams.get('status');
            const paymentStatus = searchParams.get('payment_status');
            const shipmentStatus = searchParams.get('shipment_status');
            const search = searchParams.get('search') || searchParams.get('q');

            // Vendor Logic: Verify ownership or filter by self
            let vendorIdFilter: string | null = searchParams.get('vendor_id');
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

            if (user!.user_type === 'vendor') {
                vendorIdFilter = user!.id; // Force vendor to only see their own
            } else if (vendorIdFilter && !uuidRegex.test(vendorIdFilter)) {
                // If admin passes "admin" or garbage, treat as no-filter (Universal View)
                vendorIdFilter = null;
            }

            const where: any = {};
            if (status) where.order_status = status;
            if (paymentStatus) where.payment_status = paymentStatus;
            if (shipmentStatus) where.shipment_status = shipmentStatus;

            // Apply Vendor Filter to the WHERE clause if strict filtering is active
            if (vendorIdFilter) {
                where.vendor_id = vendorIdFilter;
            }

            // Search Logic
            if (search) {
                const isUuid = uuidRegex.test(search);
                if (isUuid) {
                    where.id = search;
                } else {
                    where[Op.or] = [
                        { order_id: { [Op.iLike]: `%${search}%` } },
                        { order_group_id: { [Op.iLike]: `%${search}%` } }
                    ];
                }
            }

            // --- Restricted Visibility Filter (Admin Only) ---
            const includeForScope: any[] = [];

            if (user!.user_type === 'admin' && !canViewAll && canViewControlled) {
                // Must filter orders that contain Controlled Items
                // We use an Include with Required: true (Inner Join logic effectively)
                // Filter: Item -> Product -> Category(is_controlled=true)
                includeForScope.push({
                    model: OrderItem,
                    as: 'items',
                    required: true,
                    include: [{
                        model: Product,
                        as: 'product',
                        required: true,
                        include: [{
                            model: Category,
                            as: 'category',
                            required: true, // Need to match category
                            where: { is_controlled: true }
                        }]
                    }]
                });
            }

            // --- STEP 1: Fetch Unique Group IDs (Pagination Target) ---
            // We paginate based on Groups. We must ORDER BY an aggregate to satisfy GROUP BY rules.

            const groupRows = await Order.findAll({
                attributes: ['order_group_id'],
                where,
                include: includeForScope.length > 0 ? includeForScope : undefined,
                // Match generated alias "Order"
                group: ['order_group_id', ...includeForScope.map(() => 'items.id'), ...includeForScope.map(() => 'items->product.id'), ...includeForScope.map(() => 'items->product->category.id')],
                order: [[sequelize.fn('MAX', sequelize.col('Order.created_at')), 'DESC']],
                limit,
                offset,
            });

            if (user!.user_type === 'admin' && !canViewAll && canViewControlled) {
                // Apply Literal Filter to `where`
                // "Order has at least one item that is controlled"
                // Assuming standard naming convention: order_items, products, categories
                // Match exact table naming and alias "Order"
                where[Op.and] = [
                    literal(`EXISTS (
                        SELECT 1 FROM "order_items" AS "oi"
                        JOIN "products" AS "p" ON "oi"."product_id" = "p"."id"
                        JOIN "categories" AS "c" ON "p"."category_id" = "c"."id"
                        WHERE "oi"."order_id" = "Order"."id"
                        AND "c"."is_controlled" = true
                    )`)
                ];
            }

            // Count Query (Distinct Groups)
            const totalGroups = await Order.count({
                where,
                distinct: true,
                col: 'order_group_id'
            });

            const targetGroupIds = groupRows.map((r: any) => r.order_group_id);

            if (targetGroupIds.length === 0) {
                return controller.sendSuccess([], 'Orders retrieved', 200, {
                    total: 0,
                    page,
                    limit,
                    pages: 0
                });
            }

            // --- STEP 2: Fetch All Orders for these Groups ---

            const expandedWhere: any = {
                order_group_id: { [Op.in]: targetGroupIds }
            };

            if (vendorIdFilter) {
                expandedWhere.vendor_id = vendorIdFilter;
            }

            const allSubOrders = await Order.findAll({
                where: expandedWhere,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: User,
                        as: 'vendor',
                        attributes: ['name'],
                        include: [{ model: UserProfile, as: 'profile', attributes: ['company_name'] }]
                    },
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [
                            { model: Product, as: 'product', include: ['media'] }
                        ]
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            // --- STEP 3: Group Logic ---

            const groupsMap: Record<string, Order[]> = {};
            targetGroupIds.forEach((gid: string) => { groupsMap[gid] = []; });

            allSubOrders.forEach(o => {
                if (o.order_group_id && groupsMap[o.order_group_id]) {
                    groupsMap[o.order_group_id].push(o);
                }
            });

            // Construct Final Response List
            const responseList = targetGroupIds.map((gid: string) => {
                const group = groupsMap[gid];
                if (!group || group.length === 0) return null;

                // The "Main" order to display in the table row (Latest one)
                // Since sub-orders are sorted by created_at DESC, the first one is the latest.
                const mainOrder = group[0].toJSON() as any;

                // Transform Images
                if (mainOrder.items) {
                    mainOrder.items = mainOrder.items.map((item: any) => {
                        if (item.product) {
                            let imageUrl = null;
                            if (item.product.media && item.product.media.length > 0) {
                                const cover = item.product.media.find((m: any) => m.is_cover);
                                imageUrl = cover ? cover.url : item.product.media[0].url;
                            }
                            item.product.image = getFileUrl(imageUrl || item.product.image);
                        }
                        if (item.image) {
                            item.image = getFileUrl(item.image);
                        }
                        return item;
                    });
                }

                // Attach the cluster
                // @ts-ignore
                mainOrder.grouped_orders = group.map((sub: any) => {
                    const subJson = sub.toJSON();
                    // Transform Sub Order Images too
                    if (subJson.items) {
                        subJson.items = subJson.items.map((item: any) => {
                            if (item.product) {
                                let imageUrl = null;
                                if (item.product.media && item.product.media.length > 0) {
                                    const cover = item.product.media.find((m: any) => m.is_cover);
                                    imageUrl = cover ? cover.url : item.product.media[0].url;
                                }
                                item.product.image = getFileUrl(imageUrl || item.product.image);
                            }
                            if (item.image) item.image = getFileUrl(item.image);
                            return item;
                        });
                    }
                    return subJson;
                });
                // @ts-ignore
                mainOrder.sub_order_count = group.length;

                return mainOrder;
            }).filter(Boolean);


            return controller.sendSuccess(responseList, 'Orders retrieved', 200, {
                total: totalGroups,
                page,
                limit,
                pages: Math.ceil(totalGroups / limit)
            });

        } catch (error: any) {
            return new AdminOrderController().sendError(error.message, 500);
        }
    }

    /**
     * GET /api/v1/admin/orders/:id
     */
    static async getOrder(req: NextRequest, { params }: { params: any }) {
        try {
            const controller = new AdminOrderController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            if (user!.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user!.id, 'order.view');
                if (!hasPerm) return controller.sendError('Forbidden: Missing order.view Permission', 403);
            }

            const { id } = await params;

            let order: any;

            // Vendor specific fetch: Only items belonging to them
            if (user!.user_type === 'vendor') {
                order = await Order.findOne({
                    where: { id },
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
                        {
                            model: OrderItem,
                            as: 'items',
                            required: true,
                            where: { vendor_id: user!.id },
                            include: [{ model: Product, as: 'product', include: ['media'] }]
                        }
                    ]
                });
            } else {
                // Admin fetch: Full view
                order = await Order.findByPk(id, {
                    include: [
                        { model: User, as: 'user', attributes: ['name', 'email', 'phone', 'country_code', 'username', 'user_type'] }, // Added fields for frontend
                        {
                            model: User,
                            as: 'vendor',
                            attributes: ['id', 'name', 'email', 'username'],
                            include: [{ model: UserProfile, as: 'profile', attributes: ['company_name'] }]
                        },
                        {
                            model: OrderItem,
                            as: 'items',
                            include: [{ model: Product, as: 'product', include: ['media'] }]
                        }
                    ]
                });
            }

            if (!order) return controller.sendError('Order not found', 404);

            // Fetch Grouped Orders if this is part of a group (and User is Admin)
            if (user!.user_type !== 'vendor' && order.order_group_id) {
                const groupedOrders = await Order.findAll({
                    where: {
                        order_group_id: order.order_group_id
                    },
                    include: [
                        { model: User, as: 'user', attributes: ['name', 'email', 'phone'] },
                        {
                            model: User,
                            as: 'vendor',
                            attributes: ['id', 'name', 'email', 'username'],
                            include: [{ model: UserProfile, as: 'profile', attributes: ['company_name'] }]
                        },
                        {
                            model: OrderItem,
                            as: 'items',
                            include: [{ model: Product, as: 'product', include: ['media'] }]
                        }
                    ],
                    order: [['created_at', 'DESC']]
                });

                // Attach to response
                const orderJson = order.toJSON() as any;

                // Transform Main Order Images
                if (orderJson.items) {
                    orderJson.items = orderJson.items.map((item: any) => {
                        if (item.product) {
                            let imageUrl = null;
                            if (item.product.media && item.product.media.length > 0) {
                                const cover = item.product.media.find((m: any) => m.is_cover);
                                imageUrl = cover ? cover.url : item.product.media[0].url;
                            }
                            item.product.image = getFileUrl(imageUrl || item.product.image);
                        }
                        if (item.image) item.image = getFileUrl(item.image);
                        return item;
                    });
                }

                orderJson.grouped_orders = groupedOrders.map((sub: any) => {
                    const subJson = sub.toJSON();
                    if (subJson.items) {
                        subJson.items = subJson.items.map((item: any) => {
                            if (item.product) {
                                let imageUrl = null;
                                if (item.product.media && item.product.media.length > 0) {
                                    const cover = item.product.media.find((m: any) => m.is_cover);
                                    imageUrl = cover ? cover.url : item.product.media[0].url;
                                }
                                item.product.image = getFileUrl(imageUrl || item.product.image);
                            }
                            if (item.image) item.image = getFileUrl(item.image);
                            return item;
                        });
                    }
                    return subJson;
                });
                return controller.sendSuccess(orderJson);
            }

            const singleOrderJson = order.toJSON() as any;
            if (singleOrderJson.items) {
                singleOrderJson.items = singleOrderJson.items.map((item: any) => {
                    if (item.product) {
                        let imageUrl = null;
                        if (item.product.media && item.product.media.length > 0) {
                            const cover = item.product.media.find((m: any) => m.is_cover);
                            imageUrl = cover ? cover.url : item.product.media[0].url;
                        }
                        item.product.image = getFileUrl(imageUrl || item.product.image);
                    }
                    if (item.image) item.image = getFileUrl(item.image);
                    return item;
                });
            }

            return controller.sendSuccess(singleOrderJson);

        } catch (error: any) {
            return new AdminOrderController().sendError(error.message, 500);
        }
    }

    /**
     * GET /api/v1/admin/vendors/:id/orders
     */
    static async getVendorOrders(req: NextRequest, { params }: { params: any }) {
        try {
            const controller = new AdminOrderController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            // Only Admin/SuperAdmin can verify other vendors
            if (!['admin', 'super_admin'].includes(user!.user_type)) {
                return controller.sendError('Forbidden', 403);
            }

            if (user!.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user!.id, 'order.view');
                if (!hasPerm) return controller.sendError('Forbidden: Missing order.view Permission', 403);
            }

            const { id } = await params; // Vendor ID
            const { searchParams } = new URL(req.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            const where: any = {};

            const { count, rows } = await Order.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'user', attributes: ['name', 'email'] },
                    {
                        model: OrderItem,
                        as: 'items',
                        required: true,
                        where: { vendor_id: id },
                        include: [{ model: Product, as: 'product', include: ['media'] }]
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset,
                distinct: true
            });

            const mappedRows = rows.map((r: any) => {
                const rJson = r.toJSON();
                if (rJson.items) {
                    rJson.items = rJson.items.map((item: any) => {
                        if (item.product) {
                            let imageUrl = null;
                            if (item.product.media && item.product.media.length > 0) {
                                const cover = item.product.media.find((m: any) => m.is_cover);
                                imageUrl = cover ? cover.url : item.product.media[0].url;
                            }
                            item.product.image = getFileUrl(imageUrl || item.product.image);
                        }
                        if (item.image) item.image = getFileUrl(item.image);
                        return item;
                    });
                }
                return rJson;
            });

            return controller.sendSuccess(mappedRows, 'Vendor orders retrieved', 200, {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            });

        } catch (error: any) {
            return new AdminOrderController().sendError(error.message, 500);
        }
    }

    /**
     * GET /api/v1/admin/vendors/:id/orders/:orderId
     */
    static async getVendorOrder(req: NextRequest, { params }: { params: any }) {
        try {
            const controller = new AdminOrderController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            if (!['admin', 'super_admin'].includes(user!.user_type)) {
                return controller.sendError('Forbidden', 403);
            }

            if (user!.user_type === 'admin') {
                const hasPerm = await new PermissionService().hasPermission(user!.id, 'order.view');
                if (!hasPerm) return controller.sendError('Forbidden: Missing order.view Permission', 403);
            }

            const { id, orderId } = await params;

            const order = await Order.findOne({
                where: { id: orderId },
                include: [
                    { model: User, as: 'user', attributes: ['name', 'email'] },
                    {
                        model: OrderItem,
                        as: 'items',
                        required: true,
                        where: { vendor_id: id },
                        include: [{ model: Product, as: 'product', include: ['media'] }]
                    }
                ]
            });

            if (!order) return controller.sendError('Order not found', 404);

            const orderJson = order.toJSON() as any;
            if (orderJson.items) {
                orderJson.items = orderJson.items.map((item: any) => {
                    if (item.product) {
                        let imageUrl = null;
                        if (item.product.media && item.product.media.length > 0) {
                            const cover = item.product.media.find((m: any) => m.is_cover);
                            imageUrl = cover ? cover.url : item.product.media[0].url;
                        }
                        item.product.image = getFileUrl(imageUrl || item.product.image);
                    }
                    if (item.image) item.image = getFileUrl(item.image);
                    return item;
                });
            }

            return controller.sendSuccess(orderJson);

        } catch (error: any) {
            return new AdminOrderController().sendError(error.message, 500);
        }
    }

    /**
     * PATCH /api/v1/admin/orders/:id
     */
    static async updateOrder(req: NextRequest, { params }: { params: any }) {
        try {
            const controller = new AdminOrderController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            if (user!.user_type === 'admin') {
                const permissionService = new PermissionService();
                // Basic Manage Perm
                const hasManage = await permissionService.hasPermission(user!.id, 'order.manage');

                const hasControlled = await permissionService.hasPermission(user!.id, 'order.controlled.approve');

                if (!hasManage && !hasControlled) {
                    return controller.sendError('Forbidden: Missing permissions', 403);
                }

                // We defer the strict check to after we fetch the order and inspect it.
            }

            const { id } = await params;
            const body = await req.json();
            const {
                order_status, // mapped to 'status' in DB usually? Old file uses 'status'
                status, // Support both
                payment_status,
                shipment_status,
                transaction_details,
                shipment_details,
                tracking_number,
                shipment_id,
                label_url
            } = body;

            const effectiveStatus = status || order_status;

            // Fetch Order
            const order = await Order.findByPk(id);
            if (!order) return controller.sendError('Order not found', 404);

            const isVendor = user!.user_type === 'vendor';

            // Security: Vendors can only update their own orders
            if (isVendor && order.vendor_id && order.vendor_id !== user!.id) {
                return controller.sendError('Forbidden: You can only update your own orders', 403);
            }

            // --- Controlled Order Logic (Universal UAE Rule) ---
            if (user!.user_type === 'admin') {
                // Determine if Order is Controlled + UAE Customer
                // Need to fetch items + product category + customer profile
                // Order is already fetched but without deep includes.
                // We fetch check details separately to keep order object clean or just fetch needed info.

                const sensitiveCheck = await Order.findByPk(id, {
                    include: [
                        { model: User, as: 'user', include: [{ model: UserProfile, as: 'profile' }] }, // Customer
                        {
                            model: OrderItem,
                            as: 'items',
                            include: [{
                                model: Product,
                                as: 'product',
                                include: [{ model: Category, as: 'category' }]
                            }]
                        }
                    ]
                }) as any;

                if (sensitiveCheck) {
                    const customerProfile = sensitiveCheck.user?.profile;
                    const isUAECustomer = customerProfile ? ['UAE', 'United Arab Emirates'].includes(customerProfile.country) : false;

                    const hasControlledItems = sensitiveCheck.items.some((i: any) => i.product?.category?.is_controlled === true);

                    if (hasControlledItems && isUAECustomer) {
                        // Strict Permission Required
                        const hasPerm = await new PermissionService().hasPermission(user!.id, 'order.controlled.approve');
                        if (!hasPerm) {
                            return controller.sendError('Forbidden: Missing order.controlled.approve Permission for UAE Controlled Order', 403);
                        }
                    } else {
                        // General / Non-UAE
                        // Must have 'order.manage'
                        // Since we allowed 'soft' pass above, we must enforce 'order.manage' here if NOT controlled condition.
                        const hasManage = await new PermissionService().hasPermission(user!.id, 'order.manage');
                        if (!hasManage) {
                            // User maybe had `order.controlled.approve` but this is NOT a controlled situation (or not UAE).
                            return controller.sendError('Forbidden: Missing order.manage Permission for General Order', 403);
                        }
                    }
                }
            }

            // --- FINANCIAL LOGIC ---
            // 1. Lock Funds on DISPATCH (Vendor Shipped)
            if (shipment_status === 'vendor_shipped' && (order.shipment_status as string) !== 'vendor_shipped') {
                if (order.payment_status === 'paid' && order.vendor_id) {
                    const commissionRate = 0.10; // TODO: Fetch from PlatformSettings or Vendor Profile
                    const total = Number(order.total_amount);
                    const commission = total * commissionRate;
                    const vendorEarning = total - commission;

                    await FinanceService.creditWallet(
                        order.vendor_id,
                        vendorEarning,
                        'vendor_earning',
                        `Earning for Order #${order.order_id}`,
                        { orderId: order.id },
                        order.user_id, // Source is Customer
                        true, // LOCKED
                        order.id
                    );
                }
            }

            // 1. Update Fields
            if (effectiveStatus !== undefined) order.order_status = effectiveStatus;
            if (payment_status !== undefined) order.payment_status = payment_status;
            if (shipment_status !== undefined) order.shipment_status = shipment_status;

            if (transaction_details !== undefined) order.transaction_details = transaction_details;
            if (shipment_details !== undefined) order.shipment_details = shipment_details;
            if (tracking_number !== undefined) order.tracking_number = tracking_number;
            if (shipment_id !== undefined) order.shipment_id = shipment_id;
            if (label_url !== undefined) order.label_url = label_url;


            // 2. Status History
            const historyEntry = {
                status: effectiveStatus || order.order_status,
                payment_status: payment_status || order.payment_status,
                shipment_status: shipment_status || order.shipment_status,
                updated_by: user!.id,
                timestamp: new Date().toISOString(),
                note: `Order updated via Admin Panel`
            };

            const currentHistory = order.status_history || [];
            // Ensure status_history is treated as array (JSONB)
            order.status_history = [historyEntry, ...currentHistory];

            await order.save();

            return controller.sendSuccess({ message: 'Order updated', order });

        } catch (error: any) {
            return new AdminOrderController().sendError(error.message, 500);
        }
    }
}
