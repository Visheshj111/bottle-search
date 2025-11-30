# 🗄️ MongoDB Setup Guide

## Quick Start: MongoDB Atlas (Recommended - Free & Cloud)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create a free M0 cluster (512MB storage - plenty for personal use)

### Step 2: Get Connection String
1. In Atlas dashboard, click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (looks like):
   ```
   mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<USERNAME>`, `<PASSWORD>`, and `<CLUSTER>` with your actual values
5. Add database name at the end: `/bottleup`

### Step 3: Update .env File
Open `backend-api/.env` and set:
```
MONGODB_URI=<your-mongodb-atlas-connection-string>
```

### Step 4: Whitelist Your IP
1. In Atlas, go to "Network Access"
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
4. Confirm

### Step 5: Start the API Server
```bash
cd backend-api
npm run dev
```

---

## Alternative: Local MongoDB Installation

### Windows
1. Download: https://www.mongodb.com/try/download/community
2. Run installer (choose "Complete" installation)
3. Install as Windows Service (checkbox during install)
4. MongoDB will auto-start

OR use Chocolatey:
```bash
choco install mongodb
```

### Start MongoDB
```bash
mongod
```

Default connection: `mongodb://localhost:27017/bottleup` (already in .env)

---

## Verify Connection

Start the API server:
```bash
cd backend-api
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 API Server running on http://localhost:5000
```

Test it:
```bash
curl http://localhost:5000/api/notes
```

---

## 🔧 Troubleshooting

### "MongoError: Authentication failed"
- Double-check username and password in connection string
- Make sure password doesn't contain special characters (or URL encode them)

### "MongoNetworkError: connection refused"
- For Atlas: Check IP whitelist
- For Local: Make sure `mongod` is running

### "ECONNREFUSED 127.0.0.1:27017"
- Local MongoDB not running
- Run `mongod` in a terminal
