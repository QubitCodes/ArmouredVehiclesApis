import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.removeColumn('products', 'image');
        await queryInterface.removeColumn('products', 'gallery');
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.addColumn('products', 'image', {
            type: Sequelize.TEXT,
            allowNull: true,
        });
        await queryInterface.addColumn('products', 'gallery', {
            type: Sequelize.ARRAY(Sequelize.TEXT),
            allowNull: true,
        });
    }
};