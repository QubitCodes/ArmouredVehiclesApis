
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config(); // Load from current dir

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
});

async function checkColumns() {
    try {
        const tableDesc = await sequelize.getQueryInterface().describeTable('products');
        console.log('approval_status:', tableDesc.approval_status);
        console.log('rejection_reason:', tableDesc.rejection_reason);
        console.log('Keys:', Object.keys(tableDesc));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkColumns();
