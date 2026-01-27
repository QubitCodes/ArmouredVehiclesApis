import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        const cartsInfo = await queryInterface.describeTable('carts');
        if (!cartsInfo.deleted_at) {
            await queryInterface.addColumn('carts', 'deleted_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
        if (!cartsInfo.delete_reason) {
            await queryInterface.addColumn('carts', 'delete_reason', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        const itemsInfo = await queryInterface.describeTable('cart_items');
        if (!itemsInfo.deleted_at) {
            await queryInterface.addColumn('cart_items', 'deleted_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
        if (!itemsInfo.delete_reason) {
            await queryInterface.addColumn('cart_items', 'delete_reason', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        const cartsInfo = await queryInterface.describeTable('carts');
        if (cartsInfo.delete_reason) await queryInterface.removeColumn('carts', 'delete_reason');
        if (cartsInfo.deleted_at) await queryInterface.removeColumn('carts', 'deleted_at');

        const itemsInfo = await queryInterface.describeTable('cart_items');
        if (itemsInfo.delete_reason) await queryInterface.removeColumn('cart_items', 'delete_reason');
        if (itemsInfo.deleted_at) await queryInterface.removeColumn('cart_items', 'deleted_at');
    }
};