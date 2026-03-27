const http = require('http');

const data = JSON.stringify({
    asset_type: 'Desktop',
    department: 'Cardiology',
    status: 'In Stock',
    location: '1st Floor'
});

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/assets',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Branch': 'Chennai',
        'Authorization': 'Bearer test-token-we-skip' // Ideally we need a token, let me check test routes
    }
}, res => {
    let rawData = '';
    res.on('data', chunk => rawData += chunk);
    res.on('end', () => console.log('Response:', rawData));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
