import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Review Model
 * Stores product reviews with ratings
 */

interface ReviewAttributes {
	id: number;
	product_id: number;
	user_id: string;
	rating: number;
	title?: string;
	content: string;
	verified_purchase: boolean;
	helpful_count: number;
	images?: string[];
	created_at?: Date;
	updated_at?: Date;
}

interface ReviewCreationAttributes extends Optional<ReviewAttributes, 'id' | 'verified_purchase' | 'helpful_count' | 'created_at' | 'updated_at'> {}

export class Review extends Model<ReviewAttributes, ReviewCreationAttributes> implements ReviewAttributes {
	public id!: number;
	public product_id!: number;
	public user_id!: string;
	public rating!: number;
	public title?: string;
	public content!: string;
	public verified_purchase!: boolean;
	public helpful_count!: number;
	public images?: string[];

	public readonly created_at!: Date;
	public readonly updated_at!: Date;
}

Review.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		product_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		user_id: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		rating: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 1,
				max: 5,
			},
		},
		title: {
			type: DataTypes.TEXT,
		},
		content: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		verified_purchase: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		helpful_count: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		images: {
			type: DataTypes.ARRAY(DataTypes.TEXT),
		},
	},
	{
		sequelize,
		tableName: 'reviews',
		underscored: true,
		timestamps: true,
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		paranoid: false,
	}
);
