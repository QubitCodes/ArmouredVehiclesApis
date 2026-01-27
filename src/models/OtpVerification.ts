import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * OTP Verification Model
 * Stores OTP codes for email/phone verification with attempts tracking
 * Matches legacy otp_verifications table structure
 */

interface OtpVerificationAttributes {
	id: string;
	identifier: string;       // Email or phone number
	code: string;             // 6-digit OTP code
	type: 'email' | 'sms';
	purpose: 'login' | 'registration' | 'password_reset';
	user_id?: string;
	attempts: number;
	expires_at: Date;
	created_at?: Date;
}

interface OtpVerificationCreationAttributes extends Optional<OtpVerificationAttributes, 'id' | 'attempts' | 'created_at'> {}

export class OtpVerification extends Model<OtpVerificationAttributes, OtpVerificationCreationAttributes> implements OtpVerificationAttributes {
	declare id: string;
	declare identifier: string;
	declare code: string;
	declare type: 'email' | 'sms';
	declare purpose: 'login' | 'registration' | 'password_reset';
	declare user_id: string | undefined;
	declare attempts: number;
	declare expires_at: Date;
	declare readonly created_at: Date;
}

OtpVerification.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		identifier: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		code: {
			type: DataTypes.STRING(6),
			allowNull: false,
		},
		type: {
			type: DataTypes.ENUM('email', 'sms'),
			allowNull: false,
		},
		purpose: {
			type: DataTypes.ENUM('login', 'registration', 'password_reset'),
			allowNull: false,
		},
		user_id: {
			type: DataTypes.UUID,
		},
		attempts: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		expires_at: {
			type: DataTypes.DATE,
			allowNull: false,
		},
	},
	{
		sequelize,
		tableName: 'otp_verifications',
		timestamps: true,
		paranoid: false,
		createdAt: 'created_at',
		updatedAt: false,
	}
);
