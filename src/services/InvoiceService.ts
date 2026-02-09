import { Invoice } from '../models/Invoice';
import { Order, OrderItem } from '../models/Order';
import { User, UserProfile, Address, PlatformSetting } from '../models';
import { randomBytes } from 'crypto';
import { Op } from 'sequelize';

/**
 * InvoiceService
 * Handles invoice generation, numbering, and retrieval logic
 */
export class InvoiceService {
    /**
     * Generates a unique invoice number
     * Format: [PREFIX]-[YEAR]-[SEQUENTIAL_5_DIGIT]
     * Admin invoices: VND-2026-00001
     * Customer invoices: INV-2026-00001
     */
    static async generateInvoiceNumber(type: 'admin' | 'customer'): Promise<string> {
        const prefix = type === 'admin' ? 'VND' : 'INV';
        const year = new Date().getFullYear();

        // Find the last invoice of this type for current year
        const lastInvoice = await Invoice.findOne({
            where: {
                invoice_type: type,
                invoice_number: {
                    [Op.like]: `${prefix}-${year}-%`
                }
            },
            order: [['created_at', 'DESC']],
            paranoid: false // Include soft-deleted invoices for numbering
        });

        let nextNumber = 1;
        if (lastInvoice) {
            // Extract the sequential number from the last invoice
            const parts = lastInvoice.invoice_number.split('-');
            const lastNumber = parseInt(parts[2], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        // Pad to 5 digits
        const paddedNumber = String(nextNumber).padStart(5, '0');
        return `${prefix}-${year}-${paddedNumber}`;
    }

    /**
     * Generates a unique access token for public invoice URL
     */
    static generateAccessToken(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Fetches admin platform settings for invoice generation
     */
    static async getAdminDetails(): Promise<{
        companyName: string;
        companyAddress: string;
        companyPhone: string | null;
        companyEmail: string | null;
        logoUrl: string | null;
    }> {
        const keys = [
            'admin_company_name',
            'admin_company_address',
            'admin_company_phone',
            'admin_company_email',
            'admin_logo_url'
        ];

        const settings = await PlatformSetting.findAll({
            where: { key: keys }
        });

        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        return {
            companyName: settingsMap['admin_company_name'] || 'Armoured Vehicles LLC',
            companyAddress: settingsMap['admin_company_address'] || 'Dubai, UAE',
            companyPhone: settingsMap['admin_company_phone'] || null,
            companyEmail: settingsMap['admin_company_email'] || null,
            logoUrl: settingsMap['admin_logo_url'] || null
        };
    }

    /**
     * Fetches terms & conditions for invoice type
     */
    static async getTermsConditions(type: 'admin' | 'customer'): Promise<string | null> {
        const key = type === 'admin' ? 'vendor_invoice_terms' : 'customer_invoice_terms';
        const setting = await PlatformSetting.findOne({ where: { key } });
        return setting?.value || null;
    }

    /**
     * Helper to format address from common profile fields
     */
    private static formatProfileAddress(profile?: UserProfile): string {
        if (!profile) return 'N/A';
        const parts = [
            profile.address_line1,
            profile.address_line2,
            profile.city,
            profile.state,
            profile.postal_code,
            profile.country
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : (profile.city_office_address || 'N/A');
    }

    /**
     * Generates Admin Invoice (Vendor → Admin)
     * Called when vendor approves an order
     * Amounts are order total MINUS admin commission
     */
    static async generateAdminInvoice(
        orderId: string,
        comments?: string | null
    ): Promise<Invoice> {
        // Fetch order with vendor details
        const order = await Order.findByPk(orderId, {
            include: [
                { model: OrderItem, as: 'items' },
                { model: User, as: 'vendor', include: [{ model: UserProfile, as: 'profile' }] }
            ]
        }) as Order & { vendor?: User & { profile?: UserProfile }; items?: OrderItem[] };

        if (!order) {
            throw new Error('Order not found');
        }

        // Get admin details (admin is the addressee)
        const adminDetails = await this.getAdminDetails();
        const terms = await this.getTermsConditions('admin');

        // Vendor is the issuer
        const vendor = order.vendor;
        const vendorProfile = vendor?.profile;

        const issuerName = vendorProfile?.company_name || vendor?.name || 'Vendor';
        const issuerAddress = this.formatProfileAddress(vendorProfile);

        // Calculate amounts (minus admin commission)
        const totalAmount = Number(order.total_amount);
        const adminCommission = Number(order.admin_commission) || 0;
        const vatAmount = Number(order.vat_amount) || 0;
        const shippingAmount = Number(order.total_shipping) || 0;
        const packingAmount = Number(order.total_packing) || 0;

        // Vendor amount = total - commission
        const vendorTotal = totalAmount - adminCommission;
        // Proportionally adjust subtotal (subtotal = total - vat - shipping - packing)
        const subtotal = vendorTotal - vatAmount - shippingAmount - packingAmount;

        const invoiceNumber = await this.generateInvoiceNumber('admin');
        const accessToken = this.generateAccessToken();

        const invoice = await Invoice.create({
            invoice_number: invoiceNumber,
            order_id: orderId,
            invoice_type: 'admin',

            // Admin is addressee
            addressee_name: adminDetails.companyName,
            addressee_address: adminDetails.companyAddress,
            addressee_phone: adminDetails.companyPhone,
            addressee_email: adminDetails.companyEmail,

            // Vendor is issuer (using admin logo temporarily as per requirements)
            issuer_name: issuerName,
            issuer_address: issuerAddress,
            issuer_logo_url: adminDetails.logoUrl, // Use admin logo temporarily
            issuer_phone: vendor?.phone || null,
            issuer_email: vendor?.email || null,

            subtotal: subtotal,
            vat_amount: vatAmount,
            shipping_amount: shippingAmount,
            packing_amount: packingAmount,
            total_amount: vendorTotal,
            currency: order.currency,

            comments: comments || null,
            terms_conditions: terms,
            payment_status: 'unpaid', // Starts as unpaid
            access_token: accessToken
        });

        return invoice;
    }

    /**
     * Generates Customer Invoice (Admin → Customer)
     * Called when admin approves an order AND payment is confirmed
     * AGGREGATES all orders in the same group into one invoice
     */
    static async generateCustomerInvoice(
        orderId: string,
        comments: string | null = null,
        paymentStatus: 'paid' | 'unpaid' = 'paid'
    ): Promise<Invoice> {
        // Fetch the initial order to get group ID and user details
        const initialOrder = await Order.findByPk(orderId);

        if (!initialOrder) {
            throw new Error('Order not found');
        }

        const orderGroupId = initialOrder.order_group_id;

        // Fetch ALL orders in this group to aggregate totals
        // We include user/profile from the first found order (they should be identical)
        let allGroupOrders: (Order & { user?: User & { profile?: UserProfile; addresses?: Address[] }; items?: OrderItem[] })[] = [];

        if (orderGroupId) {
            allGroupOrders = await Order.findAll({
                where: { order_group_id: orderGroupId },
                include: [
                    { model: OrderItem, as: 'items' },
                    {
                        model: User, as: 'user', include: [
                            { model: UserProfile, as: 'profile' },
                            { model: Address, as: 'addresses' }
                        ]
                    }
                ]
            }) as any;
        } else {
            // If no group ID, it's a single order. Re-fetch with includes to be safe/consistent
            const single = await Order.findByPk(orderId, {
                include: [
                    { model: OrderItem, as: 'items' },
                    {
                        model: User, as: 'user', include: [
                            { model: UserProfile, as: 'profile' },
                            { model: Address, as: 'addresses' }
                        ]
                    }
                ]
            }) as any;
            if (single) allGroupOrders = [single];
        }

        if (allGroupOrders.length === 0) {
            throw new Error('No orders found for group');
        }

        // Use the first order for customer details (same customer for all)
        const primaryOrder = allGroupOrders[0];

        // Get admin details (admin is the issuer)
        const adminDetails = await this.getAdminDetails();
        const terms = await this.getTermsConditions('customer');

        // Customer is the addressee
        const customer = primaryOrder.user;
        const customerProfile = customer?.profile;

        let shippingAddress: any = null;

        // Priority 1: Check order.shipment_details (Snapshot of address at checkout)
        if (primaryOrder.shipment_details && Object.keys(primaryOrder.shipment_details).length > 0) {
            shippingAddress = primaryOrder.shipment_details;
        }
        // Priority 2: Fallback to default address from profile
        else {
            shippingAddress = customer?.addresses?.find(a => a.is_default) || customer?.addresses?.[0];
        }

        // Build customer address string
        let customerAddressStr = '';
        if (shippingAddress) {
            const parts = [
                shippingAddress.address_line1,
                shippingAddress.address_line2,
                shippingAddress.city,
                shippingAddress.state,
                shippingAddress.postal_code,
                shippingAddress.country
            ].filter(Boolean);
            customerAddressStr = parts.join(', ');
        }

        const addresseeName = customerProfile?.company_name || customer?.name || 'Customer';
        const addresseeAddress = customerAddressStr || this.formatProfileAddress(customerProfile);

        // AGGREGATE AMOUNTS
        let totalAmount = 0;
        let vatAmount = 0;
        let shippingAmount = 0;
        let packingAmount = 0;
        let subtotal = 0;

        for (const order of allGroupOrders) {
            const tAmount = Number(order.total_amount) || 0;
            const tVat = Number(order.vat_amount) || 0;
            const tShip = Number(order.total_shipping) || 0;
            const tPack = Number(order.total_packing) || 0;

            totalAmount += tAmount;
            vatAmount += tVat;
            shippingAmount += tShip;
            packingAmount += tPack;

            // Subtotal for this order
            subtotal += (tAmount - tVat - tShip - tPack);
        }

        const invoiceNumber = await this.generateInvoiceNumber('customer');
        const accessToken = this.generateAccessToken();

        const invoice = await Invoice.create({
            invoice_number: invoiceNumber,
            order_id: primaryOrder.id, // Link to primary order (logic handles finding siblings)
            invoice_type: 'customer',

            // Customer is addressee
            addressee_name: addresseeName,
            addressee_address: addresseeAddress,
            addressee_phone: shippingAddress?.phone || customer?.phone || null,
            addressee_email: customer?.email || null,

            // Admin is issuer
            issuer_name: adminDetails.companyName,
            issuer_address: adminDetails.companyAddress,
            issuer_logo_url: adminDetails.logoUrl,
            issuer_phone: adminDetails.companyPhone,
            issuer_email: adminDetails.companyEmail,

            subtotal: subtotal,
            vat_amount: vatAmount,
            shipping_amount: shippingAmount,
            packing_amount: packingAmount,
            total_amount: totalAmount,
            currency: primaryOrder.currency,

            comments: comments || null,
            terms_conditions: terms,
            payment_status: paymentStatus, // 'paid' or 'unpaid'
            access_token: accessToken
        });

        return invoice;
    }

    /**
     * Updates admin invoice payment status to 'paid'
     * Called when shipment_status = 'delivered' AND payment_status = 'paid'
     */
    static async markAdminInvoicePaid(orderId: string): Promise<Invoice | null> {
        const invoice = await Invoice.findOne({
            where: {
                order_id: orderId,
                invoice_type: 'admin',
                payment_status: 'unpaid'
            }
        });

        if (invoice) {
            invoice.payment_status = 'paid';
            await invoice.save();
        }

        return invoice;
    }

    /**
     * Get all invoices for an order
     */
    static async getInvoicesByOrderId(orderId: string): Promise<Invoice[]> {
        return Invoice.findAll({
            where: { order_id: orderId },
            order: [['created_at', 'ASC']]
        });
    }

    /**
     * Get all invoices for an order group
     * Useful for Admin/Customer views to see all invoices in the bundle
     */
    static async getInvoicesByGroupId(orderGroupId: string): Promise<Invoice[]> {
        return Invoice.findAll({
            include: [{
                model: Order,
                as: 'order',
                where: { order_group_id: orderGroupId },
                required: true
            }],
            order: [['created_at', 'ASC']]
        });
    }

    /**
     * Get invoice by ID
     */
    static async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
        return Invoice.findByPk(invoiceId, {
            include: [{ model: Order, as: 'order' }]
        });
    }

    /**
     * Get all invoices (Admin only)
     */
    static async getAllInvoices(): Promise<Invoice[]> {
        return Invoice.findAll({
            order: [['created_at', 'DESC']],
            include: [{ model: Order, as: 'order' }]
        });
    }

    /**
     * Get invoices for a specific vendor
     * Returns Admin Invoices where the vendor is the issuer (via order.vendor_id)
     */
    static async getInvoicesByVendor(vendorId: string): Promise<Invoice[]> {
        return Invoice.findAll({
            where: { invoice_type: 'admin' },
            include: [{
                model: Order,
                as: 'order',
                where: { vendor_id: vendorId },
                required: true
            }],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get invoices for a specific customer
     * Returns Customer Invoices where the customer is the addressee (via order.user_id)
     */
    static async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
        return Invoice.findAll({
            where: { invoice_type: 'customer' },
            include: [{
                model: Order,
                as: 'order',
                where: { user_id: customerId },
                required: true
            }],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get invoice by public access token
     */
    static async getInvoiceByToken(token: string): Promise<Invoice | null> {
        return Invoice.findOne({
            where: { access_token: token },
            include: [{ model: Order, as: 'order' }]
        });
    }
    /**
 * Updates customer invoice payment status to 'paid'
 */
    static async markCustomerInvoicePaid(orderId: string): Promise<Invoice | null> {
        const invoice = await Invoice.findOne({
            where: {
                order_id: orderId,
                invoice_type: 'customer',
                payment_status: 'unpaid'
            }
        });

        if (invoice) {
            invoice.payment_status = 'paid';
            await invoice.save();
        }

        return invoice;
    }
}

