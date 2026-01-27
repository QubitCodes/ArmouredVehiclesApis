import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Create ref_permissions table
    await queryInterface.createTable('ref_permissions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      comment: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    // 2. Create user_permissions table
    await queryInterface.createTable('user_permissions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'ref_permissions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Add unique constraint to prevent duplicate permission assignments
    await queryInterface.addConstraint('user_permissions', {
      fields: ['user_id', 'permission_id'],
      type: 'unique',
      name: 'unique_user_permission',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('user_permissions');
    await queryInterface.dropTable('ref_permissions');
  },
};
