
const { Client } = require('pg');
const dontexist = require('dotenv'); // typo check, actually dotenv
require('dotenv').config();

async function run() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL missing');
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to DB');


        let output = '';
        const log = (msg) => { console.log(msg); output += msg + '\n'; };

        const dbUrl = process.env.DATABASE_URL || '';
        const dbName = dbUrl.split('/').pop()?.split('?')[0];
        log(`Checking DB: ${dbName}`);

        // Check columns
        const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'products'
        ORDER BY column_name;
    `);

        log('Columns in products: ' + res.rows.map(r => r.column_name).join(', '));

        // Check if rating exists
        const rating = res.rows.find(r => r.column_name === 'rating');
        const reviewCount = res.rows.find(r => r.column_name === 'review_count');


        if (rating && reviewCount) {
            log('SUCCESS: Columns exist.');
        } else {
            log('FAILURE: Columns missing.');
        }

        // Try Query
        log('Attempting Query...');
        try {
            // Mimic Sequelize: SELECT "id", "rating" FROM "products" AS "Product" ORDER BY "Product"."rating" DESC LIMIT 1;
            const q = await client.query('SELECT "Product"."id", "Product"."rating", "Product"."review_count" FROM "products" AS "Product" ORDER BY "Product"."rating" DESC LIMIT 1');
            log('Simple Query Success. Row: ' + JSON.stringify(q.rows[0]));

            log('Attempting Complex Query (with Joins)...');
            // Mimic full findAll query
            const fullQ = await client.query(`
                SELECT "Product"."id", "Product"."rating"
                FROM "products" AS "Product"
                LEFT OUTER JOIN "product_media" AS "media" ON "Product"."id" = "media"."product_id"
                LEFT OUTER JOIN "categories" AS "category" ON "Product"."category_id" = "category"."id"
                WHERE "Product"."status" = 'approved'
                ORDER BY "Product"."rating" DESC
                LIMIT 1;
            `);
            log('Complex Query Success. Row: ' + JSON.stringify(fullQ.rows[0]));

        } catch (err) {
            log('Query Failed: ' + err.message);
        }

        // Check migrations
        const migs = await client.query('SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 5');
        log('Last migrations: ' + migs.rows.map(r => r.name).join(', '));

        require('fs').writeFileSync('schema_check_result.txt', output);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
