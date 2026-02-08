import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // 1. Add columns back to user_profiles
            await queryInterface.addColumn('user_profiles', 'address_line1', {
                type: DataTypes.TEXT,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('user_profiles', 'address_line2', {
                type: DataTypes.TEXT,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('user_profiles', 'state', {
                type: DataTypes.TEXT,
                allowNull: true,
            }, { transaction });

            // 2. Backfill data from user_profiles_1 (legacy/backup table)
            // We check if the legacy table exists before backfilling
            const tables = await queryInterface.showAllTables();
            if (tables.includes('user_profiles_1')) {
                await queryInterface.sequelize.query(`
					UPDATE user_profiles up
					SET 
						address_line1 = up1.address_line1,
						address_line2 = up1.address_line2,
						state = up1.state
					FROM user_profiles_1 up1
					WHERE up.user_id = up1.user_id;
				`, { transaction });
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface: QueryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('user_profiles', 'address_line1', { transaction });
            await queryInterface.removeColumn('user_profiles', 'address_line2', { transaction });
            await queryInterface.removeColumn('user_profiles', 'state', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};
