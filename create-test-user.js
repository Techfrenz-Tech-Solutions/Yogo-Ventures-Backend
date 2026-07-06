// Script to generate bcrypt hashed password for manual user creation
const bcrypt = require('bcrypt');

async function createTestUser() {
    // Change these values as needed
    const testPassword = 'Test@123';
    
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    console.log('\n========================================');
    console.log('Test User Creation Helper');
    console.log('========================================\n');
    console.log('Plain Password:', testPassword);
    console.log('\nHashed Password:\n', hashedPassword);
    console.log('\n========================================');
    console.log('SQL Query to insert test user:');
    console.log('========================================\n');
    
    const sqlQuery = `
INSERT INTO users (full_name, email_id, phone_number, password) 
VALUES (
    'Test User',
    'test@example.com',
    '9876543210',
    '${hashedPassword}'
);`;
    
    console.log(sqlQuery);
    console.log('\n========================================');
    console.log('After running the SQL, you can login with:');
    console.log('========================================\n');
    console.log('Email: test@example.com');
    console.log('Password:', testPassword);
    console.log('\n');
}

createTestUser();
