'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('products', 'shipping_charge');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'shipping_charge', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: true
    });
  }
};
