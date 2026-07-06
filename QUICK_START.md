# Quick Start Guide - Login Only

## ✅ What's Been Done

1. ✅ Created `authController.js` with login function only
2. ✅ Created `authRoutes.js` with login endpoint
3. ✅ Updated `app.js` to include auth routes
4. ✅ JWT token generation included

## 📋 Setup Steps

### Step 1: Create Database Table

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email_id VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Step 2: Create a Test User

Since signup is disabled, you need to manually create users.

**Option A: Using the helper script**

```bash
node create-test-user.js
```

This will output a SQL query with a hashed password. Copy and run it in MySQL.

**Option B: Manual process**

1. Generate hashed password:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword', 10).then(hash => console.log(hash));"
```

2. Insert into database:
```sql
INSERT INTO users (full_name, email_id, phone_number, password) 
VALUES ('Admin User', 'admin@example.com', '9876543210', 'PASTE_HASHED_PASSWORD_HERE');
```

### Step 3: Start Server

```bash
npm start
```

### Step 4: Test Login

```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email_id\":\"test@example.com\",\"password\":\"Test@123\"}"
```

**Expected Response:**
```json
{
  "status": 1,
  "message": "Login successful",
  "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "full_name": "Test User",
    "email_id": "test@example.com",
    "phone_number": "9876543210"
  }
}
```

## 🎯 Available Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login and get JWT token |

## 📝 Login Request Format

```json
{
  "email_id": "test@example.com",
  "password": "Test@123"
}
```

## 🔑 JWT Token Usage

The login endpoint returns a JWT token that expires in 7 days.

**Token Format:**
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Use in protected routes:**
```bash
curl -X POST http://localhost:8001/protected-route \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📂 Files Created

```
controllers/
  └── authController.js      (login logic only)

routes/
  └── authRoutes.js          (login route)

app.js                       (updated with auth routes)
create-test-user.js          (helper script to create test users)
AUTH_API_DOCUMENTATION.md    (detailed API docs)
QUICK_START.md              (this file)
```

## 🔍 Verify Setup

1. Check database table exists:
```sql
DESCRIBE users;
```

2. Check test user exists:
```sql
SELECT id, full_name, email_id FROM users;
```

3. Test login endpoint:
```bash
curl http://localhost:8001/auth/login -X POST -H "Content-Type: application/json" -d "{\"email_id\":\"test@example.com\",\"password\":\"Test@123\"}"
```

## ✨ Features

- ✅ Bcrypt password verification
- ✅ JWT token generation (7-day expiry)
- ✅ Input validation
- ✅ Proper error handling
- ❌ No signup endpoint (as requested)

## 🎉 You're Ready!

Your login system is ready. Users must be created manually in the database.

For detailed API documentation, see: `AUTH_API_DOCUMENTATION.md`
