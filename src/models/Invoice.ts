import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Order } from './Order';

/**
 * Invoice Model
 * Stores generated invoices for orders
 * Two types: 'admin' (Vendor → Admin) and 'customer' (Admin → Customer)
 */

interface InvoiceAttributes {
    id: string;
    invoice_number: string;
    order_id: string;
    invoice_type: 'admin' | 'customer';

    // Addressee Details (snapshot at invoice creation)
    addressee_name: string;
    addressee_address: string;
    addressee_phone?: string | null;
    addressee_email?: string | null;

    // Issuer Details (snapshot)
    issuer_name: string;
    issuer_address: string;
    issuer_logo_url?: string | null;
    issuer_phone?: string | null;
    issuer_email?: string | null;

    // Financial
    subtotal: number;
    vat_amount: number;
    shipping_amount: number;
    packing_amount: number;
    total_amount: number;
    currency: string;

    // Meta
    comments?: string | null;
    terms_conditions?: string | null;
    payment_status: 'unpaid' | 'paid';
    access_token: string;

    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
    delete_reason?: string | null;
}

interface InvoiceCreationAttributes extends Optional<InvoiceAttributes,
    'id' | 'payment_status' | 'comments' | 'terms_conditions' |
    'addressee_phone' | 'addressee_email' | 'issuer_logo_url' |
    'issuer_phone' | 'issuer_email' | 'created_at' | 'updated_at' |
    'deleted_at' | 'delete_reason'
> { }

export class Invoice extends Model<InvoiceAttributes, InvoiceCreationAttributes> implements InvoiceAttributes {
    declare id: string;
    declare invoice_number: string;
    declare order_id: string;
    declare invoice_type: 'admin' | 'customer';

    declare addressee_name: string;
    declare addressee_address: string;
    declare addressee_phone: string | null;
    declare addressee_email: string | null;

    declare issuer_name: string;
    declare issuer_address: string;
    declare issuer_logo_url: string | null;
    declare issuer_phone: string | null;
    declare issuer_email: string | null;

    declare subtotal: number;
    declare vat_amount: number;
    declare shipping_amount: number;
    declare packing_amount: number;
    declare total_amount: number;
    declare currency: string;

    declare comments: string | null;
    declare terms_conditions: string | null;
    declare payment_status: 'unpaid' | 'paid';
    declare access_token: string;

    declare created_at: Date;
    declare updated_at: Date;
    declare deleted_at: Date | null;
    declare delete_reason: string | null;

    // Associations
    declare order?: Order;
}

Invoice.init(
    {
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
        },
        invoice_type: {
            type: DataTypes.ENUM('admin', 'customer'),
            allowNull: false,
        },

        // Addressee
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

        // Issuer
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

        // Soft delete
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        delete_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'invoices',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: true,
        deletedAt: 'deleted_at',
    }
);

// Associations handled in index.ts
