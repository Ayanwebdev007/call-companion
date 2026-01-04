# Meta Webhook Feature - Complete Flow Explanation

## 🎯 Overview

The Meta Webhook feature automatically captures leads from Facebook/Meta Lead Ads and creates customer records in your CRM platform in real-time.

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    META ADS MANAGER                            │
│  User fills out Lead Form → Lead Generated                    │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         │ 1. Meta sends webhook event
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              YOUR BACKEND SERVER                                │
│              /api/meta/webhook (POST)                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 1: Receive Webhook Event                            │  │
│  │ - Lead ID (leadgen_id)                                   │  │
│  │ - Page ID (page_id)                                      │  │
│  │ - Timestamp                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 2: Respond Immediately (200 OK)                      │  │
│  │ - Prevents Meta timeout                                   │  │
│  │ - Process in background                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 3: Find User by Page ID                             │  │
│  │ - Match page_id to user.settings.metaPageId              │  │
│  │ - Get user's Meta Page Access Token                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 4: Fetch Lead Details from Meta API                 │  │
│  │ - Call Meta Graph API with leadgen_id                    │  │
│  │ - Extract: name, email, phone, company                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 5: Get or Create "Meta Ads Leads" Spreadsheet       │  │
│  │ - Check if spreadsheet exists for user                   │  │
│  │ - Create if doesn't exist                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 6: Create Customer Record                           │  │
│  │ - customer_name (from lead)                              │  │
│  │ - company_name (from lead)                               │  │
│  │ - phone_number (from lead)                               │  │
│  │ - email (from lead)                                      │  │
│  │ - remark: "Meta ID: {leadgen_id}"                        │  │
│  │ - status: "new"                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 7: Save to Database                                 │  │
│  │ - Customer record created                                │  │
│  │ - Linked to user and spreadsheet                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ 2. Customer appears in CRM
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND CRM                                 │
│  User sees new customer in "Meta Ads Leads" spreadsheet         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Detailed Step-by-Step Flow

### **Phase 1: Initial Setup (One-Time Configuration)**

#### Step 1: User Configures Meta Integration
```
User → MetaSettings Page
├── Enters Meta Page Access Token
├── Enters/Generates Verify Token
├── Enters Meta Page ID
└── Saves Settings
    ↓
Settings saved to: user.settings.metaPageAccessToken
                  user.settings.metaVerifyToken
                  user.settings.metaPageId
```

#### Step 2: User Configures Meta Developer App
```
User → Meta Developer Console
├── Creates/Selects App
├── Adds "Webhooks" product
├── Subscribes to "Page" object
├── Subscribes to "leadgen" field
├── Enters Webhook URL: https://your-backend.com/api/meta/webhook
├── Enters Verify Token: (from user settings)
└── Clicks "Verify and Save"
    ↓
Meta sends GET request to verify webhook
    ↓
Backend checks verify token
    ↓
Webhook verified ✅
```

---

### **Phase 2: Real-Time Lead Processing (Automatic)**

#### Step 1: Lead Generated in Meta Ads
```
Scenario: Someone clicks on Facebook/Instagram ad
         → Fills out lead form
         → Submits form
    ↓
Meta Ads Manager generates a lead
    ↓
Meta triggers webhook event
```

#### Step 2: Meta Sends Webhook Event
```
POST https://your-backend.com/api/meta/webhook

Headers:
- Content-Type: application/json
- X-Hub-Signature-256: (for verification - optional)

Body:
{
  "object": "page",
  "entry": [
    {
      "id": "page_id_123",
      "time": 1234567890,
      "changes": [
        {
          "value": {
            "leadgen_id": "lead_abc123",
            "page_id": "page_id_123",
            "form_id": "form_xyz789",
            "created_time": 1234567890
          },
          "field": "leadgen"
        }
      ]
    }
  ]
}
```

#### Step 3: Backend Receives & Acknowledges
```javascript
// backend/index.js - POST /api/meta/webhook

app.post('/api/meta/webhook', async (req, res) => {
  // CRITICAL: Respond immediately (within 20 seconds)
  res.status(200).send('EVENT_RECEIVED');
  
  // Process in background (async)
  processLeadInBackground(req.body);
});
```

**Why respond immediately?**
- Meta requires response within 20 seconds
- If timeout, Meta will retry (can cause duplicates)
- Lead processing can take longer (API calls, database)

#### Step 4: Extract Lead Information
```javascript
const body = req.body;
const entry = body.entry[0];
const change = entry.changes[0];

const leadId = change.value.leadgen_id;    // "lead_abc123"
const pageId = change.value.page_id;       // "page_id_123"
```

#### Step 5: Find User by Page ID
```javascript
// Match the incoming page_id to find which user owns this page
const user = await User.findOne({
  'settings.metaPageId': pageId,
  'settings.metaPageAccessToken': { $exists: true, $ne: '' }
});

if (!user) {
  console.error(`No user found for page_id: ${pageId}`);
  return; // Lead cannot be processed
}
```

**Why Page ID matching?**
- Multiple users can have Meta integrations
- Each user has different Meta Pages
- Need to route lead to correct user

#### Step 6: Fetch Lead Details from Meta API
```javascript
// Use user's Page Access Token to fetch full lead data
const leadDetails = await metaService.getLeadDetails(
  leadId,                           // "lead_abc123"
  user.settings.metaPageAccessToken // User's token
);

// Meta API Response:
{
  "id": "lead_abc123",
  "created_time": "2024-01-15T10:30:00+0000",
  "field_data": [
    { "name": "full_name", "values": ["John Doe"] },
    { "name": "email", "values": ["john@example.com"] },
    { "name": "phone_number", "values": ["+1234567890"] },
    { "name": "company_name", "values": ["Acme Corp"] }
  ]
}
```

