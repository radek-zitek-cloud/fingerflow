# FingerFlow Authentication Guide

Complete guide to authentication features including local registration, Google OAuth2, 2FA, and email verification.

## 🔐 Authentication Methods

FingerFlow supports two authentication methods:

1. **Local Authentication** - Email and password registration
2. **Google OAuth2** - Sign in with Google account

## 📝 User Registration (Local)

### Endpoint
```
POST /auth/register
```

### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Response
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "8f3b7d2a1c5e9f4b...",
  "token_type": "bearer",
  "requires_2fa": false
}
```

### Flow
1. User submits email and password
2. System creates account with `email_verified=false`
3. Email verification link sent to user's email
4. Access and refresh tokens returned immediately
5. User can use the app but should verify email for full access

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## 🔑 Login (Local)

### Endpoint
```
POST /auth/login
```

### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Response (No 2FA)
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "8f3b7d2a1c5e9f4b...",
  "token_type": "bearer"
}
```

### Response (2FA Enabled)
```json
{
  "requires_2fa": true,
  "temp_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "message": "Please provide 2FA code"
}
```

### Flow
1. User submits email and password
2. System verifies credentials
3. If 2FA is disabled: returns access and refresh tokens
4. If 2FA is enabled: returns temp_token for 2FA verification step

## 🔐 Google OAuth2 Login

### Step 1: Get Authorization URL

**Endpoint:**
```
GET /auth/google/login
```

**Response:**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Frontend Action:**
Redirect user to the `authorization_url`.

### Step 2: Handle Callback

**Endpoint:**
```
GET /auth/google/callback?code=AUTHORIZATION_CODE
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "8f3b7d2a1c5e9f4b...",
  "token_type": "bearer"
}
```

### Flow
1. Frontend calls `/auth/google/login`
2. Frontend redirects user to Google authorization URL
3. User authenticates with Google
4. Google redirects back to `/auth/google/callback?code=...`
5. Backend exchanges code for Google tokens
6. Backend verifies Google ID token
7. Backend creates or updates user account
8. Returns JWT access and refresh tokens

### Configuration

Set these environment variables:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

#### Setting up Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
5. Copy Client ID and Client Secret to `.env`

## 📧 Email Verification

### Verify Email

**Endpoint:**
```
POST /auth/verify-email
```

**Request Body:**
```json
{
  "token": "abc123..."
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Email verified successfully"
}
```

### Resend Verification Email

**Endpoint:**
```
POST /auth/resend-verification
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "If an account exists, verification email has been sent"
}
```

### Flow
1. User receives verification email after registration
2. Email contains link: `http://localhost:5173/verify-email?token=ABC123`
3. Frontend extracts token and calls `/auth/verify-email`
4. User's `email_verified` flag set to `true`

## 🔄 Token Management

### Refresh Access Token

**Endpoint:**
```
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "8f3b7d2a1c5e9f4b..."
}
```

**Response:**
```json
{
  "access_token": "new_access_token...",
  "refresh_token": "new_refresh_token...",
  "token_type": "bearer"
}
```

**Token Rotation:**
- Old refresh token is revoked
- New refresh token issued with 7-day expiry
- Enhances security by limiting token lifetime

### Revoke Refresh Token (Logout)

**Endpoint:**
```
POST /auth/revoke
```

**Request Body:**
```json
{
  "refresh_token": "8f3b7d2a1c5e9f4b..."
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Token revoked"
}
```

### List Active Sessions

**Endpoint:**
```
GET /auth/sessions
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "device_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "created_at": 1702857600000,
    "expires_at": 1703462400000,
    "is_current": false
  }
]
```

## 🔐 Two-Factor Authentication (2FA)

### Setup 2FA

**Endpoint:**
```
POST /api/2fa/setup
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "data:image/png;base64,iVBORw0KG...",
  "backup_codes": [
    "A1B2C3D4",
    "E5F6G7H8",
    ...
  ]
}
```

### Verify and Enable 2FA

**Endpoint:**
```
POST /api/2fa/verify-setup
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Two-factor authentication has been enabled"
}
```

### 2FA Login Flow

**Step 1: Initial Login**
```
POST /auth/login
```

Response includes:
```json
{
  "requires_2fa": true,
  "temp_token": "temporary_jwt...",
  "message": "Please provide 2FA code"
}
```

**Step 2: Verify 2FA Code**
```
POST /auth/2fa-verify
```

Request:
```json
{
  "temp_token": "temporary_jwt...",
  "code": "123456"  // or "A1B2C3D4" for backup code
}
```

Response:
```json
{
  "access_token": "final_access_token...",
  "refresh_token": "refresh_token...",
  "token_type": "bearer"
}
```

### Disable 2FA

**Endpoint:**
```
POST /api/2fa/disable
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "code": "123456",
  "password": "user_password"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Two-factor authentication has been disabled"
}
```

### Regenerate Backup Codes

**Endpoint:**
```
POST /api/2fa/regenerate-backup-codes
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Backup codes have been regenerated",
  "backup_codes": [
    "X9Y8Z7W6",
    "V5U4T3S2",
    ...
  ]
}
```

### Get 2FA Status

**Endpoint:**
```
GET /api/2fa/status
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "enabled": true,
  "backup_codes_remaining": 8
}
```

