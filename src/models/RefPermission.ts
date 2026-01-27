import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RefPermissionAttributes {
  name: string;
  label: string;
  comment: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

export interface RefPermissionCreationAttributes extends Optional<RefPermissionAttributes, 'created_at' | 'updated_at' | 'deleted_at'> {}

export class RefPermission extends Model<RefPermissionAttributes, RefPermissionCreationAttributes> implements RefPermissionAttributes {
  public declare name: string;
  public declare label: string;
  public declare comment: string;
  
  public declare readonly created_at: Date;
  public declare readonly updated_at: Date;
  public declare readonly deleted_at: Date;
}

RefPermission.init(
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true,
      comment: 'Internal permission key (e.g. admin.manage)',
    },
    label: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'User friendly permission name',
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Human readable description',
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    deleted_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'ref_permissions',
    modelName: 'RefPermission',
    underscored: true,
    paranoid: true, // Soft deletes
    timestamps: true,
  }
);
