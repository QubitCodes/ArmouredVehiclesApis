
const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn('Orders', 'shipping_type', {
            type: DataTypes.INTEGER,
            allowNull: true,
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeColumn('Orders', 'shipping_type');
    },
};
