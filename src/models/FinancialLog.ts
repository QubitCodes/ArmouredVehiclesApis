
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class FinancialLog extends Model {
  public declare id: string;
  public declare user_id: string; // Vendor or Admin (NULL for Platform/System if needed, but Admin User ID preferred)
  public declare type: 'credit' | 'debit';
  public declare category: 'sale' | 'commission' | 'withdrawal' | 'refund' | 'adjustment';
  public declare amount: number;
  public declare reference_id?: string; // Order ID, Withdrawal ID, etc.
  public declare description?: string;
}

FinancialLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('credit', 'debit'),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('sale', 'commission', 'withdrawal', 'refund', 'adjustment'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    reference_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'financial_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);
