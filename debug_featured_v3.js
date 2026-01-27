const http = require('http');

console.log('--- Starting Debug Script V3 ---');

function fetch(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3002/api/v1${path}`, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Failed to parse JSON for ' + path);
                    console.log(data);
                    resolve({});
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        // 1. Check ALL products (admin scope) to see their status
        console.log('Fetching all products (Admin scope)...');
        // Assuming admin products endpoint doesn't require auth for simple local debug if unprotected, 
        // OR the user has a public endpoint. 
        // Wait, /admin/products is protected. /products is public?
        // Let's use public /products (filtered by nothing if possible, or just raw list).
        // Or assume the debug script runs on server? No, it runs via http.
        // Protected routes return 401. I can't debug protected routes easily without token.
        // But /products/featured is public.

        // I'll try to guess if there's a public list endpoint. 
        // If not, I can only check public endpoints.

        // Let's check /products (public search).
        const products = await fetch('/products?limit=50');
        console.log('Public /products list size:', products.data ? products.data.length : 'N/A');

        if (products.data && products.data.length > 0) {
            console.log('Sample Product Statuses:');
            products.data.forEach(p => {
                console.log(`- ID: ${p.id}, Name: ${p.name}, Status:[${p.status}], Featured:[${p.is_featured}]`);
            });
        }

    } catch (e) {
        console.error(e);
    }
}

run();
