'use strict';

import { QueryInterface } from 'sequelize';

/**
 * Migration: Add FedEx shipment platform settings
 * 
 * Adds the following settings:
 * - handle_vendor_shipment: Whether to handle vendor→admin shipment via FedEx
 * - handle_return_shipment: Whether to handle return shipment via FedEx
 * - vendor_shipment_pay: Who pays for vendor shipment (vendor|admin)
 * - return_shipment_pay: Who pays for return shipment (admin|customer)
 */
module.exports = {
    async up(queryInterface: QueryInterface) {
        const settings = [
            {
                key: 'handle_vendor_shipment',
                value: 'false',
                description: 'Whether to handle vendor to admin shipment via FedEx (true/false)',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                key: 'handle_return_shipment',
                value: 'false',
                description: 'Whether to handle return shipment via FedEx (true/false)',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                key: 'vendor_shipment_pay',
                value: 'admin',
                description: 'Who pays for vendor shipment: vendor or admin',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                key: 'return_shipment_pay',
                value: 'admin',
                description: 'Who pays for return shipment: admin or customer',
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        // Insert only if not exists
        for (const setting of settings) {
            const existing = await queryInterface.sequelize.query(
                `SELECT key FROM platform_settings WHERE key = '${setting.key}'`,
                { type: 'SELECT' as any }
            );

            if (!existing || (existing as any[]).length === 0) {
                await queryInterface.bulkInsert('platform_settings', [setting]);
            }
        }
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.bulkDelete('platform_settings', {
            key: [
                'handle_vendor_shipment',
                'handle_return_shipment',
                'vendor_shipment_pay',
                'return_shipment_pay'
            ]
        } as any);
    }
};
