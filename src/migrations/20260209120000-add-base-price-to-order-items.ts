import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.addColumn('order_items', 'base_price', {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn('order_items', 'base_price');
    }
};
