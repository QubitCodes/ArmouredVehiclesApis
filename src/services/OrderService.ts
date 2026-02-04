
import { Cart, CartItem, Order, OrderItem, Product, User, PlatformSetting, Address } from '../models';
import { sequelize } from '../config/database';

export class OrderService {

    /**
     * Get platform settings (VAT and Commission)
     */
    private static async getPlatformSettings() {
        try {
            const vatSetting = await PlatformSetting.findOne({ where: { key: 'vat_percentage' } });
            const commSetting = await PlatformSetting.findOne({ where: { key: 'admin_commission_percentage' } });

            return {
                vatPercent: vatSetting ? parseFloat(vatSetting.value) : 5,
                commPercent: commSetting ? parseFloat(commSetting.value) : 10
            };
        } catch (e) {
            console.error("Error fetching platform settings, using defaults", e);
            return { vatPercent: 5, commPercent: 10 };
        }
    }

    /**
     * Convert a Cart into one or more Orders (grouped by vendor)
     * This method is idempotent based on orderGroupId.
     */
    static async convertCartToOrder(userId: string, cartId: string, orderGroupId: string, options: { addressId?: string, isRequest?: boolean } = {}) {
        const t = await sequelize.transaction();
        try {
            // 1. Idempotency Check: Check if orders already exist for this group
            const existingOrders = await Order.findAll({ where: { order_group_id: orderGroupId }, transaction: t });
            if (existingOrders.length > 0) {
                console.log(`[OrderService] Orders for group ${orderGroupId} already exist. Skipping creation.`);
                await t.rollback();
                return existingOrders;
            }

            // 2. Fetch Cart with Items and Products
            const cart = await Cart.findOne({
                where: { id: cartId, user_id: userId },
                include: [{
                    model: CartItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product' }]
                }],
                transaction: t
            });

            if (!cart || !cart.items || cart.items.length === 0) {
                throw new Error("Cart not found or empty");
            }

            // 3. Prepare Shipment Details
            let shipmentDetails = {};
            if (options.addressId) {
                const address = await Address.findByPk(options.addressId, { transaction: t });
                if (address && address.user_id === userId) {
                    shipmentDetails = address.toJSON();
                }
            }

            const { vatPercent, commPercent } = await this.getPlatformSettings();

            // 4. Group Items by Vendor
            const vendorGroups = new Map<string, any[]>();
            const consolidatedItems = new Map<number, any>();

            for (const item of cart.items) {
                if (!item.product) continue;

                const productId = item.product_id;
                const price = Number(item.product.base_price) || 0;

                if (consolidatedItems.has(productId)) {
                    const existing = consolidatedItems.get(productId);
                    existing.quantity += item.quantity;
                } else {
                    consolidatedItems.set(productId, {
                        product_id: productId,
                        vendor_id: item.product.vendor_id,
                        quantity: item.quantity,
                        price: price,
                        product_name: item.product.name,
                        shipping_charge: item.product.shipping_charge,
                        packing_charge: item.product.packing_charge
                    });
                }
            }

            // Distribute into vendor groups
            for (const item of consolidatedItems.values()) {
                const vId = item.vendor_id || 'admin';
                if (!vendorGroups.has(vId)) {
                    vendorGroups.set(vId, []);
                }
                vendorGroups.get(vId)?.push(item);
            }

            const isSingleVendor = vendorGroups.size === 1;
            const createdOrders: Order[] = [];

            // 5. Create Order for each Vendor Group
            try {
                for (const [vendorId, items] of vendorGroups) {
                    const actualVendorId = vendorId === 'admin' ? null : vendorId;

                    let groupSubtotal = 0;
                    let groupShipping = 0;
                    let groupPacking = 0;

                    items.forEach(i => {
                        const qty = i.quantity;
                        groupSubtotal += i.price * qty;
                        groupShipping += (Number(i.shipping_charge) || 0) * qty;
                        groupPacking += (Number(i.packing_charge) || 0) * qty;
                    });

                    const taxableAmount = groupSubtotal + groupShipping + groupPacking;
                    const vatAmount = (taxableAmount * vatPercent) / 100;
                    const adminCommission = (actualVendorId === null) ? 0 : (groupSubtotal * commPercent) / 100;
                    const groupTotal = taxableAmount + vatAmount;

                    // Generate 8-digit Order ID if not single vendor
                    let finalOrderId = isSingleVendor ? orderGroupId : Math.floor(10000000 + Math.random() * 90000000).toString();

                    const order = await Order.create({
                        user_id: userId,
                        order_id: finalOrderId,
                        order_group_id: orderGroupId,
                        vendor_id: actualVendorId,
                        total_amount: groupTotal,
                        vat_amount: vatAmount,
                        admin_commission: adminCommission,
                        total_shipping: groupShipping,
                        total_packing: groupPacking,
                        currency: 'AED',
                        type: options.isRequest ? 'request' : 'direct',
                        order_status: 'order_received',
                        payment_status: options.isRequest ? null : 'pending',
                        shipment_details: shipmentDetails,
                        status_history: [{
                            status: 'order_received',
                            payment_status: options.isRequest ? null : 'pending',
                            shipment_status: null,
                            updated_by: userId,
                            timestamp: new Date().toISOString(),
                            note: options.isRequest ? 'Purchase request submitted' : 'Order placed'
                        }]
                    }, { transaction: t });

                    // Create Order Items
                    for (const itemData of items) {
                        await OrderItem.create({ ...itemData, order_id: order.id }, { transaction: t });
                    }

                    createdOrders.push(order);
                }

                // 6. Mark Cart as Converted
                await cart.update({ status: 'converted' }, { transaction: t });

                await t.commit();
                console.log(`[OrderService] Successfully converted Cart ${cartId} to Order Group ${orderGroupId}`);
                return createdOrders;

            } catch (createError: any) {
                // If unique constraint error, it means a race condition occurred and another process created the orders
                if (createError.name === 'SequelizeUniqueConstraintError' || createError.name === 'SequelizeUniqueConstraintError') {
                    console.warn(`[OrderService] Race condition detected for group ${orderGroupId}. Re-fetching orders.`);
                    await t.rollback();
                    return await Order.findAll({ where: { order_group_id: orderGroupId } });
                }
                throw createError;
            }

        } catch (error) {
            // Already handled rollback for race condition above, but general safety here
            try { await t.rollback(); } catch (e) { }
            console.error("[OrderService] Conversion failed:", error);
            throw error;
        }
    }
}
