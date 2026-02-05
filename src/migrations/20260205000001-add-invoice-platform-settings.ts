import { QueryInterface } from 'sequelize';

/**
 * Migration: Add Invoice-related Platform Settings
 * Adds admin company details and invoice terms & conditions
 */
module.exports = {
    async up(queryInterface: QueryInterface) {
        const timestamp = new Date();

        await queryInterface.bulkInsert('platform_settings', [
            {
                key: 'admin_company_name',
                value: 'Armoured Vehicles LLC',
                description: 'Company name displayed on customer invoices',
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                key: 'admin_company_address',
                value: 'Business Bay, Dubai, United Arab Emirates',
                description: 'Company address displayed on customer invoices',
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                key: 'admin_company_phone',
                value: '+971-XX-XXX-XXXX',
                description: 'Company phone number for invoices',
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                key: 'admin_company_email',
                value: 'sales@armouredvehicles.com',
                description: 'Company email for invoices',
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                key: 'admin_logo_url',
                value: '',
                description: 'Company logo URL for invoices (relative path)',
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                key: 'vendor_invoice_terms',
                value: 'Payment Terms:\n• Payment due within 30 days of invoice date\n• Late payments subject to 2% monthly interest\n• All prices are in AED unless otherwise specified\n\nDispute Resolution:\n• Any disputes must be raised within 7 days of invoice receipt\n• Contact accounts@armouredvehicles.com for billing inquiries',
                description: 'Terms & Conditions for vendor-to-admin invoices',
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                key: 'customer_invoice_terms',
                value: 'Thank you for your purchase!\n\nPayment Terms:\n• All payments are processed securely\n• This invoice confirms your paid order\n\nReturns & Refunds:\n• Please refer to our returns policy on the website\n• Contact support@armouredvehicles.com for assistance\n\nWarranty:\n• Products are covered under manufacturer warranty\n• See product documentation for warranty details',
                description: 'Terms & Conditions for admin-to-customer invoices',
                created_at: timestamp,
                updated_at: timestamp
            }
        ]);
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.bulkDelete('platform_settings', {
            key: [
                'admin_company_name',
                'admin_company_address',
                'admin_company_phone',
                'admin_company_email',
                'admin_logo_url',
                'vendor_invoice_terms',
                'customer_invoice_terms'
            ]
        }, {});
    }
};
