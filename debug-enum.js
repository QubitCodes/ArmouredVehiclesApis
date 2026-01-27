const { Sequelize } = require('sequelize');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('localhost')) {
    connectionString = connectionString.replace('localhost', '127.0.0.1');
}

const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

async function checkTypes() {
    try {
        const [results] = await sequelize.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'orders';
    `);
        console.log('ORDERS COLUMNS:', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}
checkTypes();
