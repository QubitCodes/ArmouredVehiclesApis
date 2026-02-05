/**
 * FedExService - Complete FedEx API Integration
 * 
 * This service handles all FedEx API interactions including:
 * - OAuth2 Authentication with token caching
 * - Rate API for shipping cost calculations
 * - Ship API for creating shipments and labels
 * - Pickup API for scheduling pickups
 * - Track API for tracking shipments
 * 
 * @module services/FedExService
 */

import { PlatformSetting } from '../models/PlatformSetting';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * FedEx API configuration interface
 */
interface FedExConfig {
    clientId: string;
    clientSecret: string;
    accountNumber: string;
    baseUrl: string;
}

/**
 * Cached OAuth token with expiry
 */
interface CachedToken {
    accessToken: string;
    expiresAt: number; // Unix timestamp
}

/**
 * Address format for FedEx API
 */
export interface FedExAddress {
    streetLines: string[];
    city: string;
    stateOrProvinceCode: string;
    postalCode: string;
    countryCode: string;
}

/**
 * Contact information for FedEx API
 */
export interface FedExContact {
    personName: string;
    phoneNumber: string;
    emailAddress?: string;
    companyName?: string;
}

/**
 * Package weight specification
 */
export interface FedExWeight {
    units: 'KG' | 'LB';
    value: number;
}

/**
 * Package dimensions specification
 */
export interface FedExDimensions {
    length: number;
    width: number;
    height: number;
    units: 'CM' | 'IN';
}

/**
 * Rate request input
 */
export interface RateRequestInput {
    fromAddress: FedExAddress;
    fromContact: FedExContact;
    toAddress: FedExAddress;
    toContact: FedExContact;
    weight: FedExWeight;
    dimensions?: FedExDimensions;
    shipDate?: string; // YYYY-MM-DD format
}

/**
 * Rate quote result
 */
export interface RateQuote {
    serviceType: string;
    serviceName: string;
    totalCharge: number;
    currency: string;
    deliveryDate?: string;
    transitDays?: number;
}

/**
 * Shipment creation input
 */
export interface CreateShipmentInput {
    fromAddress: FedExAddress;
    fromContact: FedExContact;
    toAddress: FedExAddress;
    toContact: FedExContact;
    weight: FedExWeight;
    dimensions?: FedExDimensions;
    serviceType?: string;
    shipDate?: string;
    packageCount?: number;
}

/**
 * Shipment creation result
 */
export interface ShipmentResult {
    trackingNumber: string;
    shipmentId: string;
    labelUrl: string;
    serviceType: string;
    totalCharge: number;
    currency: string;
}

/**
 * Pickup scheduling input
 */
export interface SchedulePickupInput {
    pickupAddress: FedExAddress;
    pickupContact: FedExContact;
    pickupDate: string; // YYYY-MM-DD format
    readyTime: string; // HH:mm format (24hr)
    closeTime: string; // HH:mm format (24hr)
    packageCount: number;
    totalWeight: FedExWeight;
    carrierCode?: 'FDXE' | 'FDXG'; // Express or Ground
}

/**
 * Pickup scheduling result
 */
export interface PickupResult {
    confirmationCode: string;
    pickupDate: string;
    location?: string;
}

/**
 * Tracking event
 */
export interface TrackingEvent {
    timestamp: string;
    eventType: string;
    eventDescription: string;
    city?: string;
    stateOrProvince?: string;
    countryCode?: string;
}

/**
 * Tracking result
 */
export interface TrackingResult {
    trackingNumber: string;
    status: string;
    statusDescription: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    signedBy?: string;
    events: TrackingEvent[];
}

/**
 * Generic FedEx API response wrapper
 */
export interface FedExApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * FedEx service type mappings
 */
