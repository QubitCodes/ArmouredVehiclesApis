import { QueryInterface, DataTypes } from 'sequelize';

const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.addColumn('orders', 'shipment_status', {
            type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'),
            defaultValue: 'pending',
            allowNull: true,
        });
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.removeColumn('orders', 'shipment_status');
        // Note: Removing ENUM type might be database specific and skipped for safety here
    }
};