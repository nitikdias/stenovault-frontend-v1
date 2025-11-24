# Deployment Checklist for Cookie Fix

## ✅ Code Changes Completed

All frontend API calls now use `/api/backend/*` proxy pattern instead of direct `API_BASE_URL` calls.

### Files Updated:
- ✅ `/app/login/page.js` - Login and signup endpoints
- ✅ `/app/api/logout/route.js` - Logout endpoint
- ✅ `/app/api/refresh/route.js` - Token refresh endpoint
- ✅ `/app/api/me/route.js` - User info endpoint
- ✅ `/app/api/signup/route.js` - Signup endpoint
- ✅ `/app/newEncounter/page.js` - All 5 endpoints (stats, patients, new_encounter, create patient)
- ✅ `/app/reports/page.js` - All 3 endpoints (meetings, stats, save transcript)
- ✅ `/app/page.js` - All 6 endpoints (clear, stats, transcript, language, sections, summary)
- ✅ `/app/dashboard/hooks/useAudioRecorder.js` - Upload endpoint
- ✅ `/middleware.js` - Verify session endpoint
- ✅ `/next.config.mjs` - Proxy rewrite configuration

## 🔧 Vercel Configuration Required

### Update Environment Variables in Vercel Dashboard:

1. Go to: https://vercel.com/your-project/settings/environment-variables

2. Update or verify these variables:
   ```
   NEXT_PUBLIC_TOKEN_KEY=eyJhbGci... (your E2E Networks API token)
   ```

3. **IMPORTANT**: The proxy in `next.config.mjs` is hardcoded to:
   ```
   https://infer.e2enetworks.net/project/p-8621/endpoint/is-7507
   ```
   
   Make sure your backend is accessible at this URL. If not, update `next.config.mjs`.

## 🚀 Deployment Steps

### Option 1: Deploy from Local (Recommended)
```bash
cd /Users/apple/Desktop/ARCA-EMR-LITE/frontend/my-app
git add .
git commit -m "fix: Update all API calls to use proxy pattern for cookie support"
git push origin main
```
Vercel will auto-deploy from your GitHub repo.

### Option 2: Manual Deploy
```bash
cd /Users/apple/Desktop/ARCA-EMR-LITE/frontend/my-app
vercel --prod
```

## ✅ Testing After Deployment

1. **Open your production URL**: `https://arca-emr-lite.vercel.app`
2. **Open browser DevTools** (F12) → Network tab
3. **Login** with test@arcaai.com / test@123
4. **Check the Network requests**:
   - ✅ Login should go to: `https://arca-emr-lite.vercel.app/api/backend/login`
   - ✅ NOT to: `https://emr-lite-core-gkfqhyd6crf4bne6.z03.azurefd.net/login`
5. **Check cookies**:
   - ✅ Should see `session_id` cookie in Application → Cookies
   - ✅ Console should show: `🍪 Current cookies: session_id=...`

## 🔍 If Still Having Issues

### Backend CORS Configuration
Make sure your backend at `https://infer.e2enetworks.net/project/p-8621/endpoint/is-7507` has:
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Origin: https://arca-emr-lite.vercel.app` (or `*` for testing)
- `Access-Control-Allow-Headers: Content-Type, Authorization, Cookie, X-Session-ID`

### Cookie Not Being Set
If login succeeds but no cookie appears:
1. Check backend response headers include `Set-Cookie`
2. Verify `Set-Cookie` has: `Secure; HttpOnly; SameSite=None`
3. Check that `https://` (not `http://`) is being used

### CORS Errors Still Appearing
If you still see CORS errors to Azure CDN:
- Clear browser cache completely
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Try in incognito mode
- Check Vercel deployment logs for build errors

## 📋 Current Backend Configuration

Based on logs, your backend is deployed at:
```
https://infer.e2enetworks.net/project/p-8621/endpoint/is-7507
```

The backend is correctly:
- ✅ Setting session_id cookie
- ✅ Using `Max-Age=300` (5 minutes)
- ✅ Setting `Secure; HttpOnly; SameSite=None`
- ✅ Returning `Access-Control-Allow-Credentials: true`

The issue was that frontend was bypassing the proxy and hitting Azure CDN directly.

## 🎯 Expected Behavior After Fix

1. User visits `https://arca-emr-lite.vercel.app/login`
2. Submits credentials
3. Frontend sends POST to `/api/backend/login` (same-origin)
4. Next.js proxy forwards to `https://infer.e2enetworks.net/.../login`
5. Backend sets `session_id` cookie
6. Cookie is saved because request appears same-origin
7. TokenRefreshManager detects cookie and starts refresh cycle
8. All subsequent requests include the cookie automatically

---

**Status**: Ready to deploy! Push to GitHub and Vercel will auto-deploy.
