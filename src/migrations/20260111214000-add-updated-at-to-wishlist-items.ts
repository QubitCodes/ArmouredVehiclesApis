import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        const tableInfo = await queryInterface.describeTable('wishlist_items');
        if (!tableInfo.updated_at) {
            await queryInterface.addColumn('wishlist_items', 'updated_at', {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn('NOW')
            });
        }
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        const tableInfo = await queryInterface.describeTable('wishlist_items');
        if (tableInfo.updated_at) {
            await queryInterface.removeColumn('wishlist_items', 'updated_at');
        }
    }
};