export const FEDEX_SERVICE_TYPES = {
    FEDEX_INTERNATIONAL_PRIORITY: 'FedEx International Priority',
    FEDEX_INTERNATIONAL_ECONOMY: 'FedEx International Economy',
    FEDEX_GROUND: 'FedEx Ground',
    FEDEX_EXPRESS_SAVER: 'FedEx Express Saver',
    FEDEX_2_DAY: 'FedEx 2Day',
    FEDEX_PRIORITY_OVERNIGHT: 'FedEx Priority Overnight',
    FEDEX_STANDARD_OVERNIGHT: 'FedEx Standard Overnight',
    FIRST_OVERNIGHT: 'FedEx First Overnight'
} as const;

/**
 * Default service type for shipments
 */
export const DEFAULT_SERVICE_TYPE = 'FEDEX_INTERNATIONAL_PRIORITY';

/**
 * Token cache TTL buffer (5 minutes before actual expiry)
 */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// ============================================================================
// FEDEX SERVICE CLASS
// ============================================================================

export class FedExService {
    private static tokenCache: CachedToken | null = null;

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Get FedEx API configuration from environment variables
     * @returns FedExConfig or null if not configured
     */
    private static getConfig(): FedExConfig | null {
        const clientId = process.env.FEDEX_KEY;
        const clientSecret = process.env.FEDEX_SECRET;
        const accountNumber = process.env.FEDEX_ACCOUNT;
        const baseUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';

        if (!clientId || !clientSecret || !accountNumber) {
            console.warn('[FedEx] Missing environment variables. Skipping FedEx integration.');
            return null;
        }

        return { clientId, clientSecret, accountNumber, baseUrl };
    }

    /**
     * Get admin company address from platform settings
     * @returns FedExAddress and FedExContact for admin
     */
    static async getAdminAddress(): Promise<{ address: FedExAddress; contact: FedExContact } | null> {
        try {
            const settings = await PlatformSetting.findAll({
                where: {
                    key: [
                        'admin_company_name',
                        'admin_company_address',
                        'admin_company_phone',
                        'admin_company_email'
                    ]
                }
            });

            const settingsMap: Record<string, string> = {};
            settings.forEach(s => {
                settingsMap[s.key] = s.value;
            });

            // Parse admin address (expected format: "Street, City, State, PostalCode, CountryCode")
            const addressParts = (settingsMap['admin_company_address'] || '').split(',').map(p => p.trim());

            return {
                address: {
                    streetLines: [addressParts[0] || 'Dubai'],
                    city: addressParts[1] || 'Dubai',
                    stateOrProvinceCode: addressParts[2] || 'DXB',
                    postalCode: addressParts[3] || '00000',
                    countryCode: addressParts[4] || 'AE'
                },
                contact: {
                    personName: 'Logistics Manager',
                    companyName: settingsMap['admin_company_name'] || 'Armoured Vehicles',
                    phoneNumber: settingsMap['admin_company_phone'] || '0000000000',
                    emailAddress: settingsMap['admin_company_email'] || 'logistics@armouredvehicles.com'
                }
            };
        } catch (error) {
            console.error('[FedEx] Failed to fetch admin address:', error);
            return null;
        }
    }

    // ========================================================================
    // AUTHENTICATION
    // ========================================================================

