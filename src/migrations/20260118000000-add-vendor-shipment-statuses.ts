// @ts-nocheck
import { QueryInterface, Sequelize } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    // Add 'vendor_shipped' after 'pending'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_orders_shipment_status" ADD VALUE IF NOT EXISTS 'vendor_shipped' AFTER 'pending';
    `);

    // Add 'admin_received' after 'vendor_shipped'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_orders_shipment_status" ADD VALUE IF NOT EXISTS 'admin_received' AFTER 'vendor_shipped';
    `);
  },

  down: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    console.log('Down migration for enum add value is not safe/automatic in Postgres without type recreation. Skipping.');
  }
};
