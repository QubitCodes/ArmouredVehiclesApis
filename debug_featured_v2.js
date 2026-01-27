const http = require('http');

const url = 'http://localhost:3002/api/v1/products/featured';

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('Status Code:', res.statusCode);
            console.log('API Status:', parsed.status);
            if (Array.isArray(parsed.data)) {
                console.log('Product Count:', parsed.data.length);
                if (parsed.data.length > 0) {
                    console.log('First Product Name:', parsed.data[0].name);
                    console.log('First Product Media Count:', parsed.data[0].media ? parsed.data[0].media.length : 0);
                }
            } else {
                console.log('Data is not an array:', parsed.data);
            }
        } catch (e) {
            console.error('Parse Error:', e.message);
            console.log('Raw Data:', data);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
