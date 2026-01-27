import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Transaction extends Model {
  public declare id: string;
  public declare type: 'purchase' | 'commission' | 'vendor_earning' | 'payout' | 'refund' | 'adjustment';
  public declare source_user_id?: string;
  public declare destination_user_id?: string;
  public declare amount: number;
  public declare status: 'locked' | 'completed' | 'failed' | 'refunded';
  public declare unlock_at?: Date;
  public declare order_id?: string;
  public declare sub_order_id?: string;
  public declare payout_request_id?: string;
  public declare description?: string;
  public declare metadata?: any;
}

Transaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('purchase', 'commission', 'vendor_earning', 'payout', 'refund', 'adjustment'),
      allowNull: false,
    },
    source_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    destination_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('locked', 'completed', 'failed', 'refunded'),
      defaultValue: 'completed',
      allowNull: false,
    },
    unlock_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sub_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payout_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
  }
);
