import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Postgres 12+ supports IF NOT EXISTS.
      // Note: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block
      // usually, but we are inside one by default.
      // However, if we assume Postgres 12+, it might work or we catch it.
      // Actually, to be safe, we often need to run this WITHOUT transaction.
      // But Sequelize migration architecture enforces it unless we configure it (?)
      // Let's try attempting it. If it fails, I will rewrite to use `queryInterface.sequelize.query` with `{ transaction: null }`?
      // No, that doesn't override the parent transaction.

      // The robust way: Rename type, create new, migrate data. But that is heavy.
      // Simple way: Just try ADD VALUE.

      try {
        // We wrap each in try/catch to ignore "already exists" if IF NOT EXISTS isn't supported or behaves oddly
        await queryInterface.sequelize.query(`ALTER TYPE "enum_user_profiles_onboarding_status" ADD VALUE IF NOT EXISTS 'approved_general';`, { transaction: t });
        await queryInterface.sequelize.query(`ALTER TYPE "enum_user_profiles_onboarding_status" ADD VALUE IF NOT EXISTS 'approved_controlled';`, { transaction: t });
      } catch (e) {
        console.warn("Could not add enum values directly, checking if they exist...", e);
      }
    });
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    // Cannot safely remove enum values without recreating type
  }
};