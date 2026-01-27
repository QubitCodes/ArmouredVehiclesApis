
import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('products', 'is_featured', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('products', 'is_featured');
  },
};
