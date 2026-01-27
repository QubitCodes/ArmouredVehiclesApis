import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        // Enable UUID extension
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        // --- 1. Users ---
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true,
            },
            name: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            username: {
                type: Sequelize.TEXT,
                unique: true,
            },
            email: {
                type: Sequelize.TEXT,
                allowNull: false,
                unique: true,
            },
            phone: {
                type: Sequelize.TEXT,
                unique: true,
            },
            country_code: {
                type: Sequelize.TEXT,
            },
            password: {
                type: Sequelize.TEXT,
            },
            firebase_uid: {
                type: Sequelize.TEXT,
                unique: true,
            },
            user_type: {
                type: Sequelize.ENUM('customer', 'vendor', 'admin', 'super_admin'),
                allowNull: false,
                defaultValue: 'customer',
            },
            avatar: {
                type: Sequelize.TEXT,
            },
            email_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            phone_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            completion_percentage: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            token_version: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            onboarding_step: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            suspended_at: {
                type: Sequelize.DATE,
            },
            suspended_by: {
                type: Sequelize.STRING,
            },
            suspended_reason: {
                type: Sequelize.TEXT,
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 2. Auth Sessions ---
        await queryInterface.createTable('auth_sessions', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            refresh_token_hash: { type: Sequelize.TEXT, allowNull: false },
            user_agent: Sequelize.TEXT,
            ip_address: Sequelize.TEXT,
            device_label: Sequelize.TEXT,
            is_revoked: { type: Sequelize.BOOLEAN, defaultValue: false },
            expires_at: Sequelize.DATE,
            last_used_at: Sequelize.DATE,
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // --- 3. User Profiles ---
        await queryInterface.createTable('user_profiles', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            country: Sequelize.TEXT,
            company_name: Sequelize.TEXT,
            company_email: Sequelize.TEXT,
            company_phone: Sequelize.TEXT,
            company_registration_number: Sequelize.TEXT,
            company_registration_expiry: Sequelize.DATE,
            vat_number: Sequelize.TEXT,
            website: Sequelize.TEXT,
            nature_of_business: Sequelize.TEXT,
            end_use_market: Sequelize.TEXT,
            description: Sequelize.TEXT,
            license_type: Sequelize.TEXT,
            license_number: Sequelize.TEXT,
            license_expiry: Sequelize.DATE,
            onboarding_status: {
                type: Sequelize.ENUM('not_started', 'in_progress', 'pending_verification', 'approved', 'rejected'),
                defaultValue: 'not_started'
            },
            address_line1: Sequelize.TEXT,
            address_line2: Sequelize.TEXT,
            city: Sequelize.TEXT,
            state: Sequelize.TEXT,
            postal_code: Sequelize.TEXT,
            terms_accepted: { type: Sequelize.BOOLEAN, defaultValue: false },
            compliance_terms_accepted: { type: Sequelize.BOOLEAN, defaultValue: false },
            submitted_for_approval: { type: Sequelize.BOOLEAN, defaultValue: false },
            submitted_at: Sequelize.DATE,
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 4. OTP Verifications ---
        await queryInterface.createTable('otp_verifications', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true,
            },
            user_id: { type: Sequelize.UUID, allowNull: true },
            identifier: { type: Sequelize.STRING, allowNull: false },
            type: { type: Sequelize.STRING, allowNull: false }, // email/phone
            code: { type: Sequelize.STRING(6), allowNull: false },
            purpose: { type: Sequelize.STRING, allowNull: false },
            expires_at: { type: Sequelize.DATE, allowNull: false },
            is_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
            attempts: { type: Sequelize.INTEGER, defaultValue: 0 },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            }
        });

        // --- 5. Categories ---
        await queryInterface.createTable('categories', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            name: { type: Sequelize.STRING, allowNull: false },
            slug: { type: Sequelize.STRING, allowNull: false, unique: true },
            description: Sequelize.TEXT,
            parent_id: {
                type: Sequelize.INTEGER,
                references: { model: 'categories', key: 'id' },
                onDelete: 'SET NULL',
            },
            level: { type: Sequelize.INTEGER, defaultValue: 0 },
            is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
            is_controlled: { type: Sequelize.BOOLEAN, defaultValue: false },
            image: Sequelize.TEXT,
            display_order: { type: Sequelize.INTEGER, defaultValue: 0 },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 6. Products ---
        await queryInterface.createTable('products', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            vendor_id: {
                type: Sequelize.UUID,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            status: {
                type: Sequelize.STRING,
                defaultValue: 'draft',
            },
            approval_status: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected'),
                defaultValue: 'pending',
            },
            rejection_reason: Sequelize.TEXT,
            name: Sequelize.STRING,
            description: Sequelize.TEXT,
            sku: Sequelize.STRING,
            main_category_id: {
                type: Sequelize.INTEGER,
                references: { model: 'categories', key: 'id' },
            },
            category_id: {
                type: Sequelize.INTEGER,
                references: { model: 'categories', key: 'id' },
            },
            sub_category_id: { // Assuming sub_category is also refering categories
                type: Sequelize.INTEGER,
                // references: { model: 'categories', key: 'id' }, // Optional, can enable later
            },
            base_price: Sequelize.DECIMAL(10, 2),
            currency: { type: Sequelize.STRING, defaultValue: 'USD' },
            stock: { type: Sequelize.INTEGER, defaultValue: 0 },
            rating: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0 },
            review_count: { type: Sequelize.INTEGER, defaultValue: 0 },
            vehicle_compatibility: Sequelize.TEXT,
            certifications: Sequelize.TEXT,
            country_of_origin: Sequelize.STRING,
            controlled_item_type: Sequelize.STRING, // ENUM?

            // Additional fields based on schema seen before
            drive_type: Sequelize.STRING,
            color: Sequelize.STRING,
            engine_type: Sequelize.STRING,
            transmission: Sequelize.STRING,
            fuel_type: Sequelize.STRING,
            horsepower: Sequelize.STRING,
            armouring_level: Sequelize.STRING,
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 7. Product Media ---
        await queryInterface.createTable('product_media', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            product_id: {
                type: Sequelize.INTEGER,
                references: { model: 'products', key: 'id' },
                onDelete: 'CASCADE',
            },
            type: Sequelize.STRING,
            url: { type: Sequelize.TEXT, allowNull: false },
            file_name: Sequelize.STRING,
            file_size: Sequelize.INTEGER,
            mime_type: Sequelize.STRING,
            is_cover: { type: Sequelize.BOOLEAN, defaultValue: false },
            display_order: { type: Sequelize.INTEGER, defaultValue: 0 },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 8. Orders ---
        await queryInterface.createTable('orders', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.UUID,
                references: { model: 'users', key: 'id' },
            },
            status: {
                type: Sequelize.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'pending_approval'),
                defaultValue: 'pending',
            },
            total_amount: Sequelize.DECIMAL(10, 2),
            currency: { type: Sequelize.STRING, defaultValue: 'AED' },
            type: {
                type: Sequelize.ENUM('direct', 'request'),
                defaultValue: 'direct',
            },
            payment_status: {
                type: Sequelize.ENUM('pending', 'paid', 'failed', 'refunded'),
                defaultValue: 'pending',
            },
            compliance_status: {
                type: Sequelize.ENUM('none', 'pending_review', 'approved', 'rejected'),
                defaultValue: 'none',
            },
            rejection_reason: Sequelize.TEXT,
            tracking_number: Sequelize.STRING,
            shipment_id: Sequelize.STRING,
            label_url: Sequelize.TEXT,
            status_history: Sequelize.JSONB,
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 9. Order Items ---
        await queryInterface.createTable('order_items', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('uuid_generate_v4()'),
                primaryKey: true,
            },
            order_id: {
                type: Sequelize.UUID,
                references: { model: 'orders', key: 'id' },
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.INTEGER,
                references: { model: 'products', key: 'id' },
            },
            vendor_id: {
                type: Sequelize.UUID,
                references: { model: 'users', key: 'id' },
            },
            quantity: Sequelize.INTEGER,
            price: Sequelize.DECIMAL(10, 2),
            product_name: Sequelize.STRING,
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 10. Platform Settings ---
        await queryInterface.createTable('platform_settings', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            key: { type: Sequelize.STRING, unique: true, allowNull: false },
            value: Sequelize.TEXT,
            description: Sequelize.TEXT,
            updated_by: Sequelize.UUID,
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: true,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
            }
        });

        // --- 11. Reference Tables ---
        // Helper to create simple ref tables
        const createRefTable = async (name) => {
            await queryInterface.createTable(name, {
                id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
                name: { type: Sequelize.TEXT, allowNull: false, unique: true },
                display_order: { type: Sequelize.INTEGER, defaultValue: 0 },
                is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
                deleted_at: Sequelize.DATE
            });
        };

        const refTables = [
            'ref_nature_of_business', 'ref_end_use_markets', 'ref_license_types',
            'ref_countries', 'ref_vendor_categories', 'ref_currencies',
            'ref_payment_methods', 'ref_financial_institutions', 'ref_proof_types',
            'ref_verification_methods', 'ref_product_sizes', 'ref_product_colors',
            'ref_product_features', 'ref_product_performance', 'ref_product_thickness',
            'ref_product_materials', 'ref_drive_types', 'ref_dimension_units',
            'ref_weight_units', 'ref_controlled_item_types', 'ref_pricing_terms',
            'ref_manufacturing_sources'
        ];

        for (const table of refTables) {
            // Some have extra fields but for initial schema we can add them or alter them.
            // For now, let's create base.
            // Ideally we should add the extra columns for specific tables (like code for countries).
            // To be safe and quick, I will create them with base, and let sync/migrations handle specifics
            // OR I can add columns here for known ones.

            await createRefTable(table);

            if (table === 'ref_vendor_categories') {
                try { await queryInterface.addColumn(table, 'is_controlled', { type: Sequelize.BOOLEAN, defaultValue: false }); } catch (e) { }
                try { await queryInterface.addColumn(table, 'control_note', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_countries') {
                try { await queryInterface.addColumn(table, 'code', { type: Sequelize.TEXT }); } catch (e) { }
                try { await queryInterface.addColumn(table, 'phone_code', { type: Sequelize.TEXT }); } catch (e) { }
                try { await queryInterface.addColumn(table, 'flag', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_currencies') {
                try { await queryInterface.addColumn(table, 'code', { type: Sequelize.TEXT }); } catch (e) { }
                try { await queryInterface.addColumn(table, 'symbol', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_pricing_terms') {
                try { await queryInterface.addColumn(table, 'code', { type: Sequelize.TEXT }); } catch (e) { }
                try { await queryInterface.addColumn(table, 'description', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_payment_methods') {
                try { await queryInterface.addColumn(table, 'icon', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_financial_institutions') {
                try { await queryInterface.addColumn(table, 'country_code', { type: Sequelize.TEXT }); } catch (e) { }
                try { await queryInterface.addColumn(table, 'swift_code', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_product_colors') {
                try { await queryInterface.addColumn(table, 'hex_code', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_dimension_units' || table === 'ref_weight_units') {
                try { await queryInterface.addColumn(table, 'abbreviation', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_verification_methods' || table === 'ref_controlled_item_types') {
                try { await queryInterface.addColumn(table, 'description', { type: Sequelize.TEXT }); } catch (e) { }
            }
            if (table === 'ref_verification_methods') {
                try { await queryInterface.addColumn(table, 'is_available', { type: Sequelize.BOOLEAN, defaultValue: true }); } catch (e) { }
            }
        }
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        // Reverse order
        await queryInterface.dropTable('order_items');
        await queryInterface.dropTable('orders');
        await queryInterface.dropTable('product_media');
        await queryInterface.dropTable('products');
        await queryInterface.dropTable('categories');
        await queryInterface.dropTable('otp_verifications');
        await queryInterface.dropTable('user_profiles');
        await queryInterface.dropTable('auth_sessions');
        await queryInterface.dropTable('users');
        await queryInterface.dropTable('platform_settings');

        // Drop ref tables
        const refTables = [
            'ref_nature_of_business', 'ref_end_use_markets', 'ref_license_types',
            'ref_countries', 'ref_vendor_categories', 'ref_currencies',
            'ref_payment_methods', 'ref_financial_institutions', 'ref_proof_types',
            'ref_verification_methods', 'ref_product_sizes', 'ref_product_colors',
            'ref_product_features', 'ref_product_performance', 'ref_product_thickness',
            'ref_product_materials', 'ref_drive_types', 'ref_dimension_units',
            'ref_weight_units', 'ref_controlled_item_types', 'ref_pricing_terms',
            'ref_manufacturing_sources'
        ];
        for (const table of refTables) {
            await queryInterface.dropTable(table);
        }

        // Drop Enums
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_user_type";');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_approval_status";');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
        // ... add other enums
    }
};