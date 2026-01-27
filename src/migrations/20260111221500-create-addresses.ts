import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.createTable('addresses', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            label: {
                type: Sequelize.TEXT,
                allowNull: false,
                defaultValue: 'Home',
            },
            full_name: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            phone: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            phone_country_code: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            address_line1: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            address_line2: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            city: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            state: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            postal_code: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            country: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            is_default: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
            }
        });

        // Add index for user_id for faster lookups
        await queryInterface.addIndex('addresses', ['user_id']);
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.dropTable('addresses');
    }
};