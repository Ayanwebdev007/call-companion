# Meta Webhook Setup Guide - Next Steps

## ✅ What Has Been Implemented

All critical fixes have been implemented and pushed to GitHub:

1. ✅ **User Model Updated** - Added `metaPageId` field for page-to-user mapping
2. ✅ **Webhook Verification Fixed** - Now uses user-specific verify tokens
3. ✅ **User Matching Fixed** - Matches users by `page_id` instead of first user
4. ✅ **Frontend Updated** - Added Page ID field to MetaSettings page
5. ✅ **Webhook URL Fixed** - Uses environment variables for production
6. ✅ **Duplicate Prevention** - Checks for existing leads before creating customers
7. ✅ **Error Handling** - Improved logging and error messages

---

## 🚀 Next Steps to Complete Setup

### Step 1: Wait for Render Deployment (2-3 minutes)

Your code is pushed to GitHub. Render will automatically:
- Pull the latest code
- Rebuild the backend
- Deploy the new version

**Check deployment status:** https://dashboard.render.com

---

### Step 2: Configure Meta Settings in Your CRM

1. **Go to your CRM frontend:**
   - Navigate to: `https://digityzeinternational.online/meta-settings`
   - Or your frontend URL

2. **Enter your Meta credentials:**
   - **Meta Page ID:** `806449735881894`
   - **Meta Page Access Token:** `EAAXDZA3ZB5l34BQV5lRO8lM37kvAQC3caAUqtMWPVlZAv47XrwjlvbIRsz6guZC0CZACo0EjZCoZCHUMkMTdSvMtibgGsYHNB7pfG3nzeUB6Xlwh9flVY5FOEBWm5iHBZAZAVlbPt6XsVB101rbDhaUDLSk5A4p1YPXJEdUg1WDtn7XBgXDzZBEkJZBHAT5DyJ4`
   - **Verify Token:** Click "Generate" to create a random token (or enter your own)
   - **Copy the Verify Token** - You'll need it for Meta Developer Console

3. **Copy the Webhook URL:**
   - The page will show: `https://digityzeinternational.online/api/meta/webhook`
   - Click "Copy" button

4. **Click "Save Configuration"**

---

### Step 3: Configure Meta Developer Console

1. **Go to Meta Developers:**
   - Visit: https://developers.facebook.com/
   - Select your Meta App (or create one if needed)

2. **Add Webhooks Product:**
   - Go to: **App Dashboard** → **Add Product** → **Webhooks**
   - Click **Set Up** on Webhooks

3. **Configure Page Webhook:**
   - Click **Add Subscription** or **Edit Subscription**
   - Select **Page** as the object
   - Click **Subscribe to this object**

4. **Enter Webhook Details:**
   - **Callback URL:** `https://digityzeinternational.online/api/meta/webhook`
   - **Verify Token:** (Paste the token you generated/saved in Step 2)
   - Click **Verify and Save**

5. **Subscribe to Leadgen Field:**
   - In the Webhooks section, find **Page** subscription
   - Click **Manage** or **Edit**
   - Under **Subscription Fields**, make sure **leadgen** is checked
   - If not, click **Edit Subscription** and add **leadgen** field
   - Save changes

6. **Verify Permissions:**
   - Go to **App Review** → **Permissions and Features**
   - Ensure **leads_retrieval** permission is approved
   - If not, you may need to request it

---

### Step 4: Test the Integration

1. **Create a Test Lead:**
   - Go to Meta Ads Manager
   - Create a test Lead Ad campaign (or use existing)
   - Submit a test lead form

2. **Check Your CRM:**
   - Go to your CRM dashboard
   - Look for a spreadsheet named **"Meta Ads Leads"**
   - The new customer should appear within 5-10 seconds

3. **Verify the Data:**
   - Check that customer details are correct:
     - Name
     - Email
     - Phone
     - Company (if provided)
   - Check the remark field contains: `Meta Lead ID: {leadgen_id}`

