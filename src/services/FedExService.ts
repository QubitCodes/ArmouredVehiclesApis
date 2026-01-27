
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Address } from '../models/Address';

interface FedExConfig {
    key: string;
    secret: string;
    account: string;
    url: string;
}

export class FedExService {
    private static getConfig(): FedExConfig | null {
        const key = process.env.FEDEX_KEY;
        const secret = process.env.FEDEX_SECRET;
        const account = process.env.FEDEX_ACCOUNT;
        // Sandbox: https://apis-sandbox.fedex.com, Prod: https://apis.fedex.com
        const url = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';

        if (!key || !secret || !account) {
            console.warn('[FedEx] Missing environment variables. Skipping FedEx integration.');
            return null;
        }
        return { key, secret, account, url };
    }

    private static async getAccessToken(config: FedExConfig): Promise<string | null> {
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');
            params.append('client_id', config.key);
            params.append('client_secret', config.secret);

            const response = await fetch(`${config.url}/oauth/token`, {
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
            return data.access_token;
        } catch (error) {
            console.error('[FedEx] Auth Network Error:', error);
            return null;
        }
    }

    /**
     * Create a Shipment and return Label URL + Tracking Number
     */
    static async createShipment(order: Order, user: User, toAddress: any) {
        const config = this.getConfig();
        if (!config) return null;

        const token = await this.getAccessToken(config);
        if (!token) return null;

        try {
            // Basic payload for FedEx REST API (Ship V1)
            // https://developer.fedex.com/api/en-us/catalog/ship/v1/docs.html
            const payload = {
                requestedShipment: {
                    shipper: {
                        contact: {
                            personName: 'Logistics Manager',
                            phoneNumber: '1234567890',
                            companyName: 'Armoured Vehicles'
                        },
                        address: {
                            streetLines: ['123 Armor St'],
                            city: 'Dubai',
                            stateOrProvinceCode: 'DXB',
                            postalCode: '00000',
                            countryCode: 'AE'
                        }
                    },
                    recipients: [
                        {
                            contact: {
                                personName: user.name || 'Valued Customer',
                                phoneNumber: user.phone || '0000000000',
                                emailAddress: user.email
                            },
                            address: {
                                streetLines: [toAddress.street, toAddress.building_name].filter(Boolean),
                                city: toAddress.city,
                                stateOrProvinceCode: toAddress.state,
                                postalCode: toAddress.postal_code,
                                countryCode: toAddress.country
                            }
                        }
                    ],
                    shipDatestamp: new Date().toISOString().split('T')[0],
                    serviceType: 'FEDEX_INTERNATIONAL_PRIORITY', // Default
                    packagingType: 'YOUR_PACKAGING',
                    pickupType: 'USE_SCHEDULED_PICKUP',
                    shippingChargesPayment: {
                        paymentType: 'SENDER'
                    },
                    labelSpecification: {
                        imageType: 'PDF',
                        labelStockType: 'PAPER_85X11_TOP_HALF_LABEL'
                    },
                    requestedPackageLineItems: [
                        {
                            weight: {
                                units: 'KG',
                                value: 10 // Placeholder, normally calculated
                            }
                        }
                    ]
                },
                labelResponseOptions: 'URL_ONLY',
                accountNumber: {
                    value: config.account
                }
            };

            const response = await fetch(`${config.url}/ship/v1/shipments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.text();
                // Don't throw, just log and return null (Skip)
                console.error('[FedEx] Create Shipment Failed:', error);
                return null;
            }

            const data = await response.json();
            const completedShipment = data.output?.transactionShipments?.[0];
            
            if (!completedShipment) {
                 return null;
            }

            const masterTrackingId = completedShipment.masterTrackingNumber;
            const labelUrl = completedShipment.pieceResponses?.[0]?.packageDocuments?.[0]?.url;

            return {
                tracking_number: masterTrackingId,
                shipment_id: completedShipment.serviceId || masterTrackingId,
                label_url: labelUrl
            };

        } catch (error) {
            console.error('[FedEx] Create Shipment Network Error:', error);
            return null;
        }
    }

    /**
     * Schedule a Pickup
     * https://developer.fedex.com/api/en-us/catalog/pickup/v1/docs.html
     */
    static async schedulePickup(order: Order, address: any) {
        const config = this.getConfig();
        if (!config) return null;

        const token = await this.getAccessToken(config);
        if (!token) return null;

        try {
            const payload = {
                associatedAccountNumber: {
                    value: config.account
                },
                originDetail: {
                    pickupLocation: {
                        contact: {
                            personName: 'Logistics Manager',
                            phoneNumber: '1234567890',
                            companyName: 'Armoured Vehicles'
                        },
                        address: {
                            streetLines: ['123 Armor St'],
                            city: 'Dubai',
                            stateOrProvinceCode: 'DXB',
                            postalCode: '00000',
                            countryCode: 'AE'
                        }
                    },
                    readyDateTimestamp: new Date().toISOString() // NOW
                },
                carrierCode: 'FDXE' // Express
            };

            const response = await fetch(`${config.url}/pickup/v1/pickups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error('[FedEx] Schedule Pickup Failed:', await response.text());
                return null;
            }

            const data = await response.json();
            console.log('[FedEx] Pickup Scheduled:', data.output?.pickupConfirmationCode);
            return data.output?.pickupConfirmationCode;

        } catch (error) {
            console.error('[FedEx] Pickup Network Error:', error);
            return null;
        }
    }
}
