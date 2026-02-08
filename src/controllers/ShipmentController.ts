/**
 * ShipmentController - Handles all shipment-related API endpoints
 * 
 * Provides endpoints for:
 * - Calculating shipping rates
 * - Scheduling FedEx pickups
 * - Tracking shipments
 * - Getting available pickup dates
 * 
 * @module controllers/ShipmentController
 */

import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { FedExService, RateRequestInput, SchedulePickupInput, FedExAddress, FedExContact } from '../services/FedExService';
import { Order } from '../models/Order';
import { Address } from '../models/Address';
import { User, UserProfile } from '../models';
import { PlatformSetting } from '../models/PlatformSetting';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for address validation
 */
const AddressSchema = z.object({
    streetLines: z.array(z.string().min(1)).min(1),
    city: z.string().min(1),
    stateOrProvinceCode: z.string().min(1),
    postalCode: z.string().min(1),
    countryCode: z.string().length(2)
});

/**
 * Schema for contact validation
 */
const ContactSchema = z.object({
    personName: z.string().min(1),
    phoneNumber: z.string().min(1),
    emailAddress: z.string().email().optional(),
    companyName: z.string().optional()
});

/**
 * Schema for weight validation
 */
const WeightSchema = z.object({
    units: z.enum(['KG', 'LB']),
    value: z.number().positive()
});

/**
 * Schema for dimensions validation
 */
const DimensionsSchema = z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    units: z.enum(['CM', 'IN'])
}).optional();

/**
 * Schema for rate calculation request
 * FromAddress and contacts are optional - will use admin warehouse if not provided
 */
