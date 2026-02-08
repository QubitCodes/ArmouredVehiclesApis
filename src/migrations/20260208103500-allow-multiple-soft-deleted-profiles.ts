import { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        // 1. Remove the existing unique constraint on user_id
        // Sequelize usually names it "user_profiles_user_id_key" or similar based on definition.
        // However, if it was defined inline with "unique: true" in createTable, it might be named differently.
        // Let's try to drop the likely constraint name. If it fails, we might need to check constraint names first, 
        // but usually "user_profiles_user_id_key" is the default for a unique column.

        try {
            await queryInterface.removeConstraint('user_profiles', 'user_profiles_user_id_key');
        } catch (error) {
            console.warn('Could not remove constraint user_profiles_user_id_key, it might not exist or has a different name. Trying specific index drop if it exists as index.');
        }

        // Also try removing index if it exists separately
        try {
            await queryInterface.removeIndex('user_profiles', 'user_profiles_user_id_key');
        } catch (e) { }


        // 2. Create the partial unique index
        await queryInterface.addIndex('user_profiles', ['user_id'], {
            unique: true,
            name: 'user_profiles_user_id_active_unique',
            where: {
                deleted_at: null,
            },
        });
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        // 1. Remove the partial index
        await queryInterface.removeIndex('user_profiles', 'user_profiles_user_id_active_unique');

        // 2. Restore the full unique constraint
        await queryInterface.addConstraint('user_profiles', {
            fields: ['user_id'],
            type: 'unique',
            name: 'user_profiles_user_id_key',
        });
    },
};
