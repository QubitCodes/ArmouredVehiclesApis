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
 */
const RateRequestSchema = z.object({
    fromAddress: AddressSchema,
    fromContact: ContactSchema,
    toAddress: AddressSchema,
    toContact: ContactSchema,
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

            const input: RateRequestInput = validation.data;

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
                streetLines: [profile.address_line_1 || profile.street, profile.address_line_2].filter(Boolean) as string[],
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

            // Determine pickup address based on shipment flow
            // - If vendor is scheduling (vendor_processing): pickup from vendor, deliver to admin
            // - If admin is scheduling (processing): pickup from admin, deliver to customer
            let pickupAddress: FedExAddress;
            let pickupContact: FedExContact;
            let recipientAddress: FedExAddress;
            let recipientContact: FedExContact;

            const isVendorPickup = order.shipment_status === 'vendor_processing';
            const isAdminPickup = order.shipment_status === 'processing';

            if (isVendorPickup) {
                // Vendor → Admin flow
                // Pickup from vendor
                const vendorUser = await User.findByPk(order.vendor_id!, {
                    include: [{ model: UserProfile, as: 'profile' }]
                });

                if (!vendorUser) {
                    return this.sendError('Vendor not found', 310);
                }

                const vendorProfile = (vendorUser as any).profile;
                if (!vendorProfile) {
                    return this.sendError('Vendor profile not found', 310);
                }

                pickupAddress = {
                    streetLines: [vendorProfile.address_line_1 || vendorProfile.street, vendorProfile.address_line_2].filter(Boolean) as string[],
                    city: vendorProfile.city || 'Dubai',
                    stateOrProvinceCode: vendorProfile.state || vendorProfile.city || 'DXB',
                    postalCode: vendorProfile.postal_code || '00000',
                    countryCode: vendorProfile.country === 'United Arab Emirates' ? 'AE' : vendorProfile.country?.substring(0, 2) || 'AE'
                };

                pickupContact = {
                    personName: vendorUser.name || 'Vendor',
                    phoneNumber: vendorUser.phone || vendorProfile.phone || '0000000000',
                    emailAddress: vendorUser.email,
                    companyName: vendorProfile.company_name
                };

                // Deliver to admin
                const adminAddress = await FedExService.getAdminAddress();
                if (!adminAddress) {
                    return this.sendError('Admin address not configured', 302);
                }

                recipientAddress = adminAddress.address;
                recipientContact = adminAddress.contact;

            } else if (isAdminPickup) {
                // Admin → Customer flow
                // Pickup from admin
                const adminAddress = await FedExService.getAdminAddress();
                if (!adminAddress) {
                    return this.sendError('Admin address not configured', 302);
                }

                pickupAddress = adminAddress.address;
                pickupContact = adminAddress.contact;

                // Deliver to customer
                const customerProfile = (order as any).user?.profile;
                if (!customerProfile) {
                    return this.sendError('Customer profile not found', 310);
                }

                recipientAddress = {
                    streetLines: [customerProfile.address_line_1 || customerProfile.street, customerProfile.address_line_2].filter(Boolean) as string[],
                    city: customerProfile.city,
                    stateOrProvinceCode: customerProfile.state || customerProfile.city,
                    postalCode: customerProfile.postal_code || '00000',
                    countryCode: customerProfile.country === 'United Arab Emirates' ? 'AE' : customerProfile.country?.substring(0, 2) || 'AE'
                };

                recipientContact = {
                    personName: (order as any).user?.name || 'Customer',
                    phoneNumber: (order as any).user?.phone || '0000000000',
                    emailAddress: (order as any).user?.email
                };

            } else {
                return this.sendError('Invalid shipment status for pickup scheduling', 400);
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
            const shipmentDetails = {
                ...(order.shipment_details as object || {}),
                [isVendorPickup ? 'vendor_shipment' : 'customer_shipment']: {
                    tracking_number: shipmentResult.data.trackingNumber,
                    shipment_id: shipmentResult.data.shipmentId,
                    label_url: shipmentResult.data.labelUrl,
                    pickup_confirmation: pickupResult.data?.confirmationCode,
                    pickup_date: pickupDate,
                    created_at: new Date().toISOString()
                }
            };

            // Update order
            if (isVendorPickup) {
                order.shipment_status = 'vendor_shipped';
            } else {
                order.shipment_status = 'shipped';
                order.tracking_number = shipmentResult.data.trackingNumber;
                order.shipment_id = shipmentResult.data.shipmentId;
                order.label_url = shipmentResult.data.labelUrl;
            }

            order.shipment_details = shipmentDetails;
            await order.save();

            return this.sendSuccess({
                shipment: shipmentResult.data,
                pickup: pickupResult.data,
                order_status: order.shipment_status
            }, 'Pickup scheduled successfully');

        } catch (error) {
            console.error('Schedule Pickup Error:', error);
            return this.sendError('Failed to schedule pickup', 300);
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
}
