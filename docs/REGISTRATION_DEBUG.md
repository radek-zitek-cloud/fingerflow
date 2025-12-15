# Registration Debug Guide

## Issue
Local user registration fails with 403 Forbidden on /auth/me, and no user is created in the database.

## What We Know

### ✅ Backend Works
Testing the registration endpoint directly with curl WORKS:
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser2@example.com","password":"TestPassword123"}'
```

Result: User created successfully, tokens returned ✅

### ❌ Frontend Registration Fails
- No POST /auth/register request appears in backend logs
- Only GET /auth/me requests with 403 Forbidden
- No user created in database

## Root Cause Analysis

The frontend registration request is NOT reaching the backend. Possible causes:

### 1. Frontend API URL Configuration

**Check:** Is VITE_API_URL set correctly?

```bash
cat frontend/.env
```

Should contain:
```env
VITE_API_URL=http://localhost:8000
```

**Fix if missing:**
```bash
cd frontend
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev  # Restart frontend
```

### 2. Browser Console Errors

**Check:** Open browser DevTools (F12) → Console tab

Look for errors like:
- `Failed to fetch`
- `NetworkError`
- `CORS policy`
- JavaScript errors

**Common issues:**
- API URL not set (requests go to wrong domain)
- CORS blocking the request
- JavaScript error preventing the request

### 3. Network Tab Investigation

**Steps:**
1. Open DevTools (F12) → Network tab
2. Try to register a new user
3. Look for the registration request

**What to check:**
- Is there a POST request to `/auth/register`?
  - ✅ YES: Check response status and error message
  - ❌ NO: JavaScript error is preventing the request

**If request exists, check:**
- Request URL: Should be `http://localhost:8000/auth/register`
- Request payload: Should have email and password
- Response status:
  - 201: Success (but frontend not handling response correctly)
  - 400: Validation error
  - 422: Invalid JSON or data format
  - 500: Server error

### 4. Frontend Code Issues

**Potential problems:**

**Problem A:** AuthContext calling clearAuthToken() before register
```javascript
// In AuthContext.jsx
async function register(email, password) {
  try {
    clearAuthToken();  // ← This clears any existing token
    setError(null);
    const response = await authAPI.register(email, password);
    await checkAuth(); // ← This immediately calls /auth/me
    return { success: true };
  }
}
```

This is **actually correct**. We want to clear old tokens before registering.

**Problem B:** fetchWithAuth might be adding incorrect headers
The registration endpoint doesn't require authentication, but fetchWithAuth might be trying to add an Authorization header with a null/invalid token.

## Quick Fixes to Try

### Fix 1: Check Frontend Environment

```bash
# Make sure frontend .env exists
cd frontend
cat .env

# If it doesn't exist or is wrong, create it:
echo "VITE_API_URL=http://localhost:8000" > .env

# Restart frontend
npm run dev
```

### Fix 2: Clear Browser Storage

Old tokens or cached data might be causing issues:

1. Open DevTools (F12)
2. Application tab → Storage → Clear site data
3. Or manually:
   - Local Storage → Delete `auth_token` and `refresh_token`
   - Session Storage → Clear all
4. Reload page (Ctrl+R)
5. Try registration again

### Fix 3: Check Browser Console

1. Open DevTools (F12) → Console
2. Try to register
3. Look for any JavaScript errors
4. Share the error messages

### Fix 4: Test with Simple Curl First

This confirms the backend is working:

```bash
# Test registration (should succeed)
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test3@example.com","password":"TestPassword123"}'

# Test /auth/me with the returned token
TOKEN="<paste_access_token_from_above>"
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

If both work, the backend is fine and it's a frontend issue.

## Debugging Steps

### Step 1: Open Browser Console

1. Open http://localhost:5173
2. Press F12 to open DevTools
3. Go to Console tab
4. Clear console
5. Try to register a user
6. **Screenshot or copy any errors you see**

### Step 2: Check Network Tab

1. DevTools → Network tab
2. Try to register
3. Look for POST request to `/auth/register`
4. Click on it to see:
   - Request URL
   - Request headers
   - Request payload
   - Response

### Step 3: Check Frontend .env

```bash
cd frontend
cat .env
```

Should show:
```
VITE_API_URL=http://localhost:8000
```

If not, create it and restart.

### Step 4: Test Backend Directly

```bash
# This should work:
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"directtest@example.com","password":"TestPassword123"}'
```

If this works but frontend doesn't, the issue is definitely in the frontend.

## Most Likely Issues

Based on symptoms (403 on /auth/me, no registration request), the most likely causes are:

1. **Frontend .env not set** (80% likely)
   - Requests going to wrong URL
   - Fix: Create .env with VITE_API_URL

2. **Browser console JavaScript error** (15% likely)
   - Error preventing request from being sent
   - Fix: Check console, fix the error

3. **CORS issue** (5% likely)
   - Backend blocking frontend requests
   - Fix: Check backend CORS settings in config.py

## Next Steps

1. Check browser console for errors
2. Check Network tab to see if request is being sent
3. Verify .env file exists and has correct API URL
4. Test with curl to confirm backend works
5. Share console errors and network tab screenshots

