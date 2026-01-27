
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class WithdrawalRequest extends Model {
  public declare id: string;
  public declare user_id: string;
  public declare amount: number;
  public declare status: 'pending' | 'approved' | 'rejected' | 'processed';
  public declare admin_note?: string;
  public declare requested_at: Date;
  public declare processed_at?: Date;
}

WithdrawalRequest.init(
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
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processed'),
      defaultValue: 'pending',
    },
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'withdrawal_requests',
    timestamps: true,
    createdAt: 'requested_at',
    updatedAt: 'updated_at',
  }
);
