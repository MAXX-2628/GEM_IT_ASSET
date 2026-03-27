/**
 * GEM IT Asset - SSL Certificate Generator
 * Uses the 'selfsigned' package to create a self-signed cert for HTTPS.
 * Run: node scripts/generate-ssl.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Find local IP
const interfaces = os.networkInterfaces();
const altNames = [{ type: 2, value: 'localhost' }];
for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
            altNames.push({ type: 7, ip: iface.address });
            console.log(`📡 Found network IP: ${iface.address}`);
        }
    }
}

let selfsigned;
try {
    selfsigned = require('selfsigned');
} catch {
    console.error('❌ "selfsigned" package not found. Install it first:');
    console.error('   npm install selfsigned --save-dev');
    process.exit(1);
}

const attrs = [{ name: 'commonName', value: 'GEM-IT-Asset' }];
const opts = {
    keySize: 2048,
    days: 3650,
    extensions: [
        { name: 'subjectAltName', altNames }
    ]
};

console.log('🔐 Generating self-signed SSL certificate...');
const pems = selfsigned.generate(attrs, opts);

const sslDir = path.join(__dirname, '../ssl');
fs.mkdirSync(sslDir, { recursive: true });
fs.writeFileSync(path.join(sslDir, 'server.key'), pems.private);
fs.writeFileSync(path.join(sslDir, 'server.cert'), pems.cert);

console.log('✅ SSL certificate generated successfully!');
console.log(`   Key:  ${path.join(sslDir, 'server.key')}`);
console.log(`   Cert: ${path.join(sslDir, 'server.cert')}`);
console.log('');
console.log('📋 Next steps:');
console.log('   1. Set USE_HTTPS=true in backend/.env');
console.log('   2. Restart your server (manage.bat option 2)');
console.log('   3. Access via https://<your-ip>:5000 and https://<your-ip>:3000');
console.log('   ⚠️  Browsers will show a security warning for self-signed certs.');
console.log('       Click "Advanced" → "Proceed" to accept it.');
