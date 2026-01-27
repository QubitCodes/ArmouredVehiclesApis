
import { sequelize } from '../src/models';

async function checkSchema() {
  try {
    const tableInfo = await sequelize.getQueryInterface().describeTable('products');
    console.log(JSON.stringify(Object.keys(tableInfo), null, 2));
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
