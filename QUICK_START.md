# Quick Start Guide - Authentication Setup

## ✅ What's Been Done

1. ✅ Created `authController.js` with signup and login functions
2. ✅ Created `authRoutes.js` with 2 endpoints
3. ✅ Updated `app.js` to include auth routes
4. ✅ Created documentation

## 📋 Setup Steps

### Step 1: Create Database Table

Open MySQL and run:

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

### Step 2: Start Server

```bash
npm start
```

You should see:
```
Server running on http://192.168.0.29:8001
```

### Step 3: Test Signup

Open a new terminal and run:

```bash
curl -X POST http://localhost:8001/auth/signup -H "Content-Type: application/json" -d "{\"full_name\":\"John Doe\",\"email_id\":\"john@test.com\",\"password\":\"Pass123\",\"phone_number\":\"9876543210\"}"
```

**Expected Response:**
```json
{
  "status": 1,
  "message": "Account created successfully",
  "user_id": 1
}
```

### Step 4: Test Login

```bash
curl -X POST http://localhost:8001/auth/login -H "Content-Type: application/json" -d "{\"email_id\":\"john@test.com\",\"password\":\"Pass123\"}"
```

**Expected Response:**
```json
{
  "status": 1,
  "message": "Login successful",
  "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "email_id": "john@test.com",
    "phone_number": "9876543210"
  }
}
```

## 🎯 Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login and get JWT token |

## 📝 Request Examples

### Signup Request
```json
{
  "full_name": "John Doe",
  "email_id": "john@test.com",
  "password": "Pass123",
  "phone_number": "9876543210"
}
```

### Login Request
```json
{
  "email_id": "john@test.com",
  "password": "Pass123"
}
```

## 🔍 Verify in Database

Check if user was created:

```sql
SELECT * FROM users;
```

## ✨ Features

- ✅ Password hashing with bcrypt
- ✅ JWT token generation (7-day expiry)
- ✅ Email uniqueness validation
- ✅ Input validation
- ✅ Proper error handling

## 📂 Files Created

```
controllers/
  └── authController.js      (signup & login logic)

routes/
  └── authRoutes.js          (route definitions)

app.js                       (updated with auth routes)
AUTH_API_DOCUMENTATION.md    (detailed API docs)
QUICK_START.md              (this file)
```

## 🎉 You're Ready!

Your authentication system is now set up and ready to use!

For detailed API documentation, see: `AUTH_API_DOCUMENTATION.md`
