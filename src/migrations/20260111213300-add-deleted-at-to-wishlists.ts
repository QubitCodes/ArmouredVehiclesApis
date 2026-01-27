import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        const tableInfo = await queryInterface.describeTable('wishlist_items');
        if (!tableInfo.deleted_at) {
            await queryInterface.addColumn('wishlist_items', 'deleted_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
        if (!tableInfo.delete_reason) {
            await queryInterface.addColumn('wishlist_items', 'delete_reason', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }

        const wishlistTableInfo = await queryInterface.describeTable('wishlists');
        if (!wishlistTableInfo.deleted_at) {
            await queryInterface.addColumn('wishlists', 'deleted_at', {
                type: Sequelize.DATE,
                allowNull: true,
            });
        }
        if (!wishlistTableInfo.delete_reason) {
            await queryInterface.addColumn('wishlists', 'delete_reason', {
                type: Sequelize.STRING,
                allowNull: true,
            });
        }
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        // We can remove them, but checking if they exist first is safer or just remove
        await queryInterface.removeColumn('wishlist_items', 'deleted_at');
        await queryInterface.removeColumn('wishlist_items', 'delete_reason');
        await queryInterface.removeColumn('wishlists', 'deleted_at');
        await queryInterface.removeColumn('wishlists', 'delete_reason');
    }
};