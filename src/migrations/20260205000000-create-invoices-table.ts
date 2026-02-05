import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Create Invoices Table
 * Stores both 'admin' (Vendor → Admin) and 'customer' (Admin → Customer) invoices
 */
module.exports = {
    async up(queryInterface: QueryInterface) {
        await queryInterface.createTable('invoices', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            invoice_number: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },
            order_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'orders',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            invoice_type: {
                type: DataTypes.ENUM('admin', 'customer'),
                allowNull: false,
            },

            // Addressee Details
            addressee_name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            addressee_address: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            addressee_phone: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            addressee_email: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            // Issuer Details
            issuer_name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            issuer_address: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            issuer_logo_url: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            issuer_phone: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            issuer_email: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            // Financial
            subtotal: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            vat_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },
            shipping_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },
            packing_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },
            total_amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: 'AED',
            },

            // Meta
            comments: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            terms_conditions: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            payment_status: {
                type: DataTypes.ENUM('unpaid', 'paid'),
                allowNull: false,
                defaultValue: 'unpaid',
            },
            access_token: {
                type: DataTypes.STRING(64),
                allowNull: false,
                unique: true,
            },

            // Timestamps
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            delete_reason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        });

        // Add indexes for efficient queries
        await queryInterface.addIndex('invoices', ['order_id'], {
            name: 'idx_invoices_order_id',
        });
        await queryInterface.addIndex('invoices', ['invoice_number'], {
            name: 'idx_invoices_invoice_number',
        });
        await queryInterface.addIndex('invoices', ['access_token'], {
            name: 'idx_invoices_access_token',
        });
        await queryInterface.addIndex('invoices', ['invoice_type'], {
            name: 'idx_invoices_invoice_type',
        });
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.dropTable('invoices');
    },
};
