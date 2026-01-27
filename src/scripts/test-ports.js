const http = require('http');

const ports = [3000, 3001, 3002, 3003, 3004, 3005];

ports.forEach(port => {
    const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/api/v1/categories',
        method: 'HEAD',
        timeout: 2000
    }, (res) => {
        console.log(`Port ${port}: STATUS ${res.statusCode}`);
    });

    req.on('error', (e) => {
        // console.log(`Port ${port}: ERROR ${e.message}`); 
        // Minimal output to avoid noise for closed ports
    });

    req.on('timeout', () => {
        req.destroy();
        console.log(`Port ${port}: TIMEOUT`);
    });

    req.end();
});
