
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // 1. Create Reference Tables
    
    // Procurement Purpose
    await queryInterface.createTable('ref_procurement_purposes', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    });

    // End User Type
    await queryInterface.createTable('ref_end_user_types', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    });

    // 2. Seed Data
    await queryInterface.bulkInsert('ref_procurement_purposes', [
      { name: 'Internal Use', display_order: 1, is_active: true },
      { name: 'Resale', display_order: 2, is_active: true },
      { name: 'Government Contract', display_order: 3, is_active: true },
    ]);

    await queryInterface.bulkInsert('ref_end_user_types', [
      { name: 'Military', display_order: 1, is_active: true },
      { name: 'Law Enforcement', display_order: 2, is_active: true },
      { name: 'Commercial', display_order: 3, is_active: true },
      { name: 'Civilian', display_order: 4, is_active: true },
    ]);

    // 3. Add Columns to UserProfile with FK
    await queryInterface.addColumn('user_profiles', 'procurement_purpose', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ref_procurement_purposes',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('user_profiles', 'end_user_type', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ref_end_user_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Drop FK Columns
    await queryInterface.removeColumn('user_profiles', 'procurement_purpose');
    await queryInterface.removeColumn('user_profiles', 'end_user_type');

    // Drop Tables
    await queryInterface.dropTable('ref_procurement_purposes');
    await queryInterface.dropTable('ref_end_user_types');
  },
};
