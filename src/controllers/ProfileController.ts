import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { User, UserProfile, Order, OrderItem, Product, Address, Cart, CartItem, ReferenceModels } from '../models';
import { getFileUrl } from '../utils/fileUrl';


/**
 * Profile Controller
 * Handles user profile view and edit operations
 */
export class ProfileController extends BaseController {

    /**
     * GET /api/v1/profile
     * Get current user profile with onboarding data
     */
    async getProfile(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const userWithProfile = await User.findByPk(user!.id, {
                include: [{
                    model: UserProfile,
                    as: 'profile',
                    include: [
                        { model: ReferenceModels.RefBuyerType, as: 'buyerType' },
                        { model: ReferenceModels.RefProcurementPurpose, as: 'procurementPurpose' },
                        { model: ReferenceModels.RefEndUserType, as: 'endUserType' },
                    ]
                }]
            });

            if (!userWithProfile) {
                return this.sendError('User not found', 404);
            }

            // Get Cart Count
            let cartCount = 0;
            const cart = await Cart.findOne({
                where: { user_id: user!.id, status: 'active' },
                include: [{ model: CartItem, as: 'items' }]
            });

            if (cart && cart.items) {
                cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
            }

            // Return merged object structure
            const userJson = userWithProfile.toJSON() as any;
            const profileJson = userJson.profile || {};

            // Ensure URLs are full URLs
            if (profileJson.govt_compliance_reg_url) {
                profileJson.govt_compliance_reg_url = getFileUrl(profileJson.govt_compliance_reg_url);
            }
            if (profileJson.contact_id_document_url) {
                profileJson.contact_id_document_url = getFileUrl(profileJson.contact_id_document_url);
            }
            if (profileJson.defense_approval_url) {
                profileJson.defense_approval_url = getFileUrl(profileJson.defense_approval_url);
            }
            if (profileJson.business_license_url) {
                profileJson.business_license_url = getFileUrl(profileJson.business_license_url);
            }

            // Remove nested profile from user object to clean it up
            delete userJson.profile;
            delete profileJson.id;
            delete profileJson.user_id;

            return this.sendSuccess({
                ...userJson,
                ...profileJson,
            }, 'Profile fetched successfully', 200, { cart_count: cartCount }, req);
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500, [], undefined, req);
        }
    }

    /**
     * PUT /api/v1/profile
     * Update user profile
     * Content-Type: application/json
     */
    async updateProfile(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const body = await req.json();
            const { name, email, phone, countryCode, avatar } = body;

            // Build update object with only provided fields
            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (countryCode !== undefined) updateData.country_code = countryCode;
            if (avatar !== undefined) updateData.avatar = avatar;

            await user!.update(updateData);

            return this.sendSuccess({
                message: 'Profile updated successfully',
                user: {
                    id: user!.id,
                    name: user!.name,
                    email: user!.email,
                    phone: user!.phone,
                    countryCode: user!.country_code,
                    avatar: user!.avatar,
                    userType: user!.user_type,
                },
            }, undefined, 200, undefined, req);
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500, [], undefined, req);
        }
    }

    /**
     * GET /api/v1/profile/orders
     * Get current user's orders
     */
    async getOrders(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const orders = await Order.findAll({
                where: { user_id: user!.id },
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            include: ['media']
                        }]
                    }
                ],
                order: [['created_at', 'DESC']]
            });


            if (orders.length === 0) {
                // Check if any orders exist at all for this user (raw query check?)
                // Maybe user_id mismatch?
            }

            const mappedOrders = orders.map(order => {
                let displayStatus: any = order.order_status;
                const internalStatus = order.order_status as string;

                // Map internal statuses to Customer-facing statuses (Snake Case for Frontend Logic)
                if (internalStatus === 'admin_rejected') {
                    displayStatus = 'rejected';
                } else {
                    displayStatus = internalStatus;
                }

                const orderJson = order.toJSON() as any;

                // Transform Images
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
                        if (item.image) {
                            item.image = getFileUrl(item.image);
                        }
                        return item;
                    });
                }

                return {
                    ...orderJson,
                    order_status: displayStatus,
                    status_label: order.order_status, // Raw internal status for debug/reference if needed
                    shipment_status: order.shipment_status,
                    original_status: internalStatus
                };
            });

            return this.sendSuccess(mappedOrders);
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * GET /api/v1/profile/orders/:id
     * Get specific order details
     */
    async getOrder(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { id } = await params;

            const order = await Order.findOne({
                where: { id, user_id: user!.id },
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            include: ['media']
                        }]
                    }
                ]
            });

            if (!order) return this.sendError('Order not found', 404);

            const profile = await UserProfile.findOne({ where: { user_id: user!.id } });

            const address = profile ? {
                name: user?.name,
                address_line1: profile.address_line1,
                city: profile.city,
                country: profile.country,
                phone: user?.phone,
                email: user?.email
            } : null;

            // Map Status for Detail View
            let displayStatus: any = order.order_status;
            const internalStatus = order.order_status as string;

            if (internalStatus === 'order_received') {
                displayStatus = 'Order Received';
            } else if (internalStatus === 'approved') {
                displayStatus = 'Approved';
            } else if (internalStatus === 'rejected' || internalStatus === 'admin_rejected') {
                displayStatus = 'Rejected';
            }

            const orderJson = order.toJSON() as any;

            // Transform Images
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
                    if (item.image) {
                        item.image = getFileUrl(item.image);
                    }
                    return item;
                });
            }

            return this.sendSuccess({
                ...orderJson,
                order_status: displayStatus,
                shipment_status: order.shipment_status,
                original_status: internalStatus,
                address
            });
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }
    /**
     * GET /api/v1/profile/orders/group/:id
     * Get details for an Order Group (all sub-orders)
     */
    async getOrderGroup(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { id } = await params;

            const { Op } = require('sequelize');

            // Build Where Clause
            const orConditions: any[] = [
                { order_group_id: id },
                { order_id: id }
            ];

            // Only check primary key 'id' if input is valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(id)) {
                orConditions.push({ id: id });
            }

            // Fetch orders
            const orders = await Order.findAll({
                where: {
                    user_id: user!.id,
                    [Op.or]: orConditions
                },
                include: [
                    {
                        model: OrderItem,
                        as: 'items',
                        include: [{
                            model: Product,
                            as: 'product',
                            include: ['media']
                        }]
                    }
                ],
                order: [['created_at', 'ASC']]
            });

            if (!orders || orders.length === 0) {
                return this.sendError('Order Group not found', 404);
            }

            // Calculate Aggregates
            const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

            // Fetch User Profile for Address (Fallback)
            const profile = await UserProfile.findOne({ where: { user_id: user!.id } });

            // Strategy: Use Order Snapshot (shipment_details) first, then Profile
            let address: any = null;

            // 1. Try Order Snapshot
            const orderWithDetails = orders.find(o => o.shipment_details && Object.keys(o.shipment_details).length > 0);
            if (orderWithDetails && orderWithDetails.shipment_details) {
                const details = orderWithDetails.shipment_details as any;
                if (details.address_line1 || details.addressLine1) {
                    address = {
                        name: details.name || user?.name,
                        address_line1: details.address_line1 || details.addressLine1,
                        address_line2: details.address_line2 || details.addressLine2,
                        city: details.city,
                        country: details.country,
                        phone: details.phone || user?.phone,
                        email: details.email || user?.email,
                        state: details.state,
                        postal_code: details.postal_code || details.postalCode
                    };
                }
            }

            // 2. Fallback to Profile
            if (!address && profile) {
                address = {
                    name: user?.name,
                    address_line1: profile.address_line1,
                    address_line2: profile.address_line2,
                    city: profile.city,
                    country: profile.country,
                    phone: user?.phone,
                    email: user?.email,
                    state: profile.state,
                    postal_code: profile.postal_code
                };
            }

            // 3. Last Resort: Check Address Book
            if (!address) {
                const savedAddress = await Address.findOne({
                    where: { user_id: user!.id },
                    order: [['is_default', 'DESC'], ['created_at', 'DESC']]
                });

                if (savedAddress) {
                    address = {
                        name: savedAddress.full_name || user?.name,
                        address_line1: savedAddress.address_line1,
                        address_line2: savedAddress.address_line2,
                        city: savedAddress.city,
                        country: savedAddress.country,
                        phone: savedAddress.phone || user?.phone,
                        email: user?.email,
                        state: savedAddress.state,
                        postal_code: savedAddress.postal_code
                    };
                }
            }

            // 4. Temporary Fallback (Requested by User)
            if (!address) {
                address = {
                    name: user?.name || "Valued Customer",
                    address_line1: "Business Bay, Tower A",
                    address_line2: "Office 101",
                    city: "Dubai",
                    country: "United Arab Emirates",
                    phone: user?.phone || "+971 50 000 0000",
                    email: user?.email,
                    state: "Dubai",
                    postal_code: "00000"
                };
            }

            // Map Sub-Orders
            const subOrders = orders.map(order => {
                const internalStatus = order.order_status as string;
                let displayStatus: any;

                if (internalStatus === 'order_received') {
                    displayStatus = 'order_received';
                } else if (internalStatus === 'admin_rejected') {
                    displayStatus = 'rejected';
                } else {
                    displayStatus = internalStatus;
                }

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
                        if (item.image) {
                            item.image = getFileUrl(item.image);
                        }
                        return item;
                    });
                }

                return {
                    ...orderJson,
                    order_status: displayStatus,
                    status_label: order.order_status,
                    shipment_status: order.shipment_status,
                    original_status: internalStatus,
                    address
                };
            });

            return this.sendSuccess({
                group_id: id,
                total_amount: totalAmount,
                currency: orders[0].currency,
                created_at: orders[0].created_at,
                orders: subOrders,
                items_count: subOrders.reduce((c, o: any) => c + (o.items?.length || 0), 0)
            });

        } catch (error: any) {
            return this.sendError(String((error as any).message), 500);
        }
    }

    /**
     * POST /api/v1/user/request-update
     * Request profile update (Reset to Onboarding)
     */
    async requestUpdate(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            // 1. Update User Profile Status
            await UserProfile.update(
                {
                    onboarding_status: 'update_needed',
                    current_step: 1,
                    rejection_reason: null,
                    review_note: null
                },
                { where: { user_id: user!.id } }
            );

            // 2. Update User Onboarding Step
            await User.update(
                { onboarding_step: 1 },
                { where: { id: user!.id } }
            );

            return this.sendSuccess({}, 'Profile update requested. Please complete onboarding again.', 200, undefined, req);
        } catch (error: any) {
            return this.sendError(String((error as any).message), 500, [], undefined, req);
        }
    }
}
