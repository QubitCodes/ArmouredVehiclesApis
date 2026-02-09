import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { Order, OrderItem, User, Product, Address, UserProfile, Category, Invoice, sequelize } from '../models'; // Added sequelize and Invoice
import { Op, literal } from 'sequelize';
import { FinanceService } from '../services/FinanceService';
import { getFileUrl } from '../utils/fileUrl';
import { PermissionService } from '../services/PermissionService';
import { InvoiceService } from '../services/InvoiceService';

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
                // Match resolved column names
                group: ['order_group_id', ...includeForScope.map(() => sequelize.col('items.id')), ...includeForScope.map(() => sequelize.col('items.product.id')), ...includeForScope.map(() => sequelize.col('items.product.category.id'))],
                order: [[sequelize.fn('MAX', sequelize.col('created_at')), 'DESC']],
                limit,
                offset,
            });

            // Count Query (Distinct Groups)
            const totalGroups = await Order.count({
                where,
                include: includeForScope.length > 0 ? includeForScope : undefined,
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
                // Calculate combined totals for the group
                const groupTotal = group.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
                const groupCommission = group.reduce((sum, o) => sum + Number(o.admin_commission || 0), 0);

                // Update mainOrder with group totals for Admin view
                mainOrder.total_amount = groupTotal;
                mainOrder.admin_commission = groupCommission;

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
                        },
                        { model: Invoice, as: 'invoices' } // Include invoices to check for consolidated ones
                    ]
                });
            }

            if (!order) return controller.sendError('Order not found', 404);

            // Calculate Platform-wide Group Totals if Admin
            const orderJson = order.toJSON() as any;

            if (user!.user_type !== 'vendor' && order.order_group_id) {
                const groupedOrders = await Order.findAll({
                    where: { order_group_id: order.order_group_id },
                    include: [
                        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', include: ['media'] }] }
                    ]
                });

                orderJson.group_total_amount = groupedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
                orderJson.group_vat_amount = groupedOrders.reduce((sum, o) => sum + Number(o.vat_amount || 0), 0);
                orderJson.group_admin_commission = groupedOrders.reduce((sum, o) => {
                    const total = Number(o.total_amount || 0);
                    const percent = Number(o.admin_commission || 0);
                    return sum + (total * (percent / 100));
                }, 0);
            }

            // Role-specific Total Overrides
            if (user!.user_type === 'vendor') {
                // If the user is a vendor, we calculate the "Vendor Share" totals
                // total_amount = base_price sum + shipping + packing + vat_on_vendor_share
                const items = orderJson.items || [];
                const subtotalBase = items.reduce((sum: number, item: any) => sum + (Number(item.base_price || 0) * item.quantity), 0);
                const shipping = Number(orderJson.total_shipping || 0);
                const packing = Number(orderJson.total_packing || 0);

                // Recalculate VAT on the Vendor Share (Base Price + Shipping + Packing)
                const vatRate = 0.05; // Fixed 5% as per system requirements
                const recalculatedVat = (subtotalBase + shipping + packing) * vatRate;
                const vendorTotal = subtotalBase + shipping + packing + recalculatedVat;

                orderJson.total_amount = vendorTotal.toFixed(2);
                orderJson.vat_amount = recalculatedVat.toFixed(2);
                orderJson.is_vendor_view = true;
            } else {
                // For Admin, we provide the calculated commission amount for the specific sub-order
                const total = Number(orderJson.total_amount || 0);
                const percent = Number(orderJson.admin_commission || 0);
                orderJson.calculated_admin_commission = (total * (percent / 100)).toFixed(2);
            }

            // Transform Main Order Images and prepare for response
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

            // Attach Grouped Orders if Admin
            if (user!.user_type !== 'vendor' && order.order_group_id) {
                const groupedOrdersDetails = await Order.findAll({
                    where: { order_group_id: order.order_group_id },
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

                orderJson.grouped_orders = groupedOrdersDetails.map((sub: any) => {
                    const subJson = sub.toJSON();
                    // Process images for sub-orders...
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
                    // Calculate individual sub-order commission for admin view
                    const sTotal = Number(subJson.total_amount || 0);
                    const sPercent = Number(subJson.admin_commission || 0);
                    subJson.calculated_admin_commission = (sTotal * (sPercent / 100)).toFixed(2);
                    return subJson;
                });
            }

            return controller.sendSuccess(orderJson);

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
            let {
                order_status, // mapped to 'status' in DB usually? Old file uses 'status'
                status, // Support both
                payment_status,
                shipment_status,
                transaction_details,
                shipment_details,
                tracking_number,
                shipment_id,
                label_url,
                invoice_comments // Optional invoice comments for approval
            } = body;

            // Map legacy statuses if frontend sends them
            // Legacy normalization removed

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

                    const hasControlledItems = (sensitiveCheck.items || []).some((i: any) => i.product?.category?.is_controlled === true);

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

            // Store previous values for comparison
            const prevOrderStatus = order.order_status;
            const prevPaymentStatus = order.payment_status;
            const prevShipmentStatus = order.shipment_status;

            // --- FINANCIAL LOGIC ---
            // --- FINANCIAL LOGIC ---
            // 1. Lock Funds - MOVED TO PAYMENT EVENT (Below)
            // DISABLED LEGACY LOGIC:
            /*
            if (shipment_status === 'shipped' && (order.shipment_status as string) !== 'shipped') {
                if (order.payment_status === 'paid' && order.vendor_id) {
                     // ... 
                }
            }
            */

            // 1. Lock Funds Trigger: (Order becomes APPROVED AND is PAID)
            const isBecomingApproved = (effectiveStatus === 'approved' && order.order_status !== 'approved');
            const isBecomingPaid = (payment_status === 'paid' && prevPaymentStatus !== 'paid');
            const currentStatus = effectiveStatus || order.order_status;
            const currentPaymentStatus = payment_status || order.payment_status;

            if ((isBecomingApproved && currentPaymentStatus === 'paid') || (isBecomingPaid && currentStatus === 'approved')) {
                try {
                    const total = Number(order.total_amount);

                    // NEW LOGIC: Vendor gets exactly their Share (Base + Shipping + Packing + VAT on net)
                    // Admin gets the remainder (Markup + VAT on Markup)
                    const items = await OrderItem.findAll({ where: { order_id: order.id } });
                    const subtotalBase = items.reduce((sum: number, item: any) => sum + (Number(item.base_price || 0) * item.quantity), 0);
                    const shipping = Number(order.total_shipping || 0);
                    const packing = Number(order.total_packing || 0);
                    const vatRate = 0.05; // 5% VAT

                    const vendorTaxable = subtotalBase + shipping + packing;
                    const vendorVat = vendorTaxable * vatRate;
                    const vendorEarning = vendorTaxable + vendorVat; // AED 157.50 in the user's scenario

                    const adminCommissionAmount = total - vendorEarning; // The remainder (Markup)

                    // Find a valid Admin to receive the commission
                    const { Op } = require('sequelize');
                    const adminUser = await User.findOne({
                        where: {
                            user_type: { [Op.or]: ['admin', 'super_admin'] }
                        },
                        order: [['user_type', 'DESC']] // Prefer super_admin
                    });

                    // Target Vendor setup
                    const targetVendorId = order.vendor_id && order.vendor_id !== 'admin'
                        ? order.vendor_id
                        : adminUser?.id;

                    // 1. Credit Vendor Earning
                    if (targetVendorId) {
                        await FinanceService.creditWallet(
                            targetVendorId,
                            vendorEarning,
                            'vendor_earning',
                            `Earning for Order #${order.order_id}`,
                            { orderId: order.id },
                            order.user_id,
                            true, // LOCKED
                            order.id
                        );
                        console.log(`[AdminOrder] Credited Vendor ${targetVendorId}: ${vendorEarning} (LOCKED)`);
                    }

                    // 2. Credit Admin Commission (Must go to Admin Wallet, NOT Vendor Wallet)
                    // Ensure adminUser is NOT the same as targetVendorId if possible
                    if (adminCommissionAmount > 0 && adminUser && adminUser.id !== targetVendorId) {
                        await FinanceService.creditWallet(
                            adminUser.id,
                            adminCommissionAmount,
                            'commission',
                            `Commission for Order #${order.order_id}`,
                            { orderId: order.id },
                            order.vendor_id,
                            true, // LOCKED - Unlocked on delivery
                            order.id
                        );
                        console.log(`[AdminOrder] Credited Admin ${adminUser.id}: ${adminCommissionAmount} (LOCKED)`);
                    } else if (adminCommissionAmount > 0 && adminUser) {
                        // If vendor IS the admin, we still record it but as the platform's earn
                        console.log(`[AdminOrder] Admin is same as Vendor, skipping separate commission credit to avoid double-charging or same-wallet redundancy if logic allows.`);
                    }
                } catch (finError) {
                    console.error('[AdminOrder] Financial Locking logic failed:', finError);
                }
            }

            // 2. Delivery Event (Unlock Funds)
            // Trigger: Shipment becomes 'delivered'
            if (shipment_status === 'delivered' && prevShipmentStatus !== 'delivered') {
                try {
                    const unlocked = await FinanceService.unlockFundsForOrder(order.id);
                    if (unlocked > 0) {
                        console.log(`[AdminOrder] Unlocked ${unlocked} funds for Order ${order.id}`);
                    } else {
                        console.log(`[AdminOrder] No locked funds found/unlocked for Order ${order.id}`);
                    }
                } catch (unlockError) {
                    console.error('[AdminOrder] Unlock funds failed:', unlockError);
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
            if (invoice_comments !== undefined) order.invoice_comments = invoice_comments;


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

            // --- INVOICE GENERATION LOGIC ---
            let generatedInvoice = null;
            let updatedAdminInvoice = null;

            try {
                const { InvoiceService } = await import('../services/InvoiceService');
                // --- INVOICE GENERATION LOGIC ---
                // Rule 1: Generate BOTH invoices when the order is approved
                const isNowApproved = effectiveStatus === 'approved' && prevOrderStatus !== 'approved';
                const isPaid = (payment_status === 'paid') || (order.payment_status === 'paid');
                const isPaymentJustPaid = payment_status === 'paid' && prevPaymentStatus !== 'paid';

                // Condition for generation: Newly approved and paid, OR just paid (regardless of approval status, as per requirement)
                // We want to ensure that if it becomes paid, we generate the invoice. 
                // Checks:
                // 1. Just became PAID (isPaymentJustPaid)
                // 2. Just became APPROVED and is already PAID (isNowApproved && isPaid)

                if (isPaymentJustPaid || (isNowApproved && isPaid)) {
                    // Check for invoices at the GROUP level to prevent duplicates
                    const existingInvoices = order.order_group_id
                        ? await InvoiceService.getInvoicesByGroupId(order.order_group_id)
                        : await InvoiceService.getInvoicesByOrderId(order.id);

                    // 1. Customer Invoice (Paid)
                    const custInvoice = existingInvoices.find(i => i.invoice_type === 'customer');
                    if (!custInvoice) {
                        // Consolidate Invoice (Safe to call even if triggered by sub-order)
                        generatedInvoice = await InvoiceService.generateCustomerInvoice(order.id, invoice_comments || order.invoice_comments, 'paid');
                        console.log(`Generated customer invoice (Payment/Approval Trigger): ${generatedInvoice?.invoice_number}`);
                    } else if (custInvoice.payment_status !== 'paid' && isPaid) {
                        const updated = await InvoiceService.markCustomerInvoicePaid(order.id);
                        if (updated) generatedInvoice = updated;
                    }

                    // 2. Admin/Vendor Invoice (Unpaid initially)
                    // Admin invoice usually requires Approval + Payment, or just Approval? 
                    // Requirement: "Admin → Customer was generated... as soon as a customer completes payment"
                    // We'll keep Admin invoice aligned with Customer invoice generation for now, 
                    // but it might strictly depend on 'approved' status for validity. 
                    // However, if paid, it implies a level of validity. Let's generate it to be safe.
                    const adminInvoice = existingInvoices.find(i => i.invoice_type === 'admin');
                    if (!adminInvoice && order.vendor_id && order.vendor_id !== 'admin') {
                        const newAdminInvoice = await InvoiceService.generateAdminInvoice(order.id, invoice_comments || order.invoice_comments);
                        console.log(`Generated admin invoice: ${newAdminInvoice?.invoice_number}`);
                        if (!generatedInvoice) generatedInvoice = newAdminInvoice;
                    }
                }

                // Rule 2: Mark Admin Invoice as PAID only when delivered
                const isNowDelivered = shipment_status === 'delivered' && prevShipmentStatus !== 'delivered';
                if (isNowDelivered) {
                    const updated = await InvoiceService.markAdminInvoicePaid(order.id);
                    if (updated) {
                        console.log(`Marked admin invoice as paid for order: ${order.id}`);
                        if (!generatedInvoice) generatedInvoice = updated;
                    }
                }
            } catch (invoiceError) {
                console.error('Invoice operation failed:', invoiceError);
                // Continue without failing the order update
            }

            return controller.sendSuccess({
                message: 'Order updated',
                order,
                invoice: generatedInvoice ? {
                    id: generatedInvoice.id,
                    invoice_number: generatedInvoice.invoice_number,
                    type: generatedInvoice.invoice_type
                } : undefined
            });

        } catch (error: any) {
            return new AdminOrderController().sendError(error.message, 500);
        }
    }

    /**
     * POST /api/v1/admin/orders/:id/invoice
     * Manually trigger generation of Consolidated Customer Invoice
     */
    static async generateInvoice(req: NextRequest, { params }: { params: any }) {
        try {
            const controller = new AdminOrderController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin') {
                return controller.sendError('Forbidden', 403);
            }

            // Permission Check
            if (user!.user_type === 'admin') {
                const permissionService = new PermissionService();
                const hasManage = await permissionService.hasPermission(user!.id, 'order.manage');
                const hasControlled = await permissionService.hasPermission(user!.id, 'order.controlled.approve');

                if (!hasManage && !hasControlled) {
                    return controller.sendError('Forbidden: Missing permissions', 403);
                }
            }

            const { id } = await params;
            // Parse body safely
            let comments = null;
            try {
                const body = await req.json();
                comments = body.comments;
            } catch (e) {
                // Ignore JSON parse error, body might be empty
            }

            const order = await Order.findByPk(id);
            if (!order) return controller.sendError('Order not found', 404);

            // Generate Customer Invoice (Consolidated by Group ID logic inside service)
            // Force 'paid' status as this is an admin override action
            const invoice = await InvoiceService.generateCustomerInvoice(order.id, comments || null, 'paid');

            return controller.sendSuccess({
                message: 'Customer invoice generated successfully',
                invoice: {
                    id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    type: invoice.invoice_type
                }
            });

        } catch (error: any) {
            console.error('Manual Invoice Generation Error:', error);
            // Return success even if duplicate to handle idempotency gracefully if needed, 
            // but here we let the error propagate if it's a real failure. 
            return new AdminOrderController().sendError(error.message, 500);
        }
    }
}
