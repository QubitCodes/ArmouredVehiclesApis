import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.changeColumn('products', 'min_order_quantity', {
            type: DataTypes.TEXT,
            allowNull: true,
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.changeColumn('products', 'min_order_quantity', {
            type: DataTypes.INTEGER,
            allowNull: true,
        });
    },
};