---

## 🔍 Troubleshooting

### Webhook Verification Fails

**Problem:** Meta shows "Verification failed" when setting up webhook

**Solutions:**
1. Make sure Verify Token in CRM matches Verify Token in Meta Developer Console (exact match, case-sensitive)
2. Check that backend is deployed and running
3. Verify webhook URL is correct: `https://digityzeinternational.online/api/meta/webhook`
4. Check backend logs in Render dashboard for verification attempts

### Leads Not Appearing in CRM

**Problem:** Leads submitted but not showing in CRM

**Solutions:**
1. **Check Page ID Match:**
   - Verify `metaPageId` in CRM settings matches the Page ID from the webhook
   - The webhook sends `page_id` in the event - it must match your saved `metaPageId`

2. **Check Backend Logs:**
   - Go to Render dashboard → Backend service → Logs
   - Look for webhook POST requests
   - Check for error messages

3. **Verify Access Token:**
   - Make sure Page Access Token has `leads_retrieval` permission
   - Token should start with `EAA...`
   - Token should not be expired

4. **Check User Matching:**
   - Backend logs will show: `[Background] Processing lead: {leadId} for page: {pageId}`
   - Then: `[Background] Found user: {username} for page: {pageId}`
   - If you see: `No user found for page_id`, the Page ID doesn't match

### Duplicate Leads

**Problem:** Same lead appears multiple times

**Solution:**
- The system now checks for duplicates by:
  - Meta Lead ID in remark field
  - Email address
  - Phone number
- If duplicates still occur, check backend logs for duplicate detection messages

---

## 📋 Quick Checklist

Before testing, verify:

- [ ] Backend deployed on Render (check Render dashboard)
- [ ] Frontend deployed on Render (check Render dashboard)
- [ ] Meta Page ID entered in CRM: `806449735881894`
- [ ] Meta Page Access Token entered in CRM
- [ ] Verify Token generated and saved in CRM
- [ ] Webhook URL configured in Meta: `https://digityzeinternational.online/api/meta/webhook`
- [ ] Verify Token matches in both CRM and Meta Developer Console
- [ ] Webhook subscribed to "Page" object
- [ ] "leadgen" field subscribed in webhook
- [ ] `leads_retrieval` permission approved in Meta App

---

## 🎯 Expected Behavior

When everything is configured correctly:

1. **Webhook Verification:**
   - Meta Developer Console shows "Verified" ✅
   - Backend logs show: `--- META WEBHOOK VERIFIED (User: {username}) ---`

2. **Lead Processing:**
   - When a lead is submitted:
     - Backend receives webhook within seconds
     - Logs show: `[Background] Processing lead: {leadId} for page: {pageId}`
     - Logs show: `[Background] Found user: {username} for page: {pageId}`
     - Logs show: `[Background] Successfully saved customer: {customerId}`
   - Customer appears in "Meta Ads Leads" spreadsheet within 5-10 seconds

3. **Data Quality:**
   - Customer name, email, phone, company populated from lead form
   - Remark field contains Meta Lead ID for tracking
   - Status set to "new"

---

## 📞 Support

If you encounter issues:

1. **Check Backend Logs:**
   - Render Dashboard → Your Backend Service → Logs
   - Look for webhook-related messages

2. **Check Meta Webhook Logs:**
   - Meta Developer Console → Your App → Webhooks
   - View webhook delivery logs

3. **Verify Configuration:**
   - Double-check all tokens and IDs match
   - Ensure webhook URL is accessible (try opening in browser - should show error, not timeout)

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Webhook shows "Verified" in Meta Developer Console
2. ✅ Test lead appears in CRM within 10 seconds
3. ✅ Customer data is complete and accurate
4. ✅ Backend logs show successful processing
5. ✅ No duplicate customers created

---

**Ready to test!** 🚀

Once Render finishes deploying (usually 2-3 minutes), follow Steps 2-4 above to complete the setup.

