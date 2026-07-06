# Authentication API - Login Only

## Base URL
```
http://localhost:8001/auth
```

---

## Login Endpoint

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

**Invalid credentials:**
```json
{
  "status": 0,
  "message": "Invalid email or password"
}
```

**Missing fields:**
```json
{
  "status": 0,
  "message": "The email_id field is required"
}
```

**Database error:**
```json
{
  "status": 0,
  "message": "Database error"
}
```

---

## Testing

### cURL Command:
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email_id\":\"john@example.com\",\"password\":\"SecurePass123\"}"
```

### Postman Setup:
- **Method:** POST
- **URL:** `http://localhost:8001/auth/login`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "email_id": "john@example.com",
  "password": "SecurePass123"
}
```

---

## How to Create Test Users

Since signup is not available, you need to manually insert users into the database with hashed passwords.

### Option 1: Use Node.js Script

Create a file `create-user.js`:

```javascript
const bcrypt = require('bcrypt');

async function hashPassword() {
    const password = 'YourPassword123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Hashed password:', hash);
}

hashPassword();
```

Run it:
```bash
node create-user.js
```

Then insert into database:
```sql
INSERT INTO users (full_name, email_id, phone_number, password) 
VALUES ('John Doe', 'john@example.com', '9876543210', 'PASTE_HASHED_PASSWORD_HERE');
```

### Option 2: Direct SQL Insert (Example)

```sql
-- Password: Test@123
INSERT INTO users (full_name, email_id, phone_number, password) 
VALUES (
    'Admin User', 
    'admin@yogoventures.com', 
    '9876543210',
    '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12'
);
```

**Note:** Replace the password hash with an actual bcrypt hash generated using the script above.

---

## Using the JWT Token

After successful login, save the token and use it for protected routes:

```javascript
// Save token
localStorage.setItem('token', data.token);

// Use token in API requests
fetch('http://localhost:8001/api/protected-endpoint', {
    headers: {
        'Authorization': localStorage.getItem('token')
    }
});
```

---

## Token Details

- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiry:** 7 days
- **Payload:**
  ```json
  {
    "userId": 1,
    "email": "john@example.com",
    "full_name": "John Doe",
    "iat": 1640000000,
    "exp": 1640604800
  }
  ```

---

## Security Features

✅ **Password Verification** - Bcrypt password comparison  
✅ **JWT Tokens** - Secure tokens with 7-day expiration  
✅ **Input Validation** - Email and password validation  
✅ **Error Handling** - Proper error messages without exposing sensitive info  

---

## Response Codes

| Status | Description |
|--------|-------------|
| 0 | Error/Failure |
| 1 | Success |

---

## Frontend Integration Example

```javascript
async function login(email, password) {
    try {
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
            // Save token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('Login successful');
            return data;
        } else {
            console.error('Login failed:', data.message);
            alert(data.message);
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error');
        return null;
    }
}

// Usage
login('john@example.com', 'SecurePass123');
```

---

## Common Errors

### "Invalid email or password"
- Email doesn't exist in database
- Password is incorrect
- Check credentials and try again

### "The email_id field is required"
- Missing email_id in request body
- Check your request payload

### "Database error"
- Database connection issue
- Check MySQL server is running
- Verify database credentials in .env

---

**Last Updated:** January 2024
