require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false });

async function check() {
    const [profiles] = await sequelize.query(
        `SELECT * FROM user_profiles WHERE user_id = 'dfb279ad-3f85-44eb-abf6-dbaea1feae63'`
    );

    const [users] = await sequelize.query(
        `SELECT id, name, email, user_type, onboarding_step FROM users WHERE id = 'dfb279ad-3f85-44eb-abf6-dbaea1feae63'`
    );

    console.log('\n=== USER ===');
    console.log(JSON.stringify(users[0] || 'No user found', null, 2));

    console.log('\n=== USER PROFILE ===');
    if (profiles[0]) {
        // Print non-null fields
        const profile = profiles[0];
        const nonNullFields = Object.entries(profile).filter(([k, v]) => v !== null);
        const nullFields = Object.entries(profile).filter(([k, v]) => v === null).map(([k]) => k);

        console.log('Fields with data:');
        nonNullFields.forEach(([k, v]) => console.log(`  ${k}: ${JSON.stringify(v)}`));

        console.log('\nFields that are NULL:');
        console.log('  ' + nullFields.join(', '));
    } else {
        console.log('No profile found');
    }

    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
