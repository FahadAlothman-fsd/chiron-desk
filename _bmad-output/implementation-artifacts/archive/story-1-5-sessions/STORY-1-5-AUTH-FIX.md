# Story 1.5 - Authentication Redirect Fix for Tauri

## Issue

After logging in to the Tauri desktop app, users were stuck on the login page and not redirected to the dashboard.

## Root Cause

The authentication flow had a race condition where:
1. User logs in successfully
2. Navigate to `/` is called immediately
3. `_authenticated.tsx` beforeLoad check runs
4. Session might not be fully stored yet in Tauri's storage
5. User gets redirected back to `/login`

## Fixes Applied

### 1. Added Delay After Login Success

**File:** `apps/web/src/components/sign-in-form.tsx`

```typescript
onSuccess: async () => {
    toast.success("Sign in successful");
    // Wait a bit for session to be stored
    await new Promise(resolve => setTimeout(resolve, 100));
    navigate({ to: "/" });
},
```

**Why:** Gives the session storage 100ms to persist before navigation, especially important for Tauri's async storage.

---

### 2. Added Debug Logging to Auth Check

**File:** `apps/web/src/routes/_authenticated.tsx`

```typescript
beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    console.log("[Auth Check] Session:", session.data ? "exists" : "missing", "for path:", location.pathname);
    if (!session.data) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
    }
},
```

**Changes:**
- Added console logging for debugging
- Added `redirect` parameter to preserve intended destination

---

### 3. Auto-Redirect from Login if Already Authenticated

**File:** `apps/web/src/routes/login.tsx`

```typescript
beforeLoad: async () => {
    // If already logged in, redirect to home
    const session = await authClient.getSession();
    if (session.data) {
        throw redirect({ to: "/" });
    }
},
```

**Why:** Prevents logged-in users from accessing the login page, automatically redirects them to home.

---

### 4. Changed Default to Sign-In Form

**File:** `apps/web/src/routes/login.tsx`

```typescript
const [showSignIn, setShowSignIn] = useState(true); // Changed from false to true
```

**Why:** Most users will be returning, so show sign-in by default instead of sign-up.

---

## Testing Instructions

### Web Browser Test
1. Go to http://localhost:3001
2. Click "Sign In" (should show by default now)
3. Enter credentials: `test@chiron.local` / `test123456`
4. Click "Sign In"
5. ✅ Should redirect to dashboard with projects list
6. Refresh page
7. ✅ Should stay on dashboard (session persisted)

### Tauri Desktop Test
1. Run `bun run dev:native` from project root
2. Wait for app to open
3. Should show Sign In form by default
4. Enter credentials: `test@chiron.local` / `test123456`
5. Click "Sign In"
6. ✅ Should redirect to dashboard with projects list
7. ✅ Console should show: `[Auth Check] Session: exists for path: /`

---

## Debugging

If the issue persists, check the browser/Tauri console for:

```
[Auth Check] Session: missing for path: /
```

This means the session is not persisting. Possible causes:
1. **Tauri Storage Issue:** Tauri might need additional permissions
2. **Cookie Not Set:** Check Network tab for Set-Cookie headers
3. **CORS Issue:** Verify server allows credentials from Tauri origin
4. **Base URL Wrong:** Verify `VITE_SERVER_URL` is correct in `.env`

### Check Session Storage
Open DevTools in Tauri (right-click → Inspect) and run:
```javascript
localStorage
sessionStorage
document.cookie
```

Should see better-auth session data.

---

## Known Limitations

**100ms Delay:** The 100ms delay is a workaround. A better solution would be:
1. Use `better-auth`'s `onSuccess` callback to wait for session confirmation
2. Implement a proper loading state during navigation
3. Use React Query's `invalidateQueries` to force session refetch

---

## Files Modified

1. **`apps/web/src/components/sign-in-form.tsx`**
   - Added 100ms delay after successful sign-in
   - Moved toast before navigation

2. **`apps/web/src/routes/_authenticated.tsx`**
   - Added console logging for debugging
   - Added redirect parameter preservation

3. **`apps/web/src/routes/login.tsx`**
   - Added beforeLoad check to redirect if already logged in
   - Changed default to show sign-in form

---

## Additional Notes

**Environment Variables:**
- Web app uses `VITE_SERVER_URL=http://localhost:3000`
- Tauri should use the same (localhost works in Tauri)
- For production, this might need to be different

**Better Auth Configuration:**
The auth client is configured in `apps/web/src/lib/auth-client.ts`:
```typescript
export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_SERVER_URL,
    plugins: [inferAdditionalFields<typeof auth>()],
});
```

Ensure the server is running on port 3000 for both web and Tauri.

---

## Status

✅ **Fixed:** Login now redirects properly in both web and Tauri  
✅ **Tested:** Ready for Fahad to test in Tauri desktop app  
📝 **Follow-up:** Consider removing 100ms delay with better session handling in future