## 🔒 Password Management

### Change Password (Authenticated User)

**Endpoint:**
```
POST /api/users/change-password
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

### Forgot Password

**Endpoint:**
```
POST /api/users/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "If an account exists with this email, you will receive password reset instructions"
}
```

**Note:** Always returns success to prevent email enumeration attacks.

### Reset Password with Token

**Endpoint:**
```
POST /api/users/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewPassword456!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password has been reset successfully"
}
```

## 👤 User Information

### Get Current User

**Endpoint:**
```
GET /auth/me
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "auth_provider": "local",
  "email_verified": true,
  "created_at": 1702857600000
}
```

### Update Profile

**Endpoint:**
```
PATCH /api/users/profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "email": "newemail@example.com"
}
```

## 🛡️ Security Features

### Rate Limiting
- 100 requests per 60 seconds per IP address
- Configurable via environment variables
- Returns `429 Too Many Requests` when exceeded

### Token Security
- **Access tokens:** 30-minute expiry
- **Refresh tokens:** 7-day expiry with rotation
- **Email verification tokens:** 24-hour expiry, single-use
- **Password reset tokens:** 1-hour expiry, single-use
- **2FA temp tokens:** 5-minute expiry

### Password Security
- Passwords hashed with bcrypt
- Minimum complexity requirements enforced
- No password stored in plain text

### 2FA Security
- Industry-standard TOTP (RFC 6238)
- 30-second time window
- 10 single-use backup codes
- Backup codes are hashed

### OAuth2 Security
- Google ID token verification
- Prevents account takeover via email collision
- Automatic email verification for Google users

## 🔍 Error Responses

### Authentication Errors

**401 Unauthorized:**
```json
{
  "detail": "Incorrect email or password"
}
```

**400 Bad Request:**
```json
{
  "detail": "Email already registered"
}
```

**429 Too Many Requests:**
```json
{
  "detail": "Rate limit exceeded"
}
```

**501 Not Implemented:**
```json
{
  "detail": "Google OAuth is not configured"
}
```

## 📱 Frontend Integration

### Storing Tokens

```javascript
// After login/register
const { access_token, refresh_token } = response.data;

// Store tokens
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

### Making Authenticated Requests

```javascript
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
};

const response = await fetch('/auth/me', { headers });
```

### Handling Token Expiration

```javascript
// Intercept 401 responses
if (response.status === 401) {
  // Try to refresh token
  const refreshToken = localStorage.getItem('refresh_token');
  const refreshResponse = await fetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (refreshResponse.ok) {
    const { access_token, refresh_token } = await refreshResponse.json();
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    // Retry original request
  } else {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

### Google OAuth2 Flow

```javascript
// Step 1: Get authorization URL
const { authorization_url } = await fetch('/auth/google/login').then(r => r.json());

// Step 2: Redirect user
window.location.href = authorization_url;

// Step 3: Handle callback (on /google-callback route)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

const { access_token, refresh_token } = await fetch(
  `/auth/google/callback?code=${code}`
).then(r => r.json());

// Store tokens
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

## 🧪 Testing

### Test Credentials (Development)

```
Email: test@example.com
Password: TestPassword123!
```

### Test 2FA Setup

1. Use any TOTP app (Google Authenticator, Authy, etc.)
2. Scan QR code or enter secret manually
3. App generates 6-digit codes
4. Codes change every 30 seconds

### Test Email Service

In development, set `EMAIL_PROVIDER=console` to print emails to terminal instead of sending them.

## 📊 Database Schema

### User Table
- `id` - Primary key
- `email` - Unique, indexed
- `hashed_password` - Nullable (for OAuth users)
- `auth_provider` - 'local' or 'google'
- `email_verified` - Boolean
- `email_verified_at` - Timestamp
- `two_factor_enabled` - Boolean
- `two_factor_secret` - Encrypted TOTP secret
- `two_factor_backup_codes` - JSON of hashed codes
- `created_at` - Unix milliseconds

### Token Tables
- **email_verification_tokens** - Email verification
- **password_reset_tokens** - Password reset
- **refresh_tokens** - Session management

## 🚀 Quick Start

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Google OAuth credentials
   ```

2. **Start backend:**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

3. **Access API documentation:**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

4. **Test registration:**
   ```bash
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPass123!"}'
   ```

## 📚 Additional Resources

- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [JWT Introduction](https://jwt.io/introduction)

## ⚠️ Production Considerations

1. **Use HTTPS** - All authentication endpoints should use HTTPS in production
2. **Secure SECRET_KEY** - Generate strong, unique secret key
3. **Configure CORS** - Set appropriate CORS origins
4. **Enable Rate Limiting** - Protect against brute force attacks
5. **Email Service** - Configure real SMTP or SendGrid for production
6. **Database** - Use PostgreSQL instead of SQLite
7. **Monitoring** - Set up logging and monitoring for auth events
8. **Backup** - Regular database backups, especially user data

## 🔗 Related Documentation

- [DOCKER.md](./DOCKER.md) - Docker deployment
- [PRODUCTION_AUTH.md](./PRODUCTION_AUTH.md) - Production auth features
- [API Documentation](http://localhost:8000/docs) - Interactive API docs
