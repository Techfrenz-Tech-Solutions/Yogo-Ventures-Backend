# Authentication API Documentation

## Base URL
```
http://localhost:8001/auth
```

---

## 1. User Signup

**Endpoint:** `POST /auth/signup`

**Description:** Register a new user account

### Request Body:
```json
{
  "full_name": "John Doe",
  "email_id": "john@example.com",
  "password": "SecurePass123",
  "phone_number": "9876543210"
}
```

### Field Validations:
- `full_name` - Required, max 255 characters
- `email_id` - Required, valid email format, max 255 characters, must be unique
- `password` - Required, minimum 6 characters
- `phone_number` - Optional, max 20 characters

### Success Response:
```json
{
  "status": 1,
  "message": "Account created successfully",
  "user_id": 1
}
```

### Error Responses:
```json
{
  "status": 0,
  "message": "Email already exists"
}
```

```json
{
  "status": 0,
  "message": "The full_name field is required"
}
```

### cURL Example:
```bash
curl -X POST http://localhost:8001/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"John Doe\",\"email_id\":\"john@example.com\",\"password\":\"SecurePass123\",\"phone_number\":\"9876543210\"}"
```

---

## 2. User Login

**Endpoint:** `POST /auth/login`

**Description:** Login with email and password, receive JWT token

### Request Body:
```json
{
  "email_id": "john@example.com",
  "password": "SecurePass123"
}
```

### Field Validations:
- `email_id` - Required, valid email format
- `password` - Required

### Success Response:
```json
{
  "status": 1,
  "message": "Login successful",
  "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsImZ1bGxfbmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE2NDA2MDQ4MDB9.xyz...",
  "user": {
    "id": 1,
    "full_name": "John Doe",
    "email_id": "john@example.com",
    "phone_number": "9876543210"
  }
}
```

### Error Responses:
```json
{
  "status": 0,
  "message": "Invalid email or password"
}
```

```json
{
  "status": 0,
  "message": "The email_id field is required"
}
```

### cURL Example:
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email_id\":\"john@example.com\",\"password\":\"SecurePass123\"}"
```

---

## Quick Test Flow

### 1. Create the Database Table
Run this SQL in your MySQL database:

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

### 2. Start the Server
```bash
npm start
```

### 3. Test Signup
```bash
curl -X POST http://localhost:8001/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"full_name\":\"Test User\",\"email_id\":\"test@example.com\",\"password\":\"Test@123\",\"phone_number\":\"9876543210\"}"
```

**Expected Response:**
```json
{
  "status": 1,
  "message": "Account created successfully",
  "user_id": 1
}
```

### 4. Test Login
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

---

## Testing with Postman

### Signup Request
- **Method:** POST
- **URL:** `http://localhost:8001/auth/signup`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "full_name": "Test User",
  "email_id": "test@example.com",
  "password": "Test@123",
  "phone_number": "9876543210"
}
```

### Login Request
- **Method:** POST
- **URL:** `http://localhost:8001/auth/login`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "email_id": "test@example.com",
  "password": "Test@123"
}
```

---

## Response Codes

| Status | Description |
|--------|-------------|
| 0 | Error/Failure |
| 1 | Success |

---

## Security Features

✅ **Password Hashing** - Passwords are hashed using bcrypt with 10 salt rounds  
✅ **JWT Tokens** - Secure tokens that expire after 7 days  
✅ **Email Uniqueness** - No duplicate accounts  
✅ **Input Validation** - All fields validated before processing  

---

## Common Errors

### "Email already exists"
**Cause:** Trying to signup with an email that's already registered  
**Solution:** Use a different email or login with the existing account

### "Invalid email or password"
**Cause:** Wrong credentials during login  
**Solution:** Double-check your email and password

### "The password field must be at least 6 characters"
**Cause:** Password is too short  
**Solution:** Use a password with at least 6 characters

---

## Integration Example (Frontend)

### JavaScript Fetch API

```javascript
// Signup
async function signup(fullName, email, password, phone) {
  const response = await fetch('http://localhost:8001/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: fullName,
      email_id: email,
      password: password,
      phone_number: phone
    })
  });
  
  const data = await response.json();
  
  if (data.status === 1) {
    console.log('Signup successful:', data.user_id);
  } else {
    console.error('Signup failed:', data.message);
  }
}

// Login
async function login(email, password) {
  const response = await fetch('http://localhost:8001/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email_id: email,
      password: password
    })
  });
  
  const data = await response.json();
  
  if (data.status === 1) {
    // Save token to localStorage
    localStorage.setItem('token', data.token);
    console.log('Login successful:', data.user);
  } else {
    console.error('Login failed:', data.message);
  }
}
```

---

**Last Updated:** January 2024
