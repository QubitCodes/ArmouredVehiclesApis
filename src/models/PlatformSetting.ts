
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class PlatformSetting extends Model {
  public declare key: string;
  public declare value: string;
  public declare description?: string;
}

PlatformSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'platform_settings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
