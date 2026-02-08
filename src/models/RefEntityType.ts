import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface RefEntityTypeAttributes {
    id: number;
    name: string;
    display_order: number;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
}

interface RefEntityTypeCreationAttributes extends Optional<RefEntityTypeAttributes, 'id' | 'display_order' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at'> { }

export class RefEntityType extends Model<RefEntityTypeAttributes, RefEntityTypeCreationAttributes> implements RefEntityTypeAttributes {
    declare public id: number;
    declare public name: string;
    declare public display_order: number;
    declare public is_active: boolean;
    declare public readonly created_at: Date;
    declare public readonly updated_at: Date;
    declare public readonly deleted_at: Date | null;
}

RefEntityType.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'ref_entity_types',
        modelName: 'RefEntityType',
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);
