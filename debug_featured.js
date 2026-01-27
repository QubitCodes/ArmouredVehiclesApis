const fetch = require('node-fetch'); // unlikely to have node-fetch in raw node environment unless installed, but native fetch exists in Node 18+
// If node < 18, use http module.
const http = require('http');

const url = 'http://localhost:3002/api/v1/products/featured';

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
