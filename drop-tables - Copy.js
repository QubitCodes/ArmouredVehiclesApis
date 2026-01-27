const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/armoured_vehicles', {
    dialect: 'postgres',
    logging: false,
});

async function resetTables() {
    try {
        console.log('Dropping dependent tables first...');
        try { await sequelize.query('DROP TABLE IF EXISTS "otp_verifications" CASCADE;'); } catch (e) { }
        try { await sequelize.query('DROP TABLE IF EXISTS "auth_sessions" CASCADE;'); } catch (e) { }
        try { await sequelize.query('DROP TABLE IF EXISTS "users" CASCADE;'); } catch (e) { }

        console.log('Dropping ENUM types...');
        try { await sequelize.query('DROP TYPE IF EXISTS "enum_otp_verifications_type";'); } catch (e) { }
        try { await sequelize.query('DROP TYPE IF EXISTS "enum_otp_verifications_purpose";'); } catch (e) { }
        try { await sequelize.query('DROP TYPE IF EXISTS "enum_users_user_type";'); } catch (e) { }

        console.log('Cleanup complete. Now run migration.');
    } catch (error) {
        console.error('Error dropping tables:', error);
    } finally {
        await sequelize.close();
    }
}

resetTables();