#### Step 7: Get or Create Spreadsheet
```javascript
// Find or create "Meta Ads Leads" spreadsheet for this user
let spreadsheet = await Spreadsheet.findOne({
  user_id: user._id,
  name: 'Meta Ads Leads'
});

if (!spreadsheet) {
  spreadsheet = new Spreadsheet({
    user_id: user._id,
    name: 'Meta Ads Leads',
    description: 'Leads automatically imported from Meta Ads'
  });
  await spreadsheet.save();
}
```

**Why auto-create spreadsheet?**
- Ensures leads have a place to go
- User doesn't need to manually create it
- Consistent naming for easy identification

#### Step 8: Create Customer Record
```javascript
const customer = new Customer({
  user_id: user._id,
  spreadsheet_id: spreadsheet._id,
  customer_name: leadDetails.customerName || 'Meta Lead',
  company_name: leadDetails.companyName || 'Meta Ads',
  phone_number: leadDetails.phoneNumber || 'N/A',
  email: leadDetails.email || '',
  remark: `Meta Lead ID: ${leadId}`,
  status: 'new',
  next_call_date: new Date().toISOString().split('T')[0] // Today
});

await customer.save();
```

#### Step 9: Customer Appears in CRM
```
User opens CRM → Spreadsheet "Meta Ads Leads"
    ↓
New customer appears in the list
    ↓
User can now:
- View lead details
- Schedule follow-up call
- Add notes
- Change status
- Contact via WhatsApp
```

---

## 🔐 Security & Verification Flow

### Webhook Verification (Initial Setup)

```
Meta Developer Console → "Verify and Save"
    ↓
GET https://your-backend.com/api/meta/webhook?hub.mode=subscribe&hub.verify_token=USER_TOKEN&hub.challenge=RANDOM_STRING
    ↓
Backend checks:
├── hub.mode === 'subscribe' ✅
├── hub.verify_token === user.settings.metaVerifyToken ✅
└── Returns hub.challenge ✅
    ↓
Meta verifies webhook is valid
    ↓
Webhook subscription active ✅
```

---

## 📋 Data Flow Summary

### Input (From Meta)
```
Lead Form Submission
  ↓
Meta generates:
- leadgen_id
- page_id
- form_id
- timestamp
```

### Processing (Your Backend)
```
Webhook Event
  ↓
Find User (by page_id)
  ↓
Fetch Lead Details (Meta API)
  ↓
Extract Data:
- Name
- Email
- Phone
- Company
```

### Output (To Your CRM)
```
Customer Record:
- customer_name
- company_name
- phone_number
- email
- remark (with Meta ID)
- status: "new"
- spreadsheet: "Meta Ads Leads"
```

---

## ⚠️ Error Handling Flow

### Scenario 1: No User Found
```
Webhook receives page_id: "page_123"
    ↓
Search for user with metaPageId: "page_123"
    ↓
No user found ❌
    ↓
Log error: "No user found for page_id: page_123"
    ↓
Lead not processed (but webhook still returns 200)
```

### Scenario 2: Invalid Access Token
```
User found ✅
    ↓
Fetch lead details with token
    ↓
Meta API returns 401 Unauthorized ❌
    ↓
Log error: "Invalid Meta Page Access Token"
    ↓
Lead not processed
```

### Scenario 3: Meta API Timeout
```
User found ✅
    ↓
Fetch lead details
    ↓
Meta API timeout ❌
    ↓
Log error: "Failed to fetch lead details"
    ↓
Could implement retry logic (future enhancement)
```

---

## 🎯 Key Features

### 1. **Real-Time Processing**
- Leads appear in CRM within seconds
- No manual import needed

### 2. **Automatic Organization**
- All Meta leads go to "Meta Ads Leads" spreadsheet
- Easy to find and manage

### 3. **Multi-User Support**
- Each user can have their own Meta integration
- Leads routed to correct user based on Page ID

### 4. **Data Preservation**
- Meta Lead ID stored in remark field
- Can track back to original lead if needed

### 5. **Error Resilience**
- Webhook always responds quickly
- Background processing prevents timeouts
- Errors logged for debugging

---

## 🔄 Complete Example Flow

### Example Scenario:
1. **10:00 AM** - User configures Meta integration in settings
2. **10:05 AM** - User sets up webhook in Meta Developer Console
3. **2:30 PM** - Someone sees Facebook ad, clicks, fills form
4. **2:30:05 PM** - Meta sends webhook to your backend
5. **2:30:06 PM** - Backend responds "EVENT_RECEIVED"
6. **2:30:07 PM** - Backend finds user by page_id
7. **2:30:08 PM** - Backend fetches lead details from Meta API
8. **2:30:10 PM** - Backend creates customer record
9. **2:30:11 PM** - Customer appears in "Meta Ads Leads" spreadsheet
10. **2:35 PM** - User opens CRM, sees new lead, schedules follow-up

**Total Time: ~5 seconds from form submission to CRM entry**

---

## 📝 Notes

- **Webhook URL must be publicly accessible** (HTTPS in production)
- **Verify Token must match** between Meta and user settings
- **Page Access Token must have `leads_retrieval` permission**
- **Webhook must respond within 20 seconds** (we respond immediately)
- **Multiple users can have different Meta Pages** (routed by page_id)

