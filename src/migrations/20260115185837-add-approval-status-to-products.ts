import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Create ENUM Type safely
      await queryInterface.sequelize.query(`
        DO $$ 
        BEGIN 
            CREATE TYPE "enum_products_approval_status" AS ENUM ('pending', 'approved', 'rejected'); 
        EXCEPTION 
            WHEN duplicate_object THEN null; 
        END $$;
      `, { transaction: t });

      // 2. Add approval_status column safely
      await queryInterface.sequelize.query(`
        ALTER TABLE "products" 
        ADD COLUMN IF NOT EXISTS "approval_status" "enum_products_approval_status" DEFAULT 'pending';
      `, { transaction: t });

      // 3. Add rejection_reason column safely
      await queryInterface.sequelize.query(`
        ALTER TABLE "products" 
        ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
      `, { transaction: t });
    });
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn('products', 'rejection_reason', { transaction: t });
      await queryInterface.removeColumn('products', 'approval_status', { transaction: t });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_approval_status";', { transaction: t });
    });
  }
};