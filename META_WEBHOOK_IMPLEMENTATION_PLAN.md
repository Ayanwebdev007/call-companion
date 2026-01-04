# Meta Webhook Implementation - Current Status & Action Plan

## 📊 Current Implementation Status

### ✅ What's Already Implemented

1. **Backend Webhook Handlers**
   - GET `/api/meta/webhook` - Webhook verification endpoint (in `backend/index.js`)
   - POST `/api/meta/webhook` - Lead reception endpoint (in `backend/index.js`)
   - Meta service for fetching lead details (`backend/services/metaService.js`)

2. **Frontend Configuration**
   - MetaSettings page (`frontend/src/pages/MetaSettings.tsx`)
   - UI for entering Meta Page Access Token and Verify Token
   - Settings saved to user profile

3. **Database Models**
   - User model has `settings.metaPageAccessToken` and `settings.metaVerifyToken`
   - Customer model supports all required fields

4. **Backend Routes**
   - Settings update endpoint (`/api/auth/settings`)

---

## ❌ Critical Issues Identified

### Issue #1: Token Verification Mismatch
**Problem:**
- Webhook GET handler uses `process.env.META_WEBHOOK_VERIFY_TOKEN` (environment variable)
- Frontend saves `metaVerifyToken` to user settings
- These are **different sources** - verification will fail!

**Impact:** Webhook verification will fail when Meta tries to verify the webhook.

**Solution:** 
- Change webhook verification to check against user-specific tokens
- OR use a single global token (less secure for multi-user)

### Issue #2: User Matching Logic
**Problem:**
- Webhook picks the **first user** with a Meta token, not the user who owns the specific page
- No mapping between Meta Page IDs and Users
- Multiple users with Meta integration will conflict

**Impact:** Leads may be assigned to the wrong user.

**Solution:**
- Store Meta Page ID in user settings
- Match incoming `page_id` from webhook to user's `metaPageId`

### Issue #3: Webhook URL Generation
**Problem:**
- Frontend generates URL by replacing port `5173` with `5000`
- This won't work in production (different domains, HTTPS, etc.)

**Impact:** Users will configure wrong webhook URL in Meta.

**Solution:**
- Use environment variable for backend URL
- Or generate URL based on current environment

### Issue #4: Duplicate Code
**Problem:**
- Webhook handlers exist in both `index.js` (active) and `routes/meta.js` (commented out)
- Code duplication and confusion

**Impact:** Maintenance issues, potential bugs.

**Solution:**
- Clean up and use one implementation

### Issue #5: Error Handling
**Problem:**
- Limited error handling in webhook processing
- No retry mechanism for failed lead fetches
- No notification when webhook fails

**Impact:** Silent failures, lost leads.

**Solution:**
- Add comprehensive error handling
- Add logging and monitoring

---

## 🎯 Implementation Plan

### Phase 1: Fix Critical Issues (Priority: HIGH)

#### Step 1.1: Update User Model to Store Page ID
- Add `metaPageId` to user settings
- This allows mapping webhook page_id to specific users

#### Step 1.2: Fix Webhook Verification
- Update GET handler to check user-specific verify tokens
- Support multiple users with different tokens
- Fallback to environment variable for backward compatibility

#### Step 1.3: Fix User Matching in POST Handler
- Match incoming `page_id` to user's `metaPageId`
- Only process leads for the correct user
- Add error handling if no matching user found

#### Step 1.4: Fix Webhook URL Generation
- Use environment variable `VITE_API_URL` or `BACKEND_URL`
- Generate proper production URLs

### Phase 2: Enhance Frontend (Priority: MEDIUM)

#### Step 2.1: Update MetaSettings Page
- Add field to enter/display Meta Page ID
- Show current webhook URL (from environment)
- Add instructions for getting Page ID
- Add test webhook button (optional)

#### Step 2.2: Add Page ID Helper
- Instructions on how to get Page ID from Meta
- Link to Meta Graph API Explorer

### Phase 3: Improve Backend Logic (Priority: MEDIUM)

#### Step 3.1: Add Meta Service Method
- Method to validate Page Access Token
- Method to get Page ID from token (optional)

#### Step 3.2: Enhanced Error Handling
- Try-catch around all webhook operations
- Detailed error logging
- Email/notification on failures (optional)

#### Step 3.3: Lead Deduplication
- Check if lead already exists before creating customer
- Use `metaLeadId` or email/phone to prevent duplicates

### Phase 4: Testing & Documentation (Priority: LOW)

#### Step 4.1: Testing
- Test webhook verification flow
- Test lead reception and customer creation
- Test multi-user scenario
- Test error cases

#### Step 4.2: Documentation
- Update README with Meta setup instructions
- Add troubleshooting guide
- Document environment variables

---

## 🔧 Detailed Fixes Required

### Fix 1: Update User Model
```javascript
// backend/models/User.js
settings: {
  metaPageAccessToken: { type: String, default: '' },
  metaVerifyToken: { type: String, default: '' },
  metaPageId: { type: String, default: '' } // NEW
}
```

### Fix 2: Update Webhook GET Handler
```javascript
// Check against user-specific tokens OR environment variable
// Need to find user by verify token or use global fallback
```

### Fix 3: Update Webhook POST Handler
```javascript
// Match page_id to user.metaPageId
const user = await User.findOne({ 
  'settings.metaPageId': pageId,
  'settings.metaPageAccessToken': { $exists: true, $ne: '' }
});
```

### Fix 4: Update Frontend MetaSettings
```typescript
// Add metaPageId field
// Use proper backend URL from environment
```

---

## 📝 Environment Variables Needed

```env
# Backend
META_WEBHOOK_VERIFY_TOKEN=your_global_token_here (optional, for fallback)
BACKEND_URL=https://your-backend-url.com (for webhook URL generation)

# Frontend
VITE_API_URL=https://your-backend-url.com/api
```

---

## ✅ Success Criteria

1. ✅ Webhook verification works with user-specific tokens
2. ✅ Leads are correctly assigned to the right user based on page_id
3. ✅ Webhook URL is correctly generated for production
4. ✅ Multiple users can have separate Meta integrations
5. ✅ Error handling prevents silent failures
6. ✅ Frontend UI allows configuration of all required fields

---

## 🚀 Next Steps

1. Review this plan
2. Implement Phase 1 fixes (critical issues)
3. Test with Meta Developer Console
4. Deploy and verify in production
5. Implement Phase 2-4 enhancements