const RateRequestSchema = z.object({
    vendorId: z.string().optional(), // Added vendorId
    fromAddress: AddressSchema.optional(),
    fromContact: ContactSchema.optional(),
    toAddress: AddressSchema,
    toContact: ContactSchema.optional(),
    weight: WeightSchema,
    dimensions: DimensionsSchema,
    shipDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

/**
 * Schema for pickup scheduling request
 */
const PickupRequestSchema = z.object({
    orderId: z.string().uuid(),
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    readyTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    packageCount: z.number().int().positive().default(1),
    weight: WeightSchema
});

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class ShipmentController extends BaseController {

    // ========================================================================
    // RATE CALCULATION
    // ========================================================================

    /**
     * POST /api/v1/shipment/rate
     * Calculate shipping rates between two addresses
     * If fromAddress is not provided, uses admin warehouse address
     */
    async calculateRate(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            // Check if FedEx is configured
            if (!FedExService.isConfigured()) {
                return this.sendError('Shipping service not configured', 302);
            }

            const body = await req.json();

            // Validate request body
            const validation = RateRequestSchema.safeParse(body);
            if (!validation.success) {
                return this.sendError('Validation failed', 201, validation.error.issues);
            }

            let { vendorId, fromAddress, fromContact, toAddress, toContact, weight, dimensions, shipDate } = validation.data;

            // Determine Origin Address
            if (!fromAddress || !fromContact) {
                if (vendorId && vendorId !== 'admin') {
                    // Fetch Vendor Address
                    const vendorUser = await User.findByPk(vendorId, {
                        include: [{ model: UserProfile, as: 'profile' }]
                    });

                    if (vendorUser && (vendorUser as any).profile) {
                        const vendorProfile = (vendorUser as any).profile;

                        const country = vendorProfile.country || 'United Arab Emirates';
                        const isUAE = country === 'United Arab Emirates' || country === 'UAE';

                        const street = vendorProfile.address_line1 || vendorProfile.address_line_1 || vendorProfile.street; // Fixed typo
                        const city = vendorProfile.city || (isUAE ? 'Dubai' : '');
                        const postalCode = vendorProfile.postal_code || '00000';
                        const stateCode = vendorProfile.state || vendorProfile.city || (isUAE ? 'DU' : '');

                        // Validate Critical Fields
                        if (!street || !city || (postalCode === '00000' && !isUAE)) {
                            console.error('[Shipment] Incomplete Vendor Address:', { street, city, postalCode, country });
                            return this.sendError(`Vendor profile incomplete. Missing address details for ${vendorUser.name}.`, 310);
                        }

                        fromAddress = {
                            streetLines: FedExService.formatStreetLines([street, vendorProfile.address_line_2]),
                            city: city,
                            stateOrProvinceCode: stateCode,
                            postalCode: postalCode,
                            countryCode: isUAE ? 'AE' : (vendorProfile.country_code || (country ? country.substring(0, 2).toUpperCase() : 'AE'))
                        };



                        fromContact = {
                            personName: vendorUser.name || 'Vendor',
                            phoneNumber: vendorUser.phone || vendorProfile.phone || '0000000000',
                            emailAddress: vendorUser.email,
                            companyName: vendorProfile.company_name
                        };
                    } else {
                        // Fallback or Error? 
                        // For rate calc, maybe fallback to Admin is safer if vendor bad data, 
                        // or return error. Let's return error to be explicit.
                        return this.sendError('Vendor address not found', 310);
                    }
                } else {
                    // Use Admin Warehouse
                    const adminAddress = await FedExService.getAdminAddress();
                    if (!adminAddress) {
                        return this.sendError('Admin address not configured', 302);
                    }
                    fromAddress = fromAddress || adminAddress.address;
                    fromContact = fromContact || adminAddress.contact;
                }
            }

            // If toContact not provided, use a default
            if (!toContact) {
                toContact = {
                    personName: 'Customer',
                    phoneNumber: '0000000000'
                };
            }

            const input: RateRequestInput = {
                fromAddress,
                fromContact,
                toAddress,
                toContact,
                weight,
                dimensions,
                shipDate
            };

            // Call FedEx Rate API
            const result = await FedExService.getRates(input);

            if (!result.success) {
                return this.sendError(result.error || 'Failed to calculate rates', 302);
            }

            return this.sendSuccess(result.data, 'Rates calculated successfully');
        } catch (error) {
            console.error('Calculate Rate Error:', error);
            return this.sendError('Failed to calculate shipping rates', 300);
        }
    }

    /**
     * POST /api/v1/shipment/rate/order/:orderId
     * Calculate shipping rates for a specific order
     */
    async calculateOrderRate(req: NextRequest, { params }: { params: { orderId: string } }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { orderId } = await params;

            // Fetch order with customer details
            const order = await Order.findByPk(orderId, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        include: [{ model: UserProfile, as: 'profile' }]
                    }
                ]
            });

            if (!order) {
                return this.sendError('Order not found', 310);
            }

            // Parse request body for weight (required)
            const body = await req.json();
            const weightValidation = WeightSchema.safeParse(body.weight);
            if (!weightValidation.success) {
                return this.sendError('Weight is required', 201, weightValidation.error.issues);
            }

            // Get admin address as origin
            const adminAddress = await FedExService.getAdminAddress();
            if (!adminAddress) {
                return this.sendError('Admin address not configured', 302);
            }

            // Get customer address from profile
            const profile = (order as any).user?.profile;
            if (!profile || !profile.city) {
                return this.sendError('Customer address not found', 310);
            }

            const customerAddress: FedExAddress = {
                streetLines: FedExService.formatStreetLines([profile.address_line_1 || profile.street, profile.address_line_2]),
                city: profile.city,
                stateOrProvinceCode: profile.state || profile.city,
                postalCode: profile.postal_code || '00000',
                countryCode: profile.country === 'United Arab Emirates' ? 'AE' : profile.country?.substring(0, 2) || 'AE'
            };

            const customerContact: FedExContact = {
                personName: (order as any).user?.name || 'Customer',
                phoneNumber: (order as any).user?.phone || '0000000000',
                emailAddress: (order as any).user?.email
            };

            const input: RateRequestInput = {
                fromAddress: adminAddress.address,
                fromContact: adminAddress.contact,
                toAddress: customerAddress,
                toContact: customerContact,
                weight: weightValidation.data
            };

            const result = await FedExService.getRates(input);

            if (!result.success) {
                return this.sendError(result.error || 'Failed to calculate rates', 302);
            }

            return this.sendSuccess(result.data, 'Order rates calculated successfully');
        } catch (error) {
            console.error('Calculate Order Rate Error:', error);
            return this.sendError('Failed to calculate order shipping rates', 300);
        }
    }

    // ========================================================================
    // PICKUP SCHEDULING
    // ========================================================================

    /**
     * POST /api/v1/shipment/schedule-pickup
     * Schedule a FedEx pickup for an order
     */
    async schedulePickup(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            // Check if FedEx is configured
            if (!FedExService.isConfigured()) {
                return this.sendError('Shipping service not configured', 302);
            }

            const body = await req.json();

            // Validate request body
            const validation = PickupRequestSchema.safeParse(body);
            if (!validation.success) {
                return this.sendError('Validation failed', 201, validation.error.issues);
            }

            const { orderId, pickupDate, readyTime, closeTime, packageCount, weight } = validation.data;

            // Fetch order
            const order = await Order.findByPk(orderId, {
                include: [
                    { model: User, as: 'user', include: [{ model: UserProfile, as: 'profile' }] }
                ]
            });

            if (!order) {
                return this.sendError('Order not found', 310);
            }

            // Determine pickup address
            // Simplified Flow: Pickup from Source (Vendor/Admin) -> Deliver to Customer
            let pickupAddress: FedExAddress;
            let pickupContact: FedExContact;

            // Target: Customer Address
            // If user/profile is null (e.g., sub-order), try fetching from parent order
            let customerUser = (order as any).user;
            let customerProfile = customerUser?.profile;



            // If user wasn't loaded with order, fetch directly
            if (!customerUser && order.user_id) {
                customerUser = await User.findByPk(order.user_id, {
                    include: [{ model: UserProfile, as: 'profile' }]
                });
                customerProfile = (customerUser as any)?.profile;

            }

            if (!customerProfile && order.order_group_id) {
                // Fetch parent order to get user info
                // order_group_id can be either UUID or 8-digit order_id, try both approaches
                const isUuid = order.order_group_id.includes('-');

                const parentOrder = isUuid
                    ? await Order.findByPk(order.order_group_id, {
                        include: [{ model: User, as: 'user', include: [{ model: UserProfile, as: 'profile' }] }]
                    })
                    : await Order.findOne({
                        where: { order_id: order.order_group_id },
                        include: [{ model: User, as: 'user', include: [{ model: UserProfile, as: 'profile' }] }]
                    });

                customerUser = (parentOrder as any)?.user;
                customerProfile = customerUser?.profile;

            }

            if (!customerProfile) {
                console.error('No profile found. Order:', order.id, 'user_id:', order.user_id, 'group_id:', order.order_group_id);
                return this.sendError('Customer profile not found', 310);
            }

            // Validate required address fields
            const streetLine1 = customerProfile.address_line1 || customerProfile.city || 'Business Address';
            if (!streetLine1) {
                return this.sendError('Customer address is incomplete. Street address is required.', 201);
            }

            const recipientAddress: FedExAddress = {
                streetLines: FedExService.formatStreetLines([streetLine1, customerProfile.address_line_2]),
                city: customerProfile.city || 'Dubai',
                stateOrProvinceCode: customerProfile.state || customerProfile.city || 'DXB',
                postalCode: customerProfile.postal_code || '00000',
                countryCode: customerProfile.country === 'United Arab Emirates' ? 'AE' : customerProfile.country?.substring(0, 2)?.toUpperCase() || 'AE'
            };

            const recipientContact: FedExContact = {
                personName: customerUser.name || 'Customer',
                phoneNumber: customerProfile.phone || customerUser.phone || '0000000000',
                emailAddress: customerUser.email
            };

            // Source: Vendor or Admin
            if (order.vendor_id && order.vendor_id !== 'admin') {
                // Pickup from Vendor
                const vendorUser = await User.findByPk(order.vendor_id, {
                    include: [{ model: UserProfile, as: 'profile' }]
                });

                if (!vendorUser) {
                    return this.sendError('Vendor not found', 310);
                }

                const vendorProfile = (vendorUser as any).profile;
                if (!vendorProfile) {
                    return this.sendError('Vendor profile not found', 310);
                }

                // Validate Critical Vendor Address Fields
                const vStreet = vendorProfile.address_line_1 || vendorProfile.address_line1 || vendorProfile.street;
                const vCity = vendorProfile.city;
                const vState = vendorProfile.state || vendorProfile.city;
                const vPostal = vendorProfile.postal_code;
                const vCountry = vendorProfile.country;

                if (!vStreet || !vCity) {
                    console.error('[Shipment] Incomplete Vendor Address:', { vStreet, vCity, vPostal, vCountry });
                    return this.sendError(`Vendor profile address is incomplete. Please update vendor profile (Street, City, Country).`, 201);
                }

                pickupAddress = {
                    streetLines: FedExService.formatStreetLines([vStreet, vendorProfile.address_line_2]),
                    city: vCity || 'Dubai',
                    stateOrProvinceCode: vState || 'DXB',
                    postalCode: vPostal || '00000',
                    countryCode: vCountry === 'United Arab Emirates' ? 'AE' : (vCountry?.substring(0, 2)?.toUpperCase() || 'AE')
                };

                pickupContact = {
                    personName: vendorUser.name || 'Vendor',
                    phoneNumber: vendorUser.phone || vendorProfile.phone || '0000000000',
                    emailAddress: vendorUser.email,
                    companyName: vendorProfile.company_name
                };

            } else {
                // Pickup from Admin Warehouse
                const adminAddress = await FedExService.getAdminAddress();
                if (!adminAddress) {
                    return this.sendError('Admin address not configured', 302);
                }

                pickupAddress = adminAddress.address;
                pickupContact = adminAddress.contact;
            }

            // Create shipment first to get label and tracking number
            const shipmentResult = await FedExService.createShipment({
                fromAddress: pickupAddress,
                fromContact: pickupContact,
                toAddress: recipientAddress,
                toContact: recipientContact,
                weight: weight,
                packageCount: packageCount,
                shipDate: pickupDate
            });

            if (!shipmentResult.success || !shipmentResult.data) {
                return this.sendError(shipmentResult.error || 'Failed to create shipment', 302);
            }

            // Schedule pickup
            const pickupInput: SchedulePickupInput = {
                pickupAddress,
                pickupContact,
                pickupDate,
                readyTime,
                closeTime,
                packageCount,
                totalWeight: weight
            };

            const pickupResult = await FedExService.schedulePickup(pickupInput);

            if (!pickupResult.success || !pickupResult.data) {
                // Shipment was created but pickup failed - still return shipment info
                console.error('Pickup scheduling failed:', pickupResult.error);
            }

            // Update order with shipment details
            // NOTE: Status stays at 'processing' until FedEx webhook confirms pickup
            const shipmentDetails = {
                ...(order.shipment_details as object || {}),
                customer_shipment: {
                    tracking_number: shipmentResult.data.trackingNumber,
                    shipment_id: shipmentResult.data.shipmentId,
                    label_url: shipmentResult.data.labelUrl,
                    pickup_confirmation: pickupResult.data?.confirmationCode,
                    pickup_date: pickupDate,
                    pickup_scheduled_at: new Date().toISOString(),
                    status: 'pickup_scheduled', // Waiting for FedEx webhook
                    pickup_address_source: (order.vendor_id && order.vendor_id !== 'admin') ? 'vendor' : 'admin'
                }
            };

            // Store tracking number in main field for easy lookup
            order.tracking_number = shipmentResult.data.trackingNumber;
            order.shipment_id = shipmentResult.data.shipmentId;
            order.label_url = shipmentResult.data.labelUrl;

            // Update shipment status to processing (pickup scheduled)
            // Webhook will update to shipped when FedEx picks up
            order.shipment_status = 'processing';
            order.shipment_details = shipmentDetails;
            await order.save();

            return this.sendSuccess({
                shipment: shipmentResult.data,
                pickup: pickupResult.data,
                order_status: order.shipment_status
            }, 'Pickup scheduled successfully');

        } catch (error) {
            console.error('Schedule Pickup Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to schedule pickup';
            return this.sendError(errorMessage, 300);
        }
    }

    /**
     * GET /api/v1/shipment/pickup-dates
     * Get available pickup dates
     */
    async getPickupDates(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const dates = FedExService.getAvailablePickupDates();

            return this.sendSuccess({ dates }, 'Pickup dates retrieved');
        } catch (error) {
            console.error('Get Pickup Dates Error:', error);
            return this.sendError('Failed to get pickup dates', 300);
        }
    }

    // ========================================================================
    // TRACKING
    // ========================================================================

    /**
     * GET /api/v1/shipment/track/:trackingNumber
     * Track a shipment by tracking number
     */
    async trackShipment(req: NextRequest, { params }: { params: { trackingNumber: string } }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { trackingNumber } = await params;

            if (!trackingNumber) {
                return this.sendError('Tracking number is required', 202);
            }

            // Check if FedEx is configured
            if (!FedExService.isConfigured()) {
                return this.sendError('Shipping service not configured', 302);
            }

            const result = await FedExService.trackShipment(trackingNumber);

            if (!result.success) {
                return this.sendError(result.error || 'Failed to track shipment', 302);
            }

            return this.sendSuccess(result.data, 'Tracking information retrieved');
        } catch (error) {
            console.error('Track Shipment Error:', error);
            return this.sendError('Failed to track shipment', 300);
        }
    }

    /**
     * GET /api/v1/shipment/order/:orderId/track
     * Track shipment for a specific order
     */
    async trackOrderShipment(req: NextRequest, { params }: { params: { orderId: string } }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { orderId } = await params;

            const order = await Order.findByPk(orderId);
            if (!order) {
                return this.sendError('Order not found', 310);
            }

            // Authorization check
            const isCustomer = user!.user_type === 'customer' && order.user_id === user!.id;
            const isVendor = user!.user_type === 'vendor' && order.vendor_id === user!.id;
            const isAdmin = ['admin', 'super_admin'].includes(user!.user_type);

            if (!isCustomer && !isVendor && !isAdmin) {
                return this.sendError('Forbidden', 211);
            }

            if (!order.tracking_number) {
                return this.sendError('No tracking information available for this order', 310);
            }

            const result = await FedExService.trackShipment(order.tracking_number);

            if (!result.success) {
                return this.sendError(result.error || 'Failed to track shipment', 302);
            }

            return this.sendSuccess({
                order_id: order.id,
                order_number: order.order_id,
                ...result.data
            }, 'Order tracking information retrieved');

        } catch (error) {
            console.error('Track Order Shipment Error:', error);
            return this.sendError('Failed to track order shipment', 300);
        }
    }

    // ========================================================================
    // PLATFORM SETTINGS
    // ========================================================================

    /**
     * GET /api/v1/shipment/settings
     * Get shipment-related platform settings
     */
    async getShipmentSettings(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            // Only admin can view all settings
            if (!['admin', 'super_admin'].includes(user!.user_type)) {
                return this.sendError('Forbidden', 211);
            }

            const settings = await PlatformSetting.findAll({
                where: {
                    key: [
                        'handle_vendor_shipment',
                        'handle_return_shipment',
                        'vendor_shipment_pay',
                        'return_shipment_pay'
                    ]
                }
            });

            const settingsMap: Record<string, string | boolean> = {};
            settings.forEach(s => {
                // Convert boolean strings to actual booleans
                if (s.value === 'true' || s.value === 'false') {
                    settingsMap[s.key] = s.value === 'true';
                } else {
                    settingsMap[s.key] = s.value;
                }
            });

            return this.sendSuccess(settingsMap, 'Shipment settings retrieved');
        } catch (error) {
            console.error('Get Shipment Settings Error:', error);
            return this.sendError('Failed to get shipment settings', 300);
        }
    }

    /**
     * Check if FedEx is available for use
     */
    async checkAvailability(req: NextRequest) {
        try {
            const isConfigured = FedExService.isConfigured();
            const isValid = isConfigured ? await FedExService.validateCredentials() : false;

            return this.sendSuccess({
                configured: isConfigured,
                valid: isValid
            }, 'FedEx availability checked');
        } catch (error) {
            console.error('Check FedEx Availability Error:', error);
            return this.sendError('Failed to check FedEx availability', 300);
        }
    }

    // ========================================================================
    // FEDEX WEBHOOK HANDLER
    // ========================================================================

    /**
     * POST /api/v1/shipment/webhook
     * Handle FedEx tracking webhooks for automatic status updates
     * 
     * FedEx sends tracking events when:
     * - Package is picked up → Update to vendor_shipped or shipped
     * - Package is delivered → Update to delivered + store delivery date
     */
    async handleWebhook(req: NextRequest) {
        try {
            const body = await req.json();

            console.log('[FedEx Webhook] Received:', JSON.stringify(body, null, 2));

            // FedEx webhook payload structure
            const trackingNumber = body.trackingNumber || body.tracking_number || body.trackingInfo?.trackingNumber;
            const eventType = body.eventType || body.event_type || body.scanEvent?.eventType;
            const eventDescription = body.eventDescription || body.event_description || body.scanEvent?.eventDescription;

            if (!trackingNumber) {
                console.warn('[FedEx Webhook] No tracking number in payload');
                return this.sendSuccess({ received: true }, 'Webhook received (no tracking number)');
            }

            // Find order by tracking number (check both main and shipment_details)
            let order = await Order.findOne({
                where: { tracking_number: trackingNumber }
            });

            // If not found in main field, search in shipment_details JSON
            if (!order) {
                const orders = await Order.findAll({
                    where: {
                        shipment_details: {
                            [Symbol.for('sequelize.Op.ne')]: null
                        }
                    }
                });

                for (const o of orders) {
                    const details = o.shipment_details as any;
                    if (details?.vendor_shipment?.tracking_number === trackingNumber ||
                        details?.customer_shipment?.tracking_number === trackingNumber) {
                        order = o;
                        break;
                    }
                }
            }

            if (!order) {
                console.warn(`[FedEx Webhook] Order not found for tracking: ${trackingNumber}`);
                return this.sendSuccess({ received: true }, 'Webhook received (order not found)');
            }

            // Process event based on type
            const eventTypeLower = (eventType || '').toLowerCase();
            const eventDescLower = (eventDescription || '').toLowerCase();

            // PICKUP events: Package picked up by FedEx
            if (eventTypeLower.includes('pickup') || eventTypeLower === 'pk' ||
                eventDescLower.includes('picked up') || eventDescLower.includes('package picked up')) {

                if (order.shipment_status === 'processing') {
                    order.shipment_status = 'shipped';
                    console.log(`[FedEx Webhook] Order ${order.id}: processing → shipped`);
                }
            }

            // DELIVERED events: Package delivered
            if (eventTypeLower === 'dl' || eventTypeLower.includes('delivered') ||
                eventDescLower.includes('delivered')) {

                order.shipment_status = 'delivered';
                // Store delivery date for return period countdown
                const deliveryDate = body.eventTimestamp || body.scanEvent?.date || new Date().toISOString();
                const shipmentDetails = (order.shipment_details as any) || {};

                order.shipment_details = {
                    ...shipmentDetails,
                    delivery_date: deliveryDate,
                    delivered_at: deliveryDate
                };
                console.log(`[FedEx Webhook] Order ${order.id}: → delivered at ${deliveryDate}`);
            }

            // IN_TRANSIT events (optional logging)
            if (eventTypeLower.includes('transit') || eventTypeLower === 'it') {
                console.log(`[FedEx Webhook] Order ${order.id}: In transit - ${eventDescription}`);
            }

            await order.save();

            return this.sendSuccess({
                received: true,
                order_id: order.id,
                new_status: order.shipment_status
            }, 'Webhook processed successfully');

        } catch (error) {
            console.error('[FedEx Webhook] Error:', error);
            // Always return 200 to FedEx to prevent retries for parsing errors
            return this.sendSuccess({ received: true, error: 'Processing error' }, 'Webhook received with error');
        }
    }
}
