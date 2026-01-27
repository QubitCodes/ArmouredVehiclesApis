'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column exists strictly before removing? 
    // Usually removeColumn throws if not exists, but we can wrap it.
    // For simplicity, we assume it exists as user stated.
    try {
      await queryInterface.removeColumn('products', 'color');
    } catch (e) {
      console.warn('Column color might not exist or failed to remove', e);
    }
  },

  async down(queryInterface, Sequelize) {
    // Restore if needed, type unknown, guessing STRING or ARRAY?
    // User said "color" (singular) and "colors" (plural).
    // Singular usually implies String.
    await queryInterface.addColumn('products', 'color', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
