require('dotenv').config();
const db = require('../src/config/db');

async function checkUser() {
    try {
        await db.connectDB();
        const user = await db.User.findOne({ username: 'admin' });
        console.log('--- USER DATA ---');
        console.log(JSON.stringify(user, null, 2));
        console.log('-----------------');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkUser();
