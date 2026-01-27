
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('products', 'condition', {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'new'
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('products', 'condition');
  }
};
