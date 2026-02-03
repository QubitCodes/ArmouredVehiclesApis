
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('orders', 'total_shipping', {
            type: Sequelize.DECIMAL(10, 2),
            defaultValue: 0,
            allowNull: false,
        });

        await queryInterface.addColumn('orders', 'total_packing', {
            type: Sequelize.DECIMAL(10, 2),
            defaultValue: 0,
            allowNull: false,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('orders', 'total_shipping');
        await queryInterface.removeColumn('orders', 'total_packing');
    }
};
