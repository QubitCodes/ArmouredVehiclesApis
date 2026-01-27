import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('categories', 'image', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('categories', 'image');
  },
};
