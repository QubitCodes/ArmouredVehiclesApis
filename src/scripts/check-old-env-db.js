
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

async function run() {
    const oldEnvPath = 'c:/Users/cyber/OneDrive/Desktop/ArmouredVehiclesApis/.env';
    const config = dotenv.config({ path: oldEnvPath });

    if (config.error) {
        console.error('Could not load old .env', config.error);
        return;
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL missing in old .env');
        return;
    }

    console.log(`Checking Old Env DB: ${dbUrl.split('@')[1]}`); // Mask auth

    const client = new Client({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Old DB');

        // Check columns
        const res = await client.query(`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'products'
        ORDER BY column_name;
    `);

        console.log('Columns in products:', res.rows.map(r => r.column_name).join(', '));

        const rating = res.rows.find(r => r.column_name === 'rating');
        const count = res.rows.find(r => r.column_name === 'review_count');

        if (rating && count) {
            console.log('SUCCESS: Columns exist in Old DB.');
        } else {
            console.log('FAILURE: Columns missing in Old DB.');
        }

    } catch (e) {
        console.error('Error checking old DB:', e.message);
    } finally {
        await client.end();
    }
}

run();
