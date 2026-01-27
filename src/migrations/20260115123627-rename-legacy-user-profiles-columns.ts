import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    const table = 'user_profiles';
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.renameColumn(table, 'company_registration_number', 'x_company_registration_number', { transaction });
      await queryInterface.renameColumn(table, 'company_registration_expiry', 'x_company_registration_expiry', { transaction });
      await queryInterface.renameColumn(table, 'vat_number', 'x_vat_number', { transaction });
      await queryInterface.renameColumn(table, 'website', 'x_website', { transaction });
      await queryInterface.renameColumn(table, 'end_use_market', 'x_end_use_market', { transaction });
      await queryInterface.renameColumn(table, 'description', 'x_description', { transaction });
      await queryInterface.renameColumn(table, 'license_type', 'x_license_type', { transaction });
      await queryInterface.renameColumn(table, 'license_number', 'x_license_number', { transaction });
      await queryInterface.renameColumn(table, 'license_expiry', 'x_license_expiry', { transaction });
      await queryInterface.renameColumn(table, 'address_line1', 'x_address_line1', { transaction });
      await queryInterface.renameColumn(table, 'address_line2', 'x_address_line2', { transaction });
      await queryInterface.renameColumn(table, 'city', 'x_city', { transaction });
      await queryInterface.renameColumn(table, 'state', 'x_state', { transaction });
      await queryInterface.renameColumn(table, 'postal_code', 'x_postal_code', { transaction });
      await queryInterface.renameColumn(table, 'founded_year', 'x_founded_year', { transaction });
      await queryInterface.renameColumn(table, 'tax_id', 'x_tax_id', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    const table = 'user_profiles';
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.renameColumn(table, 'x_company_registration_number', 'company_registration_number', { transaction });
      await queryInterface.renameColumn(table, 'x_company_registration_expiry', 'company_registration_expiry', { transaction });
      await queryInterface.renameColumn(table, 'x_vat_number', 'vat_number', { transaction });
      await queryInterface.renameColumn(table, 'x_website', 'website', { transaction });
      await queryInterface.renameColumn(table, 'x_end_use_market', 'end_use_market', { transaction });
      await queryInterface.renameColumn(table, 'x_description', 'description', { transaction });
      await queryInterface.renameColumn(table, 'x_license_type', 'license_type', { transaction });
      await queryInterface.renameColumn(table, 'x_license_number', 'license_number', { transaction });
      await queryInterface.renameColumn(table, 'x_license_expiry', 'license_expiry', { transaction });
      await queryInterface.renameColumn(table, 'x_address_line1', 'address_line1', { transaction });
      await queryInterface.renameColumn(table, 'x_address_line2', 'address_line2', { transaction });
      await queryInterface.renameColumn(table, 'x_city', 'city', { transaction });
      await queryInterface.renameColumn(table, 'x_state', 'state', { transaction });
      await queryInterface.renameColumn(table, 'x_postal_code', 'postal_code', { transaction });
      await queryInterface.renameColumn(table, 'x_founded_year', 'founded_year', { transaction });
      await queryInterface.renameColumn(table, 'x_tax_id', 'tax_id', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};