    /**
     * Get OAuth2 access token with caching
     * @param config FedEx configuration
     * @returns Access token or null on failure
     */
    private static async getAccessToken(config: FedExConfig): Promise<string | null> {
        // Check cache first
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
            return this.tokenCache.accessToken;
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', config.clientId);
            params.append('client_secret', config.clientSecret);

            const response = await fetch(`${config.baseUrl}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('[FedEx] Auth Failed:', error);
                return null;
            }

            const data = await response.json();

            // Cache the token (expires_in is in seconds)
            this.tokenCache = {
                accessToken: data.access_token,
                expiresAt: Date.now() + (data.expires_in * 1000) - TOKEN_EXPIRY_BUFFER_MS
            };

            return data.access_token;
        } catch (error) {
            console.error('[FedEx] Auth Network Error:', error);
            return null;
        }
    }

    /**
     * Make authenticated API request to FedEx
     * @param endpoint API endpoint path
     * @param method HTTP method
     * @param body Request body
     * @returns Parsed JSON response or null
     */
    private static async apiRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
        body?: object
    ): Promise<FedExApiResponse<T>> {
        const config = this.getConfig();
        if (!config) {
            return { success: false, error: 'FedEx not configured' };
        }

        const token = await this.getAccessToken(config);
        if (!token) {
            return { success: false, error: 'Failed to obtain access token' };
        }

        try {
            const requestOptions: RequestInit = {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-locale': 'en_US'
                }
            };

            if (body && method !== 'GET') {
                requestOptions.body = JSON.stringify(body);
            }

            const response = await fetch(`${config.baseUrl}${endpoint}`, requestOptions);
            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.errors?.[0]?.message ||
                    responseData.error_description ||
                    'Unknown FedEx API error';
                const errorCode = responseData.errors?.[0]?.code || 'UNKNOWN';

                console.error('[FedEx] API Error:', errorMessage, errorCode);
                return { success: false, error: errorMessage, errorCode };
            }

            return { success: true, data: responseData.output || responseData };
        } catch (error) {
            console.error('[FedEx] Network Error:', error);
            return { success: false, error: 'Network error occurred' };
        }
    }

    // ========================================================================
    // RATE API
    // ========================================================================

    /**
     * Get shipping rate quotes
     * @param input Rate request parameters
     * @returns Array of rate quotes or error
     */
    static async getRates(input: RateRequestInput): Promise<FedExApiResponse<RateQuote[]>> {
        const config = this.getConfig();
        if (!config) {
            return { success: false, error: 'FedEx not configured' };
        }

        const payload = {
            accountNumber: { value: config.accountNumber },
            requestedShipment: {
                shipper: {
                    address: input.fromAddress,
                    contact: input.fromContact
                },
                recipient: {
                    address: input.toAddress,
                    contact: input.toContact
                },
                shipDateStamp: input.shipDate || new Date().toISOString().split('T')[0],
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                rateRequestType: ['ACCOUNT', 'LIST'],
                requestedPackageLineItems: [
                    {
                        weight: input.weight,
                        dimensions: input.dimensions || undefined
                    }
                ]
            }
        };

        const response = await this.apiRequest<any>('/rate/v1/rates/quotes', 'POST', payload);

        if (!response.success || !response.data) {
            return { success: false, error: response.error };
        }

        // Parse rate quotes from response
        const quotes: RateQuote[] = [];
        const rateReplyDetails = response.data.rateReplyDetails || [];

        for (const detail of rateReplyDetails) {
            const ratedShipmentDetails = detail.ratedShipmentDetails?.[0];
            const totalNetCharge = ratedShipmentDetails?.totalNetCharge ||
                ratedShipmentDetails?.totalNetFedExCharge ||
                ratedShipmentDetails?.shipmentRateDetail?.totalNetCharge;

            quotes.push({
                serviceType: detail.serviceType,
                serviceName: FEDEX_SERVICE_TYPES[detail.serviceType as keyof typeof FEDEX_SERVICE_TYPES] || detail.serviceType,
                totalCharge: parseFloat(totalNetCharge?.amount || '0'),
                currency: totalNetCharge?.currency || 'USD',
                deliveryDate: detail.commit?.dateDetail?.dayFormat,
                transitDays: detail.commit?.transitDays
            });
        }

        return { success: true, data: quotes };
    }

    // ========================================================================
    // SHIP API
    // ========================================================================

    /**
     * Create a shipment and generate label
     * @param input Shipment creation parameters
     * @returns Shipment result with tracking number and label URL
     */
    static async createShipment(input: CreateShipmentInput): Promise<FedExApiResponse<ShipmentResult>> {
        const config = this.getConfig();
        if (!config) {
            return { success: false, error: 'FedEx not configured' };
        }

        const payload = {
            labelResponseOptions: 'URL_ONLY',
            accountNumber: { value: config.accountNumber },
            requestedShipment: {
                shipper: {
                    contact: input.fromContact,
                    address: input.fromAddress
                },
                recipients: [
                    {
                        contact: input.toContact,
                        address: input.toAddress
                    }
                ],
                shipDatestamp: input.shipDate || new Date().toISOString().split('T')[0],
                serviceType: input.serviceType || DEFAULT_SERVICE_TYPE,
                packagingType: 'YOUR_PACKAGING',
                pickupType: 'USE_SCHEDULED_PICKUP',
                shippingChargesPayment: {
                    paymentType: 'SENDER'
                },
                labelSpecification: {
                    imageType: 'PDF',
                    labelStockType: 'PAPER_85X11_TOP_HALF_LABEL'
                },
                requestedPackageLineItems: Array(input.packageCount || 1).fill({
                    weight: input.weight,
                    dimensions: input.dimensions || undefined
                })
            }
        };

        const response = await this.apiRequest<any>('/ship/v1/shipments', 'POST', payload);

        if (!response.success || !response.data) {
            return { success: false, error: response.error };
        }

        const completedShipment = response.data.transactionShipments?.[0];
        if (!completedShipment) {
            return { success: false, error: 'No shipment data returned' };
        }

        const pieceResponse = completedShipment.pieceResponses?.[0];
        const rateDetail = completedShipment.completedShipmentDetail?.shipmentRating?.shipmentRateDetails?.[0];

        return {
            success: true,
            data: {
                trackingNumber: completedShipment.masterTrackingNumber || pieceResponse?.trackingNumber,
                shipmentId: completedShipment.serviceId || completedShipment.masterTrackingNumber,
                labelUrl: pieceResponse?.packageDocuments?.[0]?.url || '',
                serviceType: completedShipment.serviceType,
                totalCharge: parseFloat(rateDetail?.totalNetCharge?.amount || '0'),
                currency: rateDetail?.totalNetCharge?.currency || 'USD'
            }
        };
    }

    // ========================================================================
    // PICKUP API
    // ========================================================================

    /**
     * Schedule a pickup
     * @param input Pickup scheduling parameters
     * @returns Pickup confirmation
     */
    static async schedulePickup(input: SchedulePickupInput): Promise<FedExApiResponse<PickupResult>> {
        const config = this.getConfig();
        if (!config) {
            return { success: false, error: 'FedEx not configured' };
        }

        // Construct ready timestamp (combine date and time)
        const readyTimestamp = `${input.pickupDate}T${input.readyTime}:00`;
        const closeTimestamp = `${input.pickupDate}T${input.closeTime}:00`;

        const payload = {
            associatedAccountNumber: { value: config.accountNumber },
            originDetail: {
                pickupLocation: {
                    contact: input.pickupContact,
                    address: input.pickupAddress
                },
                readyDateTimestamp: readyTimestamp,
                customerCloseTime: input.closeTime,
                pickupDateType: 'SAME_DAY' // or 'FUTURE_DAY'
            },
            carrierCode: input.carrierCode || 'FDXE',
            countryRelationships: 'DOMESTIC', // or 'INTERNATIONAL'
            pickupType: 'ON_CALL',
            totalWeight: input.totalWeight,
            packageCount: input.packageCount
        };

        const response = await this.apiRequest<any>('/pickup/v1/pickups', 'POST', payload);

        if (!response.success || !response.data) {
            return { success: false, error: response.error };
        }

        return {
            success: true,
            data: {
                confirmationCode: response.data.pickupConfirmationCode,
                pickupDate: input.pickupDate,
                location: response.data.location
            }
        };
    }

    /**
     * Cancel a scheduled pickup
     * @param confirmationCode Pickup confirmation code
     * @param scheduledDate Scheduled pickup date (YYYY-MM-DD)
     * @param location Pickup location code
     * @returns Success status
     */
    static async cancelPickup(
        confirmationCode: string,
        scheduledDate: string,
        location?: string
    ): Promise<FedExApiResponse<boolean>> {
        const config = this.getConfig();
        if (!config) {
            return { success: false, error: 'FedEx not configured' };
        }

        const payload = {
            associatedAccountNumber: { value: config.accountNumber },
            pickupConfirmationCode: confirmationCode,
            scheduledDate: scheduledDate,
            location: location,
            carrierCode: 'FDXE'
        };

        const response = await this.apiRequest<any>('/pickup/v1/pickups/cancel', 'PUT', payload);

        if (!response.success) {
            return { success: false, error: response.error };
        }

        return { success: true, data: true };
    }

    // ========================================================================
    // TRACK API
    // ========================================================================

    /**
     * Track a shipment by tracking number
     * @param trackingNumber FedEx tracking number
     * @returns Tracking information
     */
    static async trackShipment(trackingNumber: string): Promise<FedExApiResponse<TrackingResult>> {
        const payload = {
            trackingInfo: [
                {
                    trackingNumberInfo: {
                        trackingNumber: trackingNumber
                    }
                }
            ],
            includeDetailedScans: true
        };

        const response = await this.apiRequest<any>('/track/v1/trackingnumbers', 'POST', payload);

        if (!response.success || !response.data) {
            return { success: false, error: response.error };
        }

        const trackResult = response.data.completeTrackResults?.[0]?.trackResults?.[0];
        if (!trackResult) {
            return { success: false, error: 'No tracking information found' };
        }

        // Parse scan events
        const events: TrackingEvent[] = (trackResult.scanEvents || []).map((event: any) => ({
            timestamp: event.date,
            eventType: event.eventType,
            eventDescription: event.eventDescription || event.derivedStatus,
            city: event.scanLocation?.city,
            stateOrProvince: event.scanLocation?.stateOrProvinceCode,
            countryCode: event.scanLocation?.countryCode
        }));

        return {
            success: true,
            data: {
                trackingNumber: trackResult.trackingNumberInfo?.trackingNumber || trackingNumber,
                status: trackResult.latestStatusDetail?.code || 'UNKNOWN',
                statusDescription: trackResult.latestStatusDetail?.description || 'Unknown status',
                estimatedDelivery: trackResult.estimatedDeliveryTimeWindow?.window?.ends,
                actualDelivery: trackResult.actualDeliveryDetail?.actualDeliveryTimestamp,
                signedBy: trackResult.actualDeliveryDetail?.deliverySignature?.signedByName,
                events
            }
        };
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Check if FedEx is properly configured
     * @returns boolean indicating if FedEx is available
     */
    static isConfigured(): boolean {
        return this.getConfig() !== null;
    }

    /**
     * Validate FedEx credentials by attempting authentication
     * @returns Success status
     */
    static async validateCredentials(): Promise<boolean> {
        const config = this.getConfig();
        if (!config) return false;

        const token = await this.getAccessToken(config);
        return token !== null;
    }

    /**
     * Clear cached access token (useful for credential rotation)
     */
    static clearTokenCache(): void {
        this.tokenCache = null;
    }

    /**
     * Get available pickup dates (next 5 business days)
     * @returns Array of available dates in YYYY-MM-DD format
     */
    static getAvailablePickupDates(): string[] {
        const dates: string[] = [];
        const today = new Date();
        let daysAdded = 0;

        while (dates.length < 5) {
            today.setDate(today.getDate() + (daysAdded === 0 ? 0 : 1));
            daysAdded++;

            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (today.getDay() === 0 || today.getDay() === 6) {
                continue;
            }

            dates.push(today.toISOString().split('T')[0]);
        }

        return dates;
    }
}
