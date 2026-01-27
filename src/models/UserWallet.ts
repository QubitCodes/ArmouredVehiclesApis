import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class UserWallet extends Model {
  public declare id: string;
  public declare user_id: string;
  public declare balance: number;
  public declare locked_balance: number;
}

UserWallet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    locked_balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
  },
  {
    sequelize,
    tableName: 'user_wallets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
  }
);
