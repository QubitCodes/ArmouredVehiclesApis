// @ts-nocheck
import { QueryInterface, Sequelize, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    await queryInterface.changeColumn('products', 'currency', {
      type: DataTypes.TEXT,
      defaultValue: 'AED',
      allowNull: true // Keeping existing nullability
    });

    // Optionally update existing null or 'USD' rows to 'AED' if desired?
    // User said "Existing data... NOT automatically converted" in plan, 
    // but typically one might want to ensuring consistency. 
    // I will stick to just changing the default for NEW records as per plan.
  },

  down: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    await queryInterface.changeColumn('products', 'currency', {
      type: DataTypes.TEXT,
      defaultValue: 'USD',
      allowNull: true
    });
  }
};
