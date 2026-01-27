
async function testPublicEndpoints() {
    try {
        console.log("Testing GET http://localhost:3001/api/v1/products/top-selling");
        const res1 = await fetch('http://localhost:3001/api/v1/products/top-selling');
        console.log('Top Selling Status:', res1.status);
        console.log('Top Selling Body:', await res1.text());

        console.log("Testing GET http://localhost:3001/api/v1/products/featured");
        const res2 = await fetch('http://localhost:3001/api/v1/products/featured');
        console.log('Featured Status:', res2.status);
        console.log('Featured Body:', await res2.text());

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testPublicEndpoints();
