
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
});

async function check() {
    try {
        const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('approval_status', 'rejection_reason');
    `);
        console.log('Found Columns:', results);
    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

check();
