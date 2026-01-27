import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface FrontendAdAttributes {
    id: string;
    location: string;
    image_url?: string;
    title?: string;
    link?: string;
    is_active: boolean;
    valid_till?: Date | null;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

interface FrontendAdCreationAttributes extends Optional<FrontendAdAttributes, 'id' | 'is_active'> {}

class FrontendAd extends Model<FrontendAdAttributes, FrontendAdCreationAttributes> implements FrontendAdAttributes {
    public id!: string;
    public location!: string;
    public image_url?: string;
    public title?: string;
    public link?: string;
    public is_active!: boolean;
    public valid_till?: Date | null;
    
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
}

FrontendAd.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false,
            // 'footer', 'products_sidebar'
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        link: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        valid_till: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'frontend_ads',
        modelName: 'FrontendAd',
        timestamps: true,
        paranoid: true,
        underscored: true,
    }
);

export default FrontendAd;
