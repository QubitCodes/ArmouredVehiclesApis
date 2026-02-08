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
 * UAE Emirate state codes for FedEx (used for admin address only)
 */
const UAE_STATE_CODES: Record<string, string> = {
    'dubai': 'DU',
    'abu dhabi': 'AZ',
    'sharjah': 'SH',
    'ajman': 'AJ',
    'fujairah': 'FU',
    'ras al khaimah': 'RK',
    'umm al quwain': 'UQ',
};

/**
 * API Error messages for FedEx
 */
const API_ERROR_MESSAGES: Record<string, string> = {
    "FDSDMINIMUM.HOUR.REQUIRED": "Make sure you allow a minimum of xx hours between ready time and latest available time.",
    "LATEST.TIME.INVALID": "Invalid latest time available",
    "LOCATIONTYPE.VALUE.INVALID": "The service selected is not available for this location.",
    "PICKUPCONFIRMATION.CODE.ALREADYEXIST": "Pickup already made, cannot cancel or update.",
    "ORIGINDETAIL.READYDATETIMESTAMP.PROHIBITED": "Provided pickup ready date time stamp is not allowed. Please update and try again.",
    "PACKAGE.ACCESS.NEEDED": "Package is not accessible for request pickup time.",
    "PICKUP.LOCATION.UNAVAILABLE": "We cannot schedule a pickup for your location. Please contact FedEx Customer Service to schedule a pickup or select Drop-off to drop your package off at a FedEx location.",
    "POSTAL.CODE.ERROR": "We are not able to schedule your pickup for the postal code entered, please correct your postal code or contact FedEx Customer Service for more help.",
    "POSTALCODE.INFO.INVALID": "There is a missing or invalid postal code, or the postal code and country do not match. Please verify the information and try again.",
    "SHIPDATE.VALUE.INVALID": "The ship date is invalid. Please select the next available date to ship.",
    "ERROR.INACTIVE.ACCOUNTNUMBER": "Unable to process request. Inactive/bad account number entered.",
    "PACKAGE.COUNT.INVALID": "Invalid or blank package count.",
    "PICKUPREQUESTTYPE.VALUE.REQUIRED": "PickupRequestType array missing or empty",
    "PICKUP.WEIGHT.VALUE.INVALID": "Invalid or missing weight value.",
    "PICKUP.WEIGHT.UNITS.INVALID": "Invalid or missing weight units.",
    "PICKUP.REQUESTED.PREVIOUS.DAY": "Cannot schedule a pickup requested for a previous day.",
    "PICKUP.COUNTRY.NOT.SERVED": "COUNTRY NOT SERVED",
    "PICKUP.NUMBER.INVALID": "PICKUP MORE THAN 4 DAYS OLD",
    "PICKUP.NUMBER.EXPIRED": "PREVIOUS DAY PICKUP, CANNOT CANCEL OR UPDATE",
    "PICKUP.COUNTRY.CODE.INVALID": "MISSING OR INVALID COUNTRYCODE",
    "PICKUP.CARRIERCODE.INVALID": "Pickup CarrierCode is missing or invalid.",
    "READY.TIME.INVALID": "Invalid ready time",
    "DUPLICATE.REQUEST.CANCEL": "Duplicate cancel request",
    "SERVICETYPE.NOT.FOUND": "Service type is not provided or is invalid. Please provide a valid service type.",
    "PACKAGINGTYPE.NOT.FOUND": "Package type is not provided or is invalid. Please provide a valid package type.",
    "PICKUP.STREETLINE.MISSING": "Street line is missing",
    "PICKUP.CITY.MISSING": "City is missing.",
    "PICKUP.POSTALCODE.MISSING": "PostalCode is missing.",
    "PICKUP.STATEORPROVINCECODE.MISSING": "StateOrProvinceCode is missing.",
    "PICKUP.TRUCKTYPE.INVALID": "Please provide truck type value.",
    "PICKUP.TRAILERLENGTH.INVALID": "Please provide trailer length value.",
    "PICKUP.PACKAGE.LENGTH.INVALID": "Invalid or missing package length.",
    "PICKUP.PACKAGE.WIDTH.INVALID": "Invalid or missing package width.",
    "PICKUP.PACKAGE.HEIGHT.INVALID": "Invalid or missing package height.",
    "PICKUP.DIMENSIONS.UNITS.INVALID": "Invalid or missing dimensions units.",
    "PICKUPDATE.NOT.WORKINGDAY": "Pickup Date not a working day.",
    "UNABLE.TO.PICKUP": "Unable To Pickup before Close time.",
    "PICKUP.ALREADY.EXISTS": "A pickup already exists.",
    "PICKUPDATE.TOO.FAR": "Pickup Date too far in future.",
    "PICKUP.SERVICEANDPACKAGING.REQUIRED": "Service and Packaging are required for Express Tag.",
    "PICKUP.RESTRICTED.COUNTRY": "FedEx does not support pickup in the country that you requested.",
    "PICKUP.CARRIERCODE.REQUIRED": "Carrier code is required",
    "INCORRECT.DISPATCHDATE.FORMAT": "Please use the required dispatch date format: YYYY-MM-DD.",
    "PICKUP.UNAUTHORIZEDUSAGE.ERROR": "We are unable to process your request at the moment. Please try again later or contact FedEx Customer Service",
    "ACCOUNT.VALIDATION.ERROR": "We are unable to process this request. Please try again later or contact FedEx Customer Service.",
    "INCORRECT.SCHEDULEDDATE.FORMAT": "Please use the required scheduled date format: YYYY-MM-DD.",
    "PICKUP.CANCELLATION.NOTALLOWED": "Pickup cancellation requested for an already completed/past date pickup with confirmation ID {0} is not allowed.",
    "INCORRECT.READYTIMESTAMP.FORMAT": "Please provide a valid date time format for ex 2019-02-07T10:00:00Z",
    "INCORRECT.COMPANYCLOSETIME.FORMAT": "Please use the required company close time format - HH:MM:SS.",
    "INTERNAL.SERVER.ERROR": "We encountered an unexpected error and are working to resolve the issue. We apologize for any inconvenience. Please check back at a later time.",
    "COUNTRY.RELATIONSHIP.REQUIRED": "Country relationship is missing",
    "PICKUP.TRACKINGNUMBER.REQUIRED": "Tracking number is required while creating pickups anonymously.",
    "PICKUPCREATE.PACKAGELOCATION.INVALID": "Location is missing or invalid.",
    "WEIGHT.NONNUMERIC.ERROR": "Commodity weight is missing or invalid.Please update and try again.",
    "NO.DISPATCH.FOUND": "No Dispatch found for this account.",
    "PICKUP.NUMBEROFBUSINESSDAYS.INVALID": "Pickup number of business days is invalid. Please update and try again.",
    "PICKUP.ACCOUNTNUMBERGROUND.INVALID": "Account not ground enabled.",
    "PICKUP.ACCOUNTNUMBER.MISMATCH": "Requested account does not match existing account.",
    "PICKUPCHARGESPAYMENT.PAYORACCOUNTNUMBER.INVALID": "Payor account number is invalid.",
    "PAYMENT.TYPE.INVALID": "Payment type is invalid.",
    "PICKUPCHARGESPAYMENT.PAYORACCOUNTNUMBER.REQUIRED": "Payor account number is missing.",
    "PICKUPCHARGESPAYMENT.PAYMENTTYPE.REQUIRED": "Payment type is missing.",
    "PICKUPCHARGESPAYMENT.PAYOR.REQUIRED": "Payor is missing.",
    "PICKUPCHARGESPAYMENT.PAYORTYPE.REQUIRED": "Payor type is missing.",
    "PICKUP.ACCOUNTNUMBER.UKSERVICESNOTSUPPORTED": "Account not eligible for domestic UK service.",
    "PICKUP.ACCOUNTNUMBER.MXSERVICESNOTSUPPORTED": "Account not eligible for domestic MX service.",
    "ACCOUNT.NUMBER.INVALID": "Account number is invalid."
};

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
     * Get FedEx configuration from environment
     */
    private static getConfig(): FedExConfig | null {
        const clientId = process.env.FEDEX_KEY;
        const clientSecret = process.env.FEDEX_SECRET;
        const accountNumber = process.env.FEDEX_ACCOUNT;
        const baseUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';

        if (!clientId || !clientSecret || !accountNumber) {
            console.warn('[FedEx] Missing configuration. FEDEX_KEY, FEDEX_SECRET, and FEDEX_ACCOUNT are required.');
            return null;
        }

        return { clientId, clientSecret, accountNumber, baseUrl };
    }

    /**
     * Check if FedEx is properly configured
     */
    static isConfigured(): boolean {
        return this.getConfig() !== null;
    }

    /**
     * Get admin warehouse address from platform settings
     * Used as the shipper address for all shipments
     */
    static async getAdminAddress(): Promise<{ address: FedExAddress; contact: FedExContact } | null> {
        try {
            const settings = await PlatformSetting.findAll({
                where: {
                    key: [
                        'admin_company_name',
                        'admin_company_street',
                        'admin_company_city',
                        'admin_company_state',
                        'admin_company_postal_code',
                        'admin_company_country_code',
                        'admin_company_phone',
                        'admin_company_email',
                        'admin_company_contact_name'
                    ]
                }
            });

            const settingsMap: Record<string, string> = {};
            settings.forEach(s => {
                settingsMap[s.key] = s.value;
            });

            // Use individual settings or sensible defaults for Dubai
            const street = settingsMap['admin_company_street'] || 'Business Bay';
            const city = settingsMap['admin_company_city'] || 'Dubai';
            const state = settingsMap['admin_company_state'] || 'DU';
            const postalCode = settingsMap['admin_company_postal_code'] || '00000';
            const countryCode = settingsMap['admin_company_country_code'] || 'AE';

            return {
                address: {
                    streetLines: [street],
                    city: city,
                    stateOrProvinceCode: state,
                    postalCode: postalCode,
                    countryCode: countryCode
                },
                contact: {
                    personName: settingsMap['admin_company_contact_name'] || 'Logistics Manager',
                    companyName: settingsMap['admin_company_name'] || 'Armoured Vehicles LLC',
                    phoneNumber: settingsMap['admin_company_phone'] || '+971501234567',
                    emailAddress: settingsMap['admin_company_email'] || 'logistics@armouredvehicles.com'
                }
            };
        } catch (error) {
            console.error('[FedEx] Failed to fetch admin address:', error);
            return null;
        }
    }

    /**
     * Sanitize state/province code for FedEx API
     * Now expects ISO codes from frontend, just validates and cleans
     * @param state The state input (should be ISO code)
     * @param city The city (used as fallback)
     * @param countryCode The country code
     */
    static sanitizeStateCode(state: string, city: string, countryCode: string): string {
        const stateTrimmed = (state || '').trim();

        // Handle invalid values
        if (!stateTrimmed || stateTrimmed.toLowerCase() === 'select' || stateTrimmed.length > 20) {
            // For UAE, try to derive from city
            if (countryCode === 'AE') {
                return UAE_STATE_CODES[city.toLowerCase()] || 'DU';
            }
            // For other countries, use city abbreviation as fallback
            return city ? city.substring(0, 2).toUpperCase() : '';
        }

        // If it looks like a valid ISO code (2-5 uppercase letters), use it
        if (/^[A-Za-z]{2,5}$/.test(stateTrimmed)) {
            return stateTrimmed.toUpperCase();
        }

        // Otherwise truncate to first 2 chars
        return stateTrimmed.substring(0, 2).toUpperCase();
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
            // Create abort controller with 30 second timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const requestOptions: RequestInit = {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-locale': 'en_US'
                },
                signal: controller.signal
            };

            if (body && method !== 'GET') {
                requestOptions.body = JSON.stringify(body);

            }

            const response = await fetch(`${config.baseUrl}${endpoint}`, requestOptions);
            clearTimeout(timeoutId);

            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.errors?.[0]?.message ||
                    responseData.error_description ||
                    'Unknown FedEx API error';
                const errorCode = responseData.errors?.[0]?.code || 'UNKNOWN';

                console.error('[FedEx] API Error Response:', JSON.stringify(responseData, null, 2));
                return { success: false, error: errorMessage, errorCode };
            }

            return { success: true, data: responseData.output || responseData };
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.error('[FedEx] Request Timeout after 30 seconds');
                return { success: false, error: 'Request timed out after 30 seconds' };
            }
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

        // Determine if international shipment
        const isInternational = input.fromAddress.countryCode !== input.toAddress.countryCode;

        // Sanitize addresses for FedEx API
        const fromState = input.fromAddress.stateOrProvinceCode;
        const fromStateSanitized = (fromState && fromState.length === 2) ? fromState.toUpperCase() : undefined;

        const fromAddress = {
            ...input.fromAddress,
            stateOrProvinceCode: fromStateSanitized
        };

        // Clean up toAddress - extract just the city name if it contains comma
        let toCity = input.toAddress.city;
        if (toCity.includes(',')) {
            toCity = toCity.split(',')[0].trim();
        }

        // For international shipments, FedEx often prefers NO state code if it's not US/CA and not a valid 2-char code
        const toStateCode = input.toAddress.stateOrProvinceCode;
        const isUsCa = ['US', 'CA'].includes(input.toAddress.countryCode);

        const toStateSanitized = (toStateCode && toStateCode.length === 2) ? toStateCode.toUpperCase() : undefined;

        const toAddress: any = {
            streetLines: input.toAddress.streetLines,
            city: toCity,
            postalCode: input.toAddress.postalCode,
            countryCode: input.toAddress.countryCode
        };

        // Only add state if it's 2 chars, otherwise let FedEx derive or ignore
        if (toStateSanitized) {
            toAddress.stateOrProvinceCode = toStateSanitized;
        }

        const payload = {
            accountNumber: { value: config.accountNumber },
            requestedShipment: {
                shipper: {
                    address: fromAddress,
                    contact: input.fromContact
                },
                recipient: {
                    address: toAddress,
                    contact: input.toContact
                },
                shipDateStamp: input.shipDate || new Date().toISOString().split('T')[0],
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                packagingType: 'YOUR_PACKAGING',
                // Remove serviceType to get ALL available rates
                // serviceType: isInternational ? 'FEDEX_INTERNATIONAL_PRIORITY' : 'FEDEX_EXPRESS_SAVER', 
                rateRequestType: ['ACCOUNT', 'LIST'],
                requestedPackageLineItems: [
                    {
                        weight: input.weight,
                        dimensions: input.dimensions || { length: 20, width: 20, height: 20, units: 'CM' }
                    }
                ],
                customsClearanceDetail: isInternational ? {
                    dutiesPayment: {
                        paymentType: 'SENDER',
                        payor: {
                            responsibleParty: {
                                accountNumber: { value: config.accountNumber }
                            }
                        }
                    },
                    commodities: [
                        {
                            numberOfPieces: 1,
                            description: 'Armoured Vehicle Parts',
                            countryOfManufacture: 'AE',
                            weight: input.weight,
                            quantity: 1,
                            quantityUnits: 'EA',
                            unitPrice: { amount: 100, currency: 'USD' },
                            customsValue: { amount: 100, currency: 'USD' }
                        }
                    ]
                } : undefined
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
                }),
                customsClearanceDetail: input.fromAddress.countryCode !== input.toAddress.countryCode ? {
                    dutiesPayment: {
                        paymentType: 'SENDER',
                        payor: {
                            responsibleParty: {
                                accountNumber: { value: config.accountNumber }
                            }
                        }
                    },
                    commodities: [
                        {
                            numberOfPieces: 1,
                            description: 'Automotive Accessories',
                            countryOfManufacture: 'AE',
                            weight: input.weight,
                            quantity: 1,
                            quantityUnits: 'EA',
                            unitPrice: { amount: 100, currency: 'USD' },
                            customsValue: { amount: 100, currency: 'USD' }
                        }
                    ]
                } : undefined
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

        // Construct ready timestamp with timezone (FedEx expects Z for UTC or local offset)
        const readyTimestamp = `${input.pickupDate}T${input.readyTime}:00Z`;

        // Determine if same day or future day pickup
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const pickupDateType = input.pickupDate === today ? 'SAME_DAY' : 'FUTURE_DAY';

        // Check if international shipment (origin vs destination country)
        const isInternational = input.pickupAddress.countryCode !== 'US';



        const payload = {
            associatedAccountNumber: { value: config.accountNumber },
            originDetail: {
                pickupLocation: {
                    contact: {
                        personName: input.pickupContact.personName,
                        companyName: input.pickupContact.companyName,
                        phoneNumber: input.pickupContact.phoneNumber?.replace(/[^0-9]/g, '') || '0000000000'
                    },
                    address: {
                        streetLines: input.pickupAddress.streetLines,
                        city: input.pickupAddress.city,
                        stateOrProvinceCode: input.pickupAddress.stateOrProvinceCode,
                        postalCode: input.pickupAddress.postalCode || '00000',
                        countryCode: input.pickupAddress.countryCode
                    }
                },
                // Package location: NONE, FRONT, REAR, SIDE
                packageLocation: 'NONE',
                readyDateTimestamp: readyTimestamp,
                customerCloseTime: `${input.closeTime}:00`
            },
            totalWeight: input.totalWeight,
            carrierCode: input.carrierCode || 'FDXE',
            countryRelationship: isInternational ? 'INTERNATIONAL' : 'DOMESTIC'
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

    /**
     * Format street lines to comply with FedEx 35-character limit per line
     * @param lines Array of street lines (can be long strings)
     * @returns Array of at most 3 strings, each max 35 characters
     */
    static formatStreetLines(lines: string[]): string[] {
        // 1. Join all lines into a single string for re-splitting
        const fullAddress = lines.filter(Boolean).join(', ');

        const MAX_CHARS = 35;
        const MAX_LINES = 3;
        const result: string[] = [];

        // 2. Split by comma/space but preserve them in chunks
        // We'll use a more surgical approach: split by commas first
        const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean);

        let currentLine = '';

        for (const part of parts) {
            // If adding this part exceeds limit
            if ((currentLine ? currentLine.length + 2 : 0) + part.length > MAX_CHARS) {
                // Push current line if exists
                if (currentLine) {
                    result.push(currentLine);
                    currentLine = '';

                    // If we reached max lines, stop
                    if (result.length >= MAX_LINES) break;
                }

                // If the single part itself is too long, truncate it
                if (part.length > MAX_CHARS) {
                    result.push(part.substring(0, MAX_CHARS));
                } else {
                    currentLine = part;
                }
            } else {
                currentLine = currentLine ? `${currentLine}, ${part}` : part;
            }

            if (result.length >= MAX_LINES) break;
        }

        // Add last line if space remains
        if (currentLine && result.length < MAX_LINES) {
            result.push(currentLine);
        }

        // Final fallback: if empty or something went wrong, return at least something
        if (result.length === 0 || (result.length === 1 && !result[0])) {
            return ['Business Address'];
        }

        return result;
    }
}
