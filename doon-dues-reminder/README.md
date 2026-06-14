# 📱 Doon Dues Reminder
### School Fee WhatsApp Reminder System — MERN Stack

A full-featured web application to automate WhatsApp fee reminders, track payments, manage teachers, and visualise collection analytics.

---

## 🚀 Features

| Feature | Details |
|---------|---------|
| 📂 **Excel Import** | Drag & drop Excel → auto-maps columns → imports all parents |
| 💬 **WhatsApp Sending** | Opens WhatsApp Web with personalised messages (100% free) |
| 📅 **Custom Schedule** | Set any time for reminders, choose days, set delay between messages |
| ✏️ **Custom Templates** | Use `{parent_name}`, `{student_name}`, `{class}`, `{amount}` placeholders |
| ✅ **Mark as Paid** | Mark partial/full payments — stops reminders automatically |
| 📊 **Analytics** | Charts showing dues cleared, monthly trend, class-wise breakdown |
| 👥 **Admin + Teachers** | Admin creates teachers; teachers see only their assigned classes |
| 🔐 **Secure Login** | JWT auth, authorised users only |

---

## 📁 Project Structure

```
doon-dues-reminder/
├── server/                  ← Node.js + Express + MongoDB
│   ├── models/
│   │   ├── User.js          ← Admin & Teacher accounts
│   │   ├── Student.js       ← Student/parent dues & payment history
│   │   └── Campaign.js      ← Scheduled campaigns
│   ├── routes/
│   │   ├── auth.js          ← Login, JWT
│   │   ├── students.js      ← CRUD + Excel import + pay
│   │   ├── campaigns.js     ← Campaign management
│   │   ├── dashboard.js     ← Analytics data
│   │   ├── users.js         ← User management (admin)
│   │   └── templates.js     ← Built-in message templates
│   ├── middleware/
│   │   └── auth.js          ← JWT protect + adminOnly
│   ├── utils/
│   │   └── scheduler.js     ← node-schedule cron jobs
│   ├── index.js             ← Server entry point
│   └── .env.example         ← Environment variables template
│
└── client/                  ← React 18 frontend
    └── src/
        ├── pages/
        │   ├── Login.js
        │   ├── Dashboard.js  ← Charts, KPIs, recent payments
        │   ├── Students.js   ← Excel import, table, mark paid
        │   ├── Campaigns.js  ← Create/edit scheduled campaigns
        │   ├── Send.js       ← Manual send with live progress
        │   ├── Users.js      ← Teacher management (admin only)
        │   └── Reports.js    ← Full analytics page
        ├── context/
        │   └── AuthContext.js
        ├── utils/
        │   └── api.js        ← Axios with JWT interceptors
        ├── App.js            ← Router + protected routes
        └── index.css         ← Full design system
```

---

## ⚡ Quick Setup

### Step 1 — Prerequisites
- Node.js 18+ → https://nodejs.org
- MongoDB Community → https://www.mongodb.com/try/download/community
- Git (optional)

### Step 2 — Install Dependencies

```bash
# In the root folder
cd doon-dues-reminder

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 3 — Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/doon_dues_reminder
JWT_SECRET=change_this_to_a_long_random_secret_string
CLIENT_URL=http://localhost:3000
```

### Step 4 — Create First Admin Account

Start the server once, then visit this URL in your browser:
```
POST http://localhost:5000/api/auth/seed-admin
```

Or use curl:
```bash
curl -X POST http://localhost:5000/api/auth/seed-admin
```

This creates:
- Email: `admin@doondueskreminder.com`
- Password: `Admin@1234`

> ⚠️ Change the password immediately after first login!

### Step 5 — Run in Development

```bash
# Terminal 1 — Start MongoDB
mongod

# Terminal 2 — Start Server
cd server
npm run dev

# Terminal 3 — Start React Client
cd client
npm start
```

Open http://localhost:3000

---

## 🌐 Production Deployment (Hosting on Your Website)

### Option A: Deploy on a VPS (Recommended — DigitalOcean, AWS, Hostinger VPS)

```bash
# On your server
git clone <your-repo>
cd doon-dues-reminder

# Install PM2 for process management
npm install -g pm2

# Build React
cd client && npm run build && cd ..

# Update server to serve React build
# (Already handled — server serves /client/build in production)

# Set production env
cd server
nano .env  # Set NODE_ENV=production, your MongoDB Atlas URI, strong JWT_SECRET

# Start with PM2
pm2 start index.js --name "doon-dues"
pm2 startup
pm2 save
```

### Option B: MongoDB Atlas (Free Cloud Database)

1. Go to https://cloud.mongodb.com
2. Create free cluster
3. Get connection string
4. Replace `MONGO_URI` in `.env` with Atlas URI

### Option C: Deploy Client on Netlify / Vercel

```bash
cd client
npm run build
# Upload /build folder to Netlify or Vercel
# Set REACT_APP_API_URL to your server URL
```

---

## 📊 Excel File Format

Your Excel sheet needs these columns (names are flexible, auto-detected):

| Column | Required | Example |
|--------|----------|---------|
| Parent Name | ✅ Yes | Ramesh Kumar |
| Phone Number | ✅ Yes | 9876543210 |
| Amount Due | ✅ Yes | 8500 |
| Student Name | Optional | Aarav Kumar |
| Class | Optional | Class 5-A |
| Due Since | Optional | April 2025 |
| Notes | Optional | Internal notes |

> ✅ Country code (91) is added automatically if not present
> ✅ Rows with Amount Due = 0 are skipped
> ✅ Re-importing updates existing records (matched by phone number)

---

## 💬 Message Placeholders

Use these in your custom templates:

| Placeholder | Replaced With |
|------------|---------------|
| `{parent_name}` | Parent's full name |
| `{student_name}` | Student's name |
| `{class}` | Class / grade |
| `{amount}` | Remaining due amount (₹) |
| `{due_since}` | Month fees have been pending |

---

## 🔐 Roles & Permissions

| Feature | Admin | Teacher |
|---------|-------|---------|
| All student data | ✅ | ❌ (own classes only) |
| Create campaigns | ✅ | ❌ |
| Send reminders | ✅ | ✅ |
| Mark payment | ✅ | ✅ |
| Add/edit users | ✅ | ❌ |
| View reports | ✅ | ✅ (own classes) |
| Import Excel | ✅ | ✅ |

---

## ❓ FAQ

**Q: Is WhatsApp sending really free?**
A: Yes. The system opens WhatsApp Web in your browser with pre-filled messages. No WhatsApp Business API needed.

**Q: Does the computer need to be on for scheduled sends?**
A: Yes. The node-schedule cron runs on your server. For 24/7 operation, deploy on a VPS or keep a PC running.

**Q: Can I customise the message templates?**
A: Yes — fully. Each campaign slot has its own template. Click any placeholder chip to insert it.

**Q: How do I stop messages to a parent who paid?**
A: Click ✅ Pay on their row. Their status changes to "paid" and they are excluded from all future campaigns.

---

## 🆘 Support

For issues, contact your system administrator or the developer who set this up.

---

*Doon Dues Reminder — Built for schools, with ❤️*
