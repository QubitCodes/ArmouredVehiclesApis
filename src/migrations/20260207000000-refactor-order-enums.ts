'use strict';

import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
    async up(queryInterface: QueryInterface) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // --- 1. Order Status Migration ---

            // Rename old enum type
            await queryInterface.sequelize.query(
                'ALTER TYPE "enum_orders_status" RENAME TO "enum_orders_status_old";',
                { transaction }
            );

            // Create new enum type
            await queryInterface.sequelize.query(
                "CREATE TYPE \"enum_orders_status\" AS ENUM ('order_received', 'approved', 'rejected', 'admin_rejected', 'cancelled');",
                { transaction }
            );

            // 1. Drop Default Value
            await queryInterface.sequelize.query(
                'ALTER TABLE "orders" ALTER COLUMN "order_status" DROP DEFAULT;',
                { transaction }
            );

            // 2. Convert column to new type with mapping
            await queryInterface.sequelize.query(`
        ALTER TABLE "orders" ALTER COLUMN "order_status" TYPE "enum_orders_status" USING (
          CASE
            WHEN "order_status"::text = 'vendor_approved' THEN 'approved'::"enum_orders_status"
            WHEN "order_status"::text = 'vendor_rejected' THEN 'rejected'::"enum_orders_status"
            WHEN "order_status"::text = 'pending_review' THEN 'order_received'::"enum_orders_status"
            WHEN "order_status"::text = 'pending_approval' THEN 'order_received'::"enum_orders_status"
            ELSE "order_status"::text::"enum_orders_status"
          END
        );
      `, { transaction });

            // 3. Set Default Value
            await queryInterface.sequelize.query(
                'ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT \'order_received\'::"enum_orders_status";',
                { transaction }
            );

            // Drop old type
            await queryInterface.sequelize.query(
                'DROP TYPE "enum_orders_status_old";',
                { transaction }
            );


            // --- 2. Shipment Status Migration ---

            // Rename old enum type
            await queryInterface.sequelize.query(
                'ALTER TYPE "enum_orders_shipment_status" RENAME TO "enum_orders_shipment_status_old";',
                { transaction }
            );

            // Create new enum type
            await queryInterface.sequelize.query(
                "CREATE TYPE \"enum_orders_shipment_status\" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled');",
                { transaction }
            );

            // Convert column to new type with mapping
            await queryInterface.sequelize.query(`
        ALTER TABLE "orders" ALTER COLUMN "shipment_status" TYPE "enum_orders_shipment_status" USING (
          CASE
            WHEN "shipment_status"::text = 'vendor_processing' THEN 'processing'::"enum_orders_shipment_status"
            WHEN "shipment_status"::text = 'admin_received' THEN 'processing'::"enum_orders_shipment_status"
            WHEN "shipment_status"::text = 'vendor_shipped' THEN 'shipped'::"enum_orders_shipment_status"
            ELSE "shipment_status"::text::"enum_orders_shipment_status"
          END
        );
      `, { transaction });

            // Drop old type
            await queryInterface.sequelize.query(
                'DROP TYPE "enum_orders_shipment_status_old";',
                { transaction }
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface: QueryInterface) {
        // Reverting is complex due to data loss in mapping. 
        // We recreate the old types and map back best-effort.
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // --- Revert Order Status ---
            await queryInterface.sequelize.query('ALTER TYPE "enum_orders_order_status" RENAME TO "enum_orders_order_status_new";', { transaction });
            await queryInterface.sequelize.query("CREATE TYPE \"enum_orders_order_status\" AS ENUM ('order_received', 'vendor_approved', 'vendor_rejected', 'approved', 'rejected', 'cancelled');", { transaction });
            await queryInterface.sequelize.query(`
            ALTER TABLE "orders" ALTER COLUMN "order_status" TYPE "enum_orders_order_status" USING (
                CASE
                    WHEN "order_status"::text = 'approved' THEN 'vendor_approved'::"enum_orders_order_status" -- Ambiguous
                    WHEN "order_status"::text = 'admin_rejected' THEN 'rejected'::"enum_orders_order_status" 
                    ELSE "order_status"::text::"enum_orders_order_status"
                END
            );
        `, { transaction });
            await queryInterface.sequelize.query('DROP TYPE "enum_orders_order_status_new";', { transaction });

            // --- Revert Shipment Status ---
            await queryInterface.sequelize.query('ALTER TYPE "enum_orders_shipment_status" RENAME TO "enum_orders_shipment_status_new";', { transaction });
            await queryInterface.sequelize.query("CREATE TYPE \"enum_orders_shipment_status\" AS ENUM ('pending', 'vendor_processing', 'vendor_shipped', 'admin_received', 'processing', 'shipped', 'delivered', 'returned', 'cancelled');", { transaction });
            await queryInterface.sequelize.query(`
            ALTER TABLE "orders" ALTER COLUMN "shipment_status" TYPE "enum_orders_shipment_status" USING (
                "shipment_status"::text::"enum_orders_shipment_status"
            );
        `, { transaction });
            await queryInterface.sequelize.query('DROP TYPE "enum_orders_shipment_status_new";', { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
