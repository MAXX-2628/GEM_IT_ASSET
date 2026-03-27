require('dotenv').config();
const db = require('../src/config/db');

async function grantFullAccess() {
    try {
        await db.connectDB();
        const targetUser = process.argv[2] || 'admin';
        const result = await db.User.updateOne(
            { username: targetUser },
            { $set: { hasFullAccess: true } }
        );
        console.log('Update result:', result);
        console.log('✅ Admin granted full access.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

grantFullAccess();
