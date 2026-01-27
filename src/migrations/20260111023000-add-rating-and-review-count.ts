import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        // Check if columns exist before adding to be safe, or just add.
        // Postgres will throw error if exists.
        // We assume they don't exist based on the error.

        // Using try-catch for safety if one exists but not other (unlikely)
        try {
            await queryInterface.addColumn('products', 'rating', {
                type: Sequelize.DECIMAL(3, 2),
                defaultValue: 0,
                allowNull: true,
            });
        } catch (e) {
            console.log('Column rating might already exist', e.message);
        }

        try {
            await queryInterface.addColumn('products', 'review_count', {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: true,
            });
        } catch (e) {
            console.log('Column review_count might already exist', e.message);
        }
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.removeColumn('products', 'rating');
        await queryInterface.removeColumn('products', 'review_count');
    }
};