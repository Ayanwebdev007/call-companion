# Meta Webhook Troubleshooting Guide

## 🔴 Current Issue: Webhook Verification Failing

**Symptom:** Meta shows webhook status as "pending" with message "Updated lead is still being processed and will be delivered shortly"

**Root Cause:** The webhook verification hasn't completed successfully, so Meta won't send POST events for leads.

---

## ✅ Step-by-Step Fix

### Step 1: Check Your CRM Configuration

1. **Go to your CRM Meta Settings:**
   - Navigate to: `https://digityzeinternational.online/meta-settings`
   - Log in if needed

2. **Verify all fields are filled:**
   - ✅ **Meta Page ID:** `806449735881894` (should be set)
   - ✅ **Meta Page Access Token:** Should be set (starts with `EAA...`)
   - ✅ **Verify Token:** **MUST BE SET** - This is critical!

3. **If Verify Token is empty or missing:**
   - Click the "Generate" button to create a new token
   - **COPY THE TOKEN** - You'll need it for Step 2
   - Click "Save Configuration"

4. **If Verify Token exists:**
   - **COPY THE EXACT TOKEN** (including all characters, no spaces)
   - You'll need it for Step 2

---

### Step 2: Configure Meta Developer Console

1. **Go to Meta Developers:**
   - Visit: https://developers.facebook.com/
   - Select your Meta App

2. **Go to Webhooks:**
   - Navigate to: **App Dashboard** → **Webhooks** → **Page**

3. **Edit Webhook Subscription:**
   - Click **Edit Subscription** or **Add Subscription**
   - **Callback URL:** `https://digityzeinternational.online/api/meta/webhook`
   - **Verify Token:** Paste the **EXACT** token from Step 1 (must match character-for-character)
   - **Important:** 
     - Token is case-sensitive
     - No extra spaces before or after
     - Copy-paste to avoid typos

4. **Click "Verify and Save"**

5. **Check the result:**
   - ✅ **Success:** You'll see "Verified" status
   - ❌ **Failure:** You'll see an error message

---

### Step 3: Check Backend Logs (After Verification Attempt)

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Select your backend service
   - Click **Logs**

2. **Look for verification attempt:**
   - You should see: `--- META WEBHOOK VERIFICATION ATTEMPT ---`
   - Check the logs for:
     - `✅ META WEBHOOK VERIFIED` = Success!
     - `❌ WEBHOOK VERIFICATION FAILED` = Problem

3. **If verification failed, check:**
   - Does the log show "No matching verify token found"?
   - Does it show which users have tokens?
   - Does it show if tokens match?

---

### Step 4: Use Debug Endpoint (After Deployment)

Once Render deploys the new code (2-3 minutes), you can check your configuration:

**Visit:** `https://digityzeinternational.online/api/meta/debug-config`

This will show:
- All users with Meta tokens configured
- Their Page IDs
- Whether verify tokens are set
- Preview of verify tokens (first 10 characters)

**This helps verify:**
- Is your verify token saved in the database?
- Does it match what you entered in Meta?

---

## 🔍 Common Issues & Solutions

### Issue 1: "Verification failed" in Meta Developer Console

**Possible Causes:**
1. Verify token doesn't match between CRM and Meta
2. Verify token not saved in CRM
3. Extra spaces or typos in token

**Solution:**
1. Go to CRM Meta Settings
2. Generate a NEW verify token
3. Copy it exactly (no spaces)
4. Paste it in Meta Developer Console
5. Save in CRM first, then verify in Meta

---

### Issue 2: Backend logs show "No matching verify token found"

**Possible Causes:**
1. Token not saved in database
2. Token mismatch (case-sensitive, extra characters)

**Solution:**
1. Check debug endpoint: `/api/meta/debug-config`
2. Verify token is saved in database
3. Regenerate token in CRM and save
4. Use exact same token in Meta Developer Console

---

### Issue 3: Webhook shows "pending" status

**Cause:** Verification hasn't completed successfully

**Solution:**
1. Follow Steps 1-2 above to verify webhook
2. Wait for Meta to retry (can take a few minutes)
3. Or manually trigger verification in Meta Developer Console
4. Check backend logs to see verification attempt

---

### Issue 4: No POST requests in logs when lead is submitted

**Cause:** Webhook not verified, so Meta won't send events

**Solution:**
1. **First verify the webhook** (Steps 1-2 above)
2. Once verified, Meta will start sending POST events
3. Then test with a new lead

---

## 📋 Verification Checklist

Before testing with a real lead, verify:

- [ ] **CRM Settings:**
  - [ ] Meta Page ID: `806449735881894` is saved
  - [ ] Meta Page Access Token is saved
  - [ ] Verify Token is generated and saved

- [ ] **Meta Developer Console:**
  - [ ] Webhook URL: `https://digityzeinternational.online/api/meta/webhook`
  - [ ] Verify Token matches CRM exactly
  - [ ] Webhook shows "Verified" status (not "pending")
  - [ ] Subscribed to "Page" object
  - [ ] Subscribed to "leadgen" field

- [ ] **Backend Logs:**
  - [ ] Shows verification success: `✅ META WEBHOOK VERIFIED`
  - [ ] No verification errors

---

## 🧪 Testing Steps

### Test 1: Verify Webhook Configuration

1. Visit: `https://digityzeinternational.online/api/meta/debug-config`
2. Check that your user appears with:
   - Page ID: `806449735881894`
   - Verify Token: Set (shows preview)

### Test 2: Trigger Webhook Verification

1. In Meta Developer Console, click "Verify and Save" on webhook
2. Check Render backend logs
3. Should see: `✅ META WEBHOOK VERIFIED (User: your_username)`

### Test 3: Test with Real Lead

1. **Only after verification succeeds:**
2. Submit a test lead in Meta Ads
3. Check backend logs for: `!!! META WEBHOOK POST RECEIVED !!!`
4. Check CRM for new customer in "Meta Ads Leads" spreadsheet

---

## 🚨 Important Notes

1. **Webhook verification must succeed BEFORE Meta will send POST events**
   - "Pending" status means verification failed
   - No POST events will be sent until verified

2. **Verify Token must match EXACTLY:**
   - Case-sensitive
   - No extra spaces
   - Copy-paste recommended

3. **Order matters:**
   - Save token in CRM first
   - Then verify in Meta Developer Console
   - Wait for verification to complete

4. **Backend logs are your friend:**
   - Check Render logs after verification attempt
   - Look for ✅ or ❌ indicators
   - New logging shows detailed information

---

## 📞 Next Steps

1. **Wait for Render deployment** (2-3 minutes for new logging code)
2. **Follow Steps 1-2** to configure verify token
3. **Check backend logs** after verification attempt
4. **Use debug endpoint** to verify configuration
5. **Test with real lead** only after verification succeeds

---

## 🔗 Useful Links

- **Debug Endpoint:** `https://digityzeinternational.online/api/meta/debug-config`
- **Webhook URL:** `https://call-companion-backend.onrender.com/api/meta/webhook`
- **Meta Developers:** https://developers.facebook.com/
- **Render Dashboard:** https://dashboard.render.com

---

**The key issue is webhook verification. Once that succeeds, everything else will work!** ✅

