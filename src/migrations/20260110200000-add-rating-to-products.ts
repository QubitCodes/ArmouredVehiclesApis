import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('products', 'rating', {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'review_count', {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('products', 'rating');
    await queryInterface.removeColumn('products', 'review_count');
  },
};
