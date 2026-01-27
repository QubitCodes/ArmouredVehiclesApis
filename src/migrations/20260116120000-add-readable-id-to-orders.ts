import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('orders', 'order_id', {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('orders', 'order_id');
  },
};
