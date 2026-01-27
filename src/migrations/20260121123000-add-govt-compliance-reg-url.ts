import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // 1. Add column
    await queryInterface.addColumn('user_profiles', 'govt_compliance_reg_url', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // 2. Migrate data
    // Copy business_license_url to govt_compliance_reg_url where it exists
    await queryInterface.sequelize.query(`
      UPDATE "user_profiles" 
      SET "govt_compliance_reg_url" = "business_license_url" 
      WHERE "business_license_url" IS NOT NULL
    `);

    // 3. Clear business_license_url
    await queryInterface.sequelize.query(`
      UPDATE "user_profiles" 
      SET "business_license_url" = NULL
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverse operation: move data back if govt_compliance_reg_url is set and business_license_url is null
    // (This is lossy if both have data used subsequently, but standard for reversion here)
    await queryInterface.sequelize.query(`
      UPDATE "user_profiles" 
      SET "business_license_url" = "govt_compliance_reg_url" 
      WHERE "govt_compliance_reg_url" IS NOT NULL AND "business_license_url" IS NULL
    `);

    await queryInterface.removeColumn('user_profiles', 'govt_compliance_reg_url');
  }
};
