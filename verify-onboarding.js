const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

async function checkLatestProfile() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Raw query to get latest modified profile
        // We select all columns
        const [profiles] = await sequelize.query(`
            SELECT * FROM user_profiles 
            ORDER BY updated_at DESC 
            LIMIT 1
        `);

        if (!profiles || profiles.length === 0) {
            console.log('No profiles found.');
            return;
        }

        const profile = profiles[0];

        // Get User
        const [users] = await sequelize.query(`
            SELECT * FROM users WHERE id = :userId
        `, {
            replacements: { userId: profile.user_id }
        });

        const user = users[0];

        const fs = require('fs');
        const output = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                type: user.user_type,
                status: user.onboarding_status,
                step: user.onboarding_step
            },
            profile: profile
        };
        fs.writeFileSync('latest-profile.json', JSON.stringify(output, null, 2));
        console.log('Data written to latest-profile.json');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkLatestProfile();
