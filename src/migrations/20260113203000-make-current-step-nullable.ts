import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        try {
            await queryInterface.changeColumn('user_profiles', 'current_step', {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: 0 // Keep default 0, but allow null if explicitly set
            });
        } catch (error) {
            // If column doesn't exist, try adding it (safety fallback)
            console.log('Column might not exist, attempting to add...');
            try {
                await queryInterface.addColumn('user_profiles', 'current_step', {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    defaultValue: 0
                });
            } catch (e) {
                console.error('Failed to add/change column:', e);
            }
        }
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        // Revert to not null (risky if data is null, but for down migration it's acceptable schema revert)
        // We'll set defaultValue 0 and allowNull false
        await queryInterface.changeColumn('user_profiles', 'current_step', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        });
    }
};