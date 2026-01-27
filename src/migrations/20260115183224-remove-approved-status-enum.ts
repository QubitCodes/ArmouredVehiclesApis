import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Migrate existing 'approved' data to 'approved_general'
      await queryInterface.sequelize.query(
        `UPDATE "user_profiles" SET "onboarding_status" = 'approved_general' WHERE "onboarding_status" = 'approved';`,
        { transaction: t }
      );

      // 2. Rename old type
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_user_profiles_onboarding_status" RENAME TO "enum_user_profiles_onboarding_status_old";`,
        { transaction: t }
      );

      // 3. Create new type WITHOUT 'approved'
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_user_profiles_onboarding_status" AS ENUM ('not_started', 'in_progress', 'pending_verification', 'rejected', 'approved_general', 'approved_controlled');`,
        { transaction: t }
      );

      // 3.5 Drop default value first to avoid casting error
      await queryInterface.sequelize.query(
        `ALTER TABLE "user_profiles" ALTER COLUMN "onboarding_status" DROP DEFAULT;`,
        { transaction: t }
      );

      // 4. Update column to use new type
      // We assume data is already clean (Step 1), so casting should work
      await queryInterface.sequelize.query(
        `ALTER TABLE "user_profiles" ALTER COLUMN "onboarding_status" TYPE "enum_user_profiles_onboarding_status" USING CAST("onboarding_status" AS text)::"enum_user_profiles_onboarding_status";`,
        { transaction: t }
      );

      // 5. Drop old type
      await queryInterface.sequelize.query(
        `DROP TYPE "enum_user_profiles_onboarding_status_old";`,
        { transaction: t }
      );

      // 6. Reset default value
      await queryInterface.sequelize.query(
        `ALTER TABLE "user_profiles" ALTER COLUMN "onboarding_status" SET DEFAULT 'not_started'::enum_user_profiles_onboarding_status;`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    // Revert process
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_user_profiles_onboarding_status" RENAME TO "enum_user_profiles_onboarding_status_new";`,
        { transaction: t }
      );

      // Recreate original with approved
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_user_profiles_onboarding_status" AS ENUM ('not_started', 'in_progress', 'pending_verification', 'approved', 'rejected', 'approved_general', 'approved_controlled');`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "user_profiles" ALTER COLUMN "onboarding_status" TYPE "enum_user_profiles_onboarding_status" USING "onboarding_status"::text::"enum_user_profiles_onboarding_status";`,
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        `DROP TYPE "enum_user_profiles_onboarding_status_new";`,
        { transaction: t }
      );
    });
  }
};