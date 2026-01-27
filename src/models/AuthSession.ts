import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

interface AuthSessionAttributes {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  ip_address?: string;
  user_agent?: string;
  device_label?: string;
  revoked_at?: Date;
  expires_at: Date;
  last_used_at?: Date;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

interface AuthSessionCreationAttributes extends Optional<AuthSessionAttributes, 'id' | 'revoked_at' | 'last_used_at'> {}

export class AuthSession extends Model<AuthSessionAttributes, AuthSessionCreationAttributes> implements AuthSessionAttributes {
  public declare id: string;
  public declare user_id: string;
  public declare refresh_token_hash: string;
  public declare ip_address: string;
  public declare user_agent: string;
  public declare device_label: string;
  public declare revoked_at: Date;
  
  public declare expires_at: Date;
  public declare last_used_at: Date;
  
  public declare readonly created_at: Date;
  public declare readonly updated_at: Date;
  public declare readonly deleted_at: Date;
}

AuthSession.init(
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
        model: User,
        key: 'id',
      },
    },
    refresh_token_hash: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ip_address: {
      type: DataTypes.STRING,
    },
    user_agent: {
      type: DataTypes.TEXT,
    },
    device_label: {
      type: DataTypes.TEXT,
    },
    revoked_at: {
      type: DataTypes.DATE,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    last_used_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'auth_sessions',
    modelName: 'AuthSession',
    underscored: true,
    timestamps: false,
    paranoid: false,
  }
);

// Define Association
User.hasMany(AuthSession, { foreignKey: 'user_id' });
AuthSession.belongsTo(User, { foreignKey: 'user_id' });
