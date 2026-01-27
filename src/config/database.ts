import { Sequelize } from 'sequelize';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false, //process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true, // Soft deletes enabled globally
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize Connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};
