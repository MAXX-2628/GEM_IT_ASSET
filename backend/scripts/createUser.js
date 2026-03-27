const dotenv = require('dotenv');
const path = require('path');
const db = require('../src/config/db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const createUser = async () => {
    try {
        const [, , username, password, name, email, role, assignedBranches, allowedPages, hasFullAccess] = process.argv;

        if (!username || !password || !name || !email) {
            console.error('Usage: node createUser.js <username> <password> <name> <email> [role] [assigned_branches] [allowed_pages] [is_full_access]');
            process.exit(1);
        }

        console.log('Connecting to master database...');
        await db.connectDB();
        console.log('Connected.');

        if (!db.User) {
            throw new Error('User model not initialized after connectDB()');
        }

        const newUser = await db.User.create({
            username,
            password,
            name,
            email,
            role: role || 'viewer',
            assignedBranches: assignedBranches ? assignedBranches.split(',').map(b => b.trim()) : [],
            allowedPages: allowedPages ? allowedPages.split(',').map(p => p.trim()) : [],
            hasFullAccess: hasFullAccess === 'true'
        });

        console.log('-----------------------------------');
        console.log('User created successfully in Master DB!');
        console.log(`Username: ${newUser.username}`);
        console.log(`Name:     ${newUser.name}`);
        console.log(`Email:    ${newUser.email}`);
        console.log(`Role:     ${newUser.role}`);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('Error creating user:', err.message);
        if (err.code === 11000) {
            console.error('Error: Username or Email already exists.');
        }
        process.exit(1);
    }
};

createUser();
