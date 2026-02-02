import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Add value to enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_user_profiles_onboarding_status" ADD VALUE 'update_needed';
    `).catch((err: any) => {
        // Ignore if already exists (postgres throws error if value exists)
        if (!err.message.includes("already exists")) {
            throw err;
        }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Cannot remove value from enum type in Postgres easily without dropping/recreating
    // We will leave it as is for down migration
    console.log("Reverting 'update_needed' enum value is not supported safely.");
  }
};
