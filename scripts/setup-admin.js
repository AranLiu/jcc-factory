const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../server/.env');
const envExamplePath = path.resolve(__dirname, '../server/env.example');

if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env file...');
    require('dotenv').config({ path: envPath });
} else {
    console.log('Loading environment variables from env.example file...');
    require('dotenv').config({ path: envExamplePath });
}

// Hardcoded config to avoid .env issues during setup
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '12345678',
    database: 'jcc_factory'
};

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

async function setupAdmin() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Database connection successful.');

        const saltRounds = 10;
        console.log(`Hashing password for user: ${ADMIN_USERNAME}...`);
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);
        console.log('Password hashed.');

        console.log(`Updating password for user '${ADMIN_USERNAME}'...`);
        const [result] = await connection.execute(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [passwordHash, ADMIN_USERNAME]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Successfully updated password for admin user '${ADMIN_USERNAME}'.`);
            console.log(`You can now log in with username '${ADMIN_USERNAME}' and password '${ADMIN_PASSWORD}'.`);
        } else {
            console.warn(`⚠️  Could not find user '${ADMIN_USERNAME}'. You might need to run the database initialization script first.`);
            console.log('Attempting to insert the admin user...');
            
            const [insertResult] = await connection.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [ADMIN_USERNAME, 'admin@jccfactory.com', passwordHash]
            );

            if(insertResult.affectedRows > 0){
                console.log(`✅ Successfully created admin user '${ADMIN_USERNAME}'.`);
                console.log(`You can now log in with username '${ADMIN_USERNAME}' and password '${ADMIN_PASSWORD}'.`);
            } else {
                console.error('❌ Failed to create admin user.');
            }
        }

    } catch (error) {
        console.error('❌ Error during admin setup:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

setupAdmin(); 