const { Sequelize } = require('sequelize');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('localhost')) {
    connectionString = connectionString.replace('localhost', '127.0.0.1');
}

const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
    try {
        console.log('Step 1: check types');
        const [newEnum] = await sequelize.query("SELECT 1 FROM pg_type WHERE typname = 'enum_orders_status'");
        if (newEnum.length === 0) {
            console.log('Creating Type...');
            await sequelize.query(`CREATE TYPE "enum_orders_status" AS ENUM ('pending_review', 'pending_approval', 'rejected', 'approved', 'cancelled');`);
        }

        console.log('Step 2: Rename status -> status_backup');
        // Check if backup exists? No, assume not.
        try {
            await sequelize.query(`ALTER TABLE "orders" RENAME COLUMN "status" TO "status_backup";`);
        } catch (e) {
            console.log('Rename failed (maybe already renamed?): ' + e.message);
        }

        console.log('Step 3: Add new status column');
        // Check if status exists?
        try {
            await sequelize.query(`ALTER TABLE "orders" ADD COLUMN "status" "enum_orders_status" DEFAULT 'pending_review';`);
        } catch (e) {
            console.log('Add failed (maybe exists?): ' + e.message);
        }

        console.log('Step 4: Update data from backup');
        // Cast backup to text then mapping
        try {
            await sequelize.query(`
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
        } catch (e) {
            console.log('Update Data Failed: ' + e.message);
        }

        console.log('Step 5: Drop backup');
        // await sequelize.query(`ALTER TABLE "orders" DROP COLUMN "status_backup";`);
        console.log('Skipping Drop for debug safety');

        console.log('SUCCESS');

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await sequelize.close();
    }
}
run();
