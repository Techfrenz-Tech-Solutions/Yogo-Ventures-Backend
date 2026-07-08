// create-admin.js — generates the SQL to create (or reset the password of)
// an admin login. Nothing here is executed against the database directly —
// it only prints the SQL for you to run yourself, so no credentials ever
// need to live in this repo, in .env, or in git history.
//
// Usage:
//   node create-admin.js <email> <password> ["Full Name"] [role]
//
// Example:
//   node create-admin.js you@example.com "A Strong Password 123" "Site Admin" admin

const bcrypt = require('bcrypt');

async function main() {
    const [, , email, password, fullNameArg, roleArg] = process.argv;

    if (!email || !password) {
        console.log('\nUsage: node create-admin.js <email> <password> ["Full Name"] [role]\n');
        console.log('Example: node create-admin.js you@example.com "A Strong Password 123" "Site Admin" admin\n');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('Password must be at least 8 characters.');
        process.exit(1);
    }

    const fullName = fullNameArg || 'Admin';
    const role = roleArg || 'admin';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('\n========================================');
    console.log('Admin user SQL — run this against your database');
    console.log('(creates the user, or resets the password if the email already exists)');
    console.log('========================================\n');

    const sql = `INSERT INTO users (full_name, email_id, password, role, status)
VALUES ('${fullName.replace(/'/g, "''")}', '${email.replace(/'/g, "''")}', '${hashedPassword}', '${role.replace(/'/g, "''")}', 'active')
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    full_name = VALUES(full_name),
    role = VALUES(role),
    status = 'active';`;

    console.log(sql);
    console.log('\n========================================');
    console.log(`After running the SQL, log in with:\n  Email: ${email}\n  Password: (whatever you passed in — not shown here)`);
    console.log('========================================\n');
}

main();
