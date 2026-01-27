import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    await queryInterface.renameColumn('orders', 'status', 'order_status');
    await queryInterface.renameColumn('orders', 'rejection_reason', 'comments');
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    await queryInterface.renameColumn('orders', 'order_status', 'status');
    await queryInterface.renameColumn('orders', 'comments', 'rejection_reason');
  }
};