import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('products', 'is_top_selling', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('products', 'is_top_selling');
  },
};
