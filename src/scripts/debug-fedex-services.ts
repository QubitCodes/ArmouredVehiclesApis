
import fetch from 'node-fetch';
import 'dotenv/config';

// Standalone FedEx Service Debugger
async function getFedExToken() {
    const clientId = process.env.FEDEX_KEY;
    const clientSecret = process.env.FEDEX_SECRET;
    const baseUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';

    if (!clientId || !clientSecret) {
        throw new Error('Missing FEDEX_KEY or FEDEX_SECRET in .env');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(`${baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!response.ok) {
        throw new Error(`Auth Failed: ${await response.text()}`);
    }

    const data: any = await response.json();
    return data.access_token;
}

async function listAllServices() {
    console.log('Fetching all available FedEx services for a sample International Shipment (Dubai -> Mumbai)...');

    try {
        const token = await getFedExToken();
        const baseUrl = process.env.FEDEX_API_URL || 'https://apis-sandbox.fedex.com';
        const accountNumber = process.env.FEDEX_ACCOUNT;

        const payload = {
            accountNumber: { value: accountNumber },
            requestedShipment: {
                shipper: {
                    address: {
                        streetLines: ["Business Bay"],
                        city: "Dubai",
                        stateOrProvinceCode: "DU",
                        postalCode: "00000",
                        countryCode: "AE"
                    },
                    contact: {
                        personName: "Admin",
                        phoneNumber: "1234567890",
                        companyName: "Armoured Vehicles"
                    }
                },
                recipient: {
                    address: {
                        streetLines: ["21 Baker Street"],
                        city: "Mumbai",
                        stateOrProvinceCode: "MH",
                        postalCode: "400001",
                        countryCode: "IN"
                    },
                    contact: {
                        personName: "Customer",
                        phoneNumber: "0987654321"
                    }
                },
                shipDateStamp: new Date().toISOString().split('T')[0],
                pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
                packagingType: 'YOUR_PACKAGING',
                rateRequestType: ['ACCOUNT', 'LIST'],
                requestedPackageLineItems: [
                    {
                        weight: { units: 'KG', value: 5 },
                        dimensions: { length: 20, width: 20, height: 20, units: 'CM' }
                    }
                ],
                customsClearanceDetail: {
                    dutiesPayment: {
                        paymentType: 'SENDER',
                        payor: {
                            responsibleParty: {
                                accountNumber: { value: accountNumber }
                            }
                        }
                    },
                    commodities: [
                        {
                            numberOfPieces: 1,
                            description: 'Armoured Vehicle Parts',
                            countryOfManufacture: 'AE',
                            weight: { units: 'KG', value: 5 },
                            quantity: 1,
                            quantityUnits: 'EA',
                            unitPrice: { amount: 100, currency: 'USD' },
                            customsValue: { amount: 100, currency: 'USD' }
                        }
                    ]
                }
            }
        };

        const response = await fetch(`${baseUrl}/rate/v1/rates/quotes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-locale': 'en_US'
            },
            body: JSON.stringify(payload)
        });

        const data: any = await response.json();

        if (data.output && data.output.rateReplyDetails) {
            console.log('\n--- Available Services ---');
            data.output.rateReplyDetails.forEach((detail: any) => {
                console.log(`- Service Type: ${detail.serviceType}`);
                console.log(`  Name: ${detail.serviceName || detail.serviceType}`);

                // Try to find charge
                const shipmentRateDetail = detail.ratedShipmentDetails?.[0]?.shipmentRateDetail;
                const charge = shipmentRateDetail?.totalNetCharge?.amount || 'N/A';
                const currency = shipmentRateDetail?.totalNetCharge?.currency || 'USD';

                console.log(`  Cost: ${currency} ${charge}`);
                console.log('---');
            });
        } else {
            console.log('No rate details found or error:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error executing script:', error);
    }
}

listAllServices();
