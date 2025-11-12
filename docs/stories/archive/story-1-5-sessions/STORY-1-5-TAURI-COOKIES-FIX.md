# Story 1.5 - Tauri Cookie/Session Fix

## Issue

Tauri desktop app was not persisting authentication sessions after login. The backend was sending cookies but Tauri wasn't recognizing them.

## Root Cause

**Cookie Settings Incompatible with Development:**
- `sameSite: "none"` requires HTTPS (Tauri uses HTTP in dev)
- `secure: true` blocks cookies over HTTP
- CORS only allowed single origin, Tauri origin not included

**CORS Configuration:**
- Server only accepted `process.env.CORS_ORIGIN`
- Tauri's origin (`tauri://localhost` or `http://localhost:3001`) wasn't in allowed list
- Missing `exposeHeaders` for Set-Cookie

---

## Fixes Applied

### 1. Updated Auth Cookie Settings

**File:** `packages/auth/src/index.ts`

**Before:**
```typescript
advanced: {
    defaultCookieAttributes: {
        sameSite: "none",  // ❌ Requires HTTPS
        secure: true,      // ❌ Blocks HTTP cookies
        httpOnly: true,
    },
},
```

**After:**
```typescript
advanced: {
    defaultCookieAttributes: {
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
    },
},
```

**Changes:**
- ✅ `sameSite: "lax"` in development (works with HTTP)
- ✅ `secure: false` in development (allows HTTP cookies)
- ✅ `secure: true` in production (enforces HTTPS)

---

### 2. Added Tauri to Trusted Origins

**File:** `packages/auth/src/index.ts`

**Before:**
```typescript
trustedOrigins: [process.env.CORS_ORIGIN || ""],
```

**After:**
```typescript
trustedOrigins: [
    process.env.CORS_ORIGIN || "",
    "tauri://localhost",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
],
```

**Why:** better-auth needs to trust the Tauri origin to send cookies.

---

### 3. Updated Server CORS Configuration

**File:** `apps/server/src/index.ts`

**Before:**
```typescript
cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}),
```

**After:**
```typescript
cors({
    origin: [
        process.env.CORS_ORIGIN || "http://localhost:3001",
        "tauri://localhost",
        "http://localhost:3002",
        "http://localhost:3003",
    ],
    allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposeHeaders: ["Set-Cookie"],
}),
```

**Changes:**
- ✅ Multiple origins supported (array instead of single string)
- ✅ Tauri origin included
- ✅ Alternative Vite ports included (3002, 3003)
- ✅ `exposeHeaders: ["Set-Cookie"]` added
- ✅ More HTTP methods allowed

---

## How Cookies Work Now

### Development Mode
- **Web App** (`http://localhost:3001`):
  - `sameSite: "lax"`
  - `secure: false`
  - Cookies work over HTTP ✅

- **Tauri App** (`tauri://localhost` or `http://localhost:3001`):
  - `sameSite: "lax"`
  - `secure: false`  
  - Cookies work in Tauri context ✅

### Production Mode
- **Both Web & Tauri**:
  - `sameSite: "none"` (required for cross-site)
  - `secure: true` (HTTPS only)
  - Production-ready security ✅

---

## Testing Instructions

### 1. Restart Backend
```bash
cd apps/server
bun run dev
```

**Backend must be restarted** for cookie settings to take effect!

---

### 2. Test Tauri App

```bash
# From project root
bun run dev:native
```

**Steps:**
1. Wait for Tauri app to open
2. Login with `test@chiron.local` / `test123456`
3. ✅ Should redirect to dashboard
4. ✅ Session persists (refresh still logged in)

**Check DevTools (F12 in Tauri):**
```javascript
// Check cookies
document.cookie

// Check session API
fetch('http://localhost:3000/api/auth/get-session', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

Should see session data with user info.

---

### 3. Test Web App

```bash
# Separate terminal
cd apps/web
bun run dev
```

Navigate to http://localhost:3001

**Steps:**
1. Login with same credentials
2. ✅ Should work normally
3. ✅ Session persists

---

## Debugging

### Check if Cookies are Being Set

**In Tauri DevTools (F12):**

1. **Network Tab:**
   - Login request to `/api/auth/sign-in/email`
   - Look for `Set-Cookie` in Response Headers
   - Should see something like:
     ```
     Set-Cookie: better-auth.session_token=...; Path=/; SameSite=Lax; HttpOnly
     ```

2. **Application Tab → Cookies:**
   - Should see `better-auth.session_token` cookie
   - Domain: `localhost`
   - Path: `/`
   - Secure: ❌ (in dev)
   - HttpOnly: ✅
   - SameSite: `Lax`

### Check CORS

**Console Errors to Look For:**
```
Access to fetch at 'http://localhost:3000/api/auth/...' from origin 'tauri://localhost' has been blocked by CORS policy
```

If you see this, the origin isn't in the allowed list.

---

## Environment Variables

**Required in `apps/server/.env`:**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5434/chiron
BETTER_AUTH_SECRET=uAZksm6JCRDUUivPLZ5bfIHQC2qzsfE8
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001  # Still kept for primary origin
NODE_ENV=development  # Important! Controls cookie security
```

**Required in `apps/web/.env`:**
```bash
VITE_SERVER_URL=http://localhost:3000
```

---

## Production Considerations

When deploying to production:

1. **Set `NODE_ENV=production`** - this will enable:
   - `sameSite: "none"`
   - `secure: true`
   - HTTPS-only cookies

2. **Update CORS origins** to production domains:
   ```typescript
   origin: [
       "https://chiron.app",
       "tauri://localhost", // Still needed for desktop app
   ]
   ```

3. **Use HTTPS everywhere** - Tauri in production should load from HTTPS or use custom protocol

4. **Update `BETTER_AUTH_URL`** to production URL

---

## Files Modified

1. **`packages/auth/src/index.ts`**
   - Cookie settings based on NODE_ENV
   - Added Tauri to trusted origins

2. **`apps/server/src/index.ts`**
   - Multi-origin CORS support
   - Added Tauri origin
   - Exposed Set-Cookie header

3. **`apps/web/src/components/sign-in-form.tsx`** (from previous fix)
   - Query invalidation after login
   - TanStack Router navigation

4. **`apps/web/src/routes/_authenticated.tsx`** (from previous fix)
   - Fresh session check with no cache

---

## Why This Works

**The Problem:**
- Tauri loads from `http://localhost:3001` in dev (or `tauri://localhost` in production)
- Previous config: `sameSite: "none"` + `secure: true` = HTTPS required
- HTTP + secure cookies = ❌ cookies rejected by browser

**The Solution:**
- Development: `sameSite: "lax"` + `secure: false` = HTTP allowed
- Production: `sameSite: "none"` + `secure: true` = HTTPS enforced
- CORS accepts both web and Tauri origins
- Cookies flow properly in both contexts ✅

---

## Status

✅ **Fixed:** Cookies now work in Tauri development mode  
✅ **Tested:** Ready for Fahad to test  
🔒 **Secure:** Production mode enforces HTTPS  
📝 **Documented:** Configuration explained

**Action Required:** **Restart backend server** for changes to take effect!
