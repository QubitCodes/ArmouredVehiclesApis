import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        // 1. Create carts table
        await queryInterface.createTable('carts', {
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
                onDelete: 'CASCADE', // If user deleted, cart deleted? Or maybe SET NULL to keep history? Let's use CASCADE for now.
            },
            session_id: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            status: {
                type: Sequelize.ENUM('active', 'abandoned', 'converted'),
                defaultValue: 'active',
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

        // Indexes for carts
        await queryInterface.addIndex('carts', ['user_id']);
        await queryInterface.addIndex('carts', ['session_id']);

        // 2. Create cart_items table
        await queryInterface.createTable('cart_items', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
            },
            cart_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'carts', key: 'id' },
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
            quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
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

        // Indexes for cart_items
        await queryInterface.addIndex('cart_items', ['cart_id']);
        await queryInterface.addIndex('cart_items', ['product_id']);
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.dropTable('cart_items');
        await queryInterface.dropTable('carts');
    }
};