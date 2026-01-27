// @ts-nocheck
import { QueryInterface, Sequelize, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    // 1. user_wallets
    await queryInterface.createTable('user_wallets', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true // One wallet per user
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      locked_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // 2. payout_requests
    await queryInterface.createTable('payout_requests', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'paid', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      admin_note: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      receipt: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      transaction_reference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      otp_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // 3. transactions (Central Ledger)
    await queryInterface.createTable('transactions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM('purchase', 'commission', 'vendor_earning', 'payout', 'refund', 'adjustment'),
        allowNull: false
      },
      source_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      destination_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' }
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('locked', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'completed'
      },
      unlock_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      order_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      sub_order_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      payout_request_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'payout_requests', key: 'id' }
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // 4. Platform Settings
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO platform_settings (key, value, created_at, updated_at)
        VALUES ('product_return_period', '10', NOW(), NOW())
        ON CONFLICT (key) DO NOTHING;
      `);
      await queryInterface.sequelize.query(`
        INSERT INTO platform_settings (key, value, created_at, updated_at)
        VALUES ('hold_funds_during_return_period', 'true', NOW(), NOW())
        ON CONFLICT (key) DO NOTHING;
      `);
    } catch (e) {
      console.warn('Could not insert platform settings', e);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('payout_requests');
    await queryInterface.dropTable('user_wallets');
  }
};
