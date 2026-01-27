import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.createTable('product_pricing_tiers', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            min_quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            max_quantity: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deleted_at: {
                type: Sequelize.DATE,
            },
            delete_reason: {
                type: Sequelize.STRING,
            }
        });
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.dropTable('product_pricing_tiers');
    }
};