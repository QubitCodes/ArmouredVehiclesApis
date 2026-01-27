import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        // 1. Create wishlists table
        await queryInterface.createTable('wishlists', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            session_id: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            delete_reason: {
                type: Sequelize.STRING,
                allowNull: true,
            }
        });

        // 2. Create wishlist_items table
        await queryInterface.createTable('wishlist_items', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            wishlist_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'wishlists', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
            }
        });

        // Indexes for performance
        await queryInterface.addIndex('wishlists', ['user_id']);
        await queryInterface.addIndex('wishlists', ['session_id']);
        await queryInterface.addIndex('wishlist_items', ['wishlist_id']);
        await queryInterface.addIndex('wishlist_items', ['product_id']);
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.dropTable('wishlist_items');
        await queryInterface.dropTable('wishlists');
    }
};