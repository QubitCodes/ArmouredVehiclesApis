import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class PayoutRequest extends Model {
  public declare id: string;
  public declare user_id: string;
  public declare amount: number;
  public declare status: 'pending' | 'approved' | 'paid' | 'rejected';
  public declare admin_note?: string;
  public declare receipt?: string;
  public declare transaction_reference?: string;
  public declare otp_verified_at?: Date;
  public declare approved_by?: string;
  public declare approved_at?: Date;
}

PayoutRequest.init(
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'paid', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    receipt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    transaction_reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'payout_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
  }
);
