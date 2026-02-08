import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const tableInfo = await queryInterface.describeTable('users');
        if (tableInfo.completion_percentage) {
            await queryInterface.removeColumn('users', 'completion_percentage');
        }
    },

    down: async (queryInterface: QueryInterface) => {
        const tableInfo = await queryInterface.describeTable('users');
        if (!tableInfo.completion_percentage) {
            await queryInterface.addColumn('users', 'completion_percentage', {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            });
        }
    },
};
