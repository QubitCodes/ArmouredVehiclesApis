import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';
import { RefPermission } from './RefPermission';

export interface UserPermissionAttributes {
  id: string;
  user_id: string;
  permission_name: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserPermissionCreationAttributes extends Optional<UserPermissionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class UserPermission extends Model<UserPermissionAttributes, UserPermissionCreationAttributes> implements UserPermissionAttributes {
  public declare id: string;
  public declare user_id: string;
  public declare permission_name: string;
  
  public declare readonly created_at: Date;
  public declare readonly updated_at: Date;
}

UserPermission.init(
  {
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
    },
    permission_name: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'ref_permissions',
        key: 'name',
      },
      onDelete: 'CASCADE',
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'user_permissions',
    modelName: 'UserPermission',
    underscored: true,
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: 'created_at',
    paranoid: false, 
  }
);

// Define associations
User.belongsToMany(RefPermission, {
  through: UserPermission,
  foreignKey: 'user_id',
  otherKey: 'permission_name',
  as: 'permissions',
});

RefPermission.belongsToMany(User, {
  through: UserPermission,
  foreignKey: 'permission_name',
  otherKey: 'user_id',
  as: 'users',
});

// Direct associations for Pivot table queries
UserPermission.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

UserPermission.belongsTo(RefPermission, {
  foreignKey: 'permission_name',
  as: 'permission'
});
