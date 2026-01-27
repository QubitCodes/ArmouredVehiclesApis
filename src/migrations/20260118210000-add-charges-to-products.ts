import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('products', 'shipping_charge', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn('products', 'packing_charge', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('products', 'shipping_charge');
    await queryInterface.removeColumn('products', 'packing_charge');
  }
};
