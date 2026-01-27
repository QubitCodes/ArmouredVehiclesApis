import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        // 1. Remove compliance_status
        const tableInfo = await queryInterface.describeTable('orders');
        if (tableInfo.compliance_status) {
            await queryInterface.removeColumn('orders', 'compliance_status');
        }

        // 2. Add transaction_details and shipment_details (JSONB)
        if (!tableInfo.transaction_details) {
            await queryInterface.addColumn('orders', 'transaction_details', {
                type: Sequelize.JSONB,
                defaultValue: {},
                allowNull: true
            });
        }

        if (!tableInfo.shipment_details) {
            await queryInterface.addColumn('orders', 'shipment_details', {
                type: Sequelize.JSONB,
                defaultValue: {},
                allowNull: true
            });
        }

        // 3. Make payment_status and shipment_status allow NULL
        await queryInterface.sequelize.query(`ALTER TABLE "orders" ALTER COLUMN "payment_status" DROP NOT NULL;`);
        await queryInterface.sequelize.query(`ALTER TABLE "orders" ALTER COLUMN "shipment_status" DROP NOT NULL;`);
        await queryInterface.sequelize.query(`ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT NULL;`);
        await queryInterface.sequelize.query(`ALTER TABLE "orders" ALTER COLUMN "shipment_status" SET DEFAULT NULL;`);


        // 4. Update Status Enum (Rename-Add Strategy)
        // Check if status_backup already exists (implies partial run)
        const [backupExists] = await queryInterface.sequelize.query(`SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status_backup'`);

        // Check if status is already using new type
        // But since debug script finished, 'status' IS new type.
        // Logic:
        // If status_backup does not exist, rename status -> status_backup.
        // If status_backup exists, assume rename done.

        if (backupExists.length === 0) {
            // Rename current status to backup
            // But what if status (current) is already correct?
            // We can check type.
            // Assuming if backup doesn't exist, we haven't started.
            // EXCEPT if we successfully finished and dropped backup? No, debug script skipped drop.

            // Let's check status UDT Name
            const [statusInfo] = await queryInterface.sequelize.query(`SELECT udt_name FROM information_schema.columns WHERE table_name='orders' AND column_name='status'`);
            if (statusInfo.length > 0 && statusInfo[0].udt_name === 'enum_orders_status') {
                console.log('Status column already using new enum. Skipping.');
            } else {
                await queryInterface.sequelize.query(`ALTER TABLE "orders" RENAME COLUMN "status" TO "status_backup";`);
            }
        }

        // Create Type if not exists
        const [newEnum] = await queryInterface.sequelize.query("SELECT 1 FROM pg_type WHERE typname = 'enum_orders_status'");
        if (newEnum.length === 0) {
            await queryInterface.sequelize.query(`CREATE TYPE "enum_orders_status" AS ENUM ('pending_review', 'pending_approval', 'rejected', 'approved', 'cancelled');`);
        }

        // Add new Status Column if not exists
        const [statusCol] = await queryInterface.sequelize.query(`SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status'`);
        if (statusCol.length === 0) {
            await queryInterface.sequelize.query(`ALTER TABLE "orders" ADD COLUMN "status" "enum_orders_status" DEFAULT 'pending_review';`);
        }

        // Update Data
        // Check if status_backup exists to pull data from
        const [backupCheck] = await queryInterface.sequelize.query(`SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status_backup'`);
        if (backupCheck.length > 0) {
            await queryInterface.sequelize.query(`
          UPDATE "orders" 
          SET "status" = CASE 
              WHEN status_backup::text = 'pending' THEN 'pending_review'::enum_orders_status
              WHEN status_backup::text = 'processing' THEN 'approved'::enum_orders_status
              WHEN status_backup::text = 'shipped' THEN 'approved'::enum_orders_status
              WHEN status_backup::text = 'delivered' THEN 'approved'::enum_orders_status
              WHEN status_backup::text = 'pending_approval' THEN 'pending_approval'::enum_orders_status
              WHEN status_backup::text = 'cancelled' THEN 'cancelled'::enum_orders_status
              WHEN status_backup::text = 'pending_review' THEN 'pending_review'::enum_orders_status
              WHEN status_backup::text = 'approved' THEN 'approved'::enum_orders_status
              WHEN status_backup::text = 'rejected' THEN 'rejected'::enum_orders_status
              ELSE 'pending_review'::enum_orders_status
          END
          WHERE status_backup IS NOT NULL;
        `);

            // Drop backup
            await queryInterface.sequelize.query(`ALTER TABLE "orders" DROP COLUMN "status_backup";`);
        }

        // Clean up old enum types if they exist?
        await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_orders_status_old";`);
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        // Revert logic omitted
    }
};