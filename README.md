# 🚀 Bottleup - Personal Productivity Dashboard

Your all-in-one personal productivity hub with universal search, notes, and expense tracking.

## 🏗️ Project Structure

```
bottleup.me/
├── frontend/           # React app (localhost:3000)
├── backend-worker/     # Cloudflare Worker for search APIs (localhost:8787)
├── backend-api/        # Express + MongoDB API (localhost:5000)
└── MONGODB_SETUP.md   # Database setup instructions
```

## ✨ Features

- **🔍 Universal Search** - Search Google, YouTube, Reddit, and AI chat in one place
- **📝 Notes** - Notion-like notes app (MongoDB powered)
- **💰 Expense Tracker** - Track spending with MongoDB database
- **💬 Motivational Quotes** - Daily inspiration
- **🎨 Beautiful UI** - Modern purple gradient design

## 🚀 Quick Start

### 1. Setup MongoDB Database
Follow instructions in `MONGODB_SETUP.md` to setup either:
- MongoDB Atlas (cloud, free, recommended)
- Local MongoDB installation

### 2. Start All Services

**Terminal 1 - MongoDB API Server:**
```bash
cd backend-api
npm install
npm run dev
```
Runs on http://localhost:5000

**Terminal 2 - Cloudflare Worker (Search):**
```bash
cd backend-worker
wrangler dev
```
Runs on http://127.0.0.1:8787

**Terminal 3 - React Frontend:**
```bash
cd frontend
npm install
npm start
```
Opens at http://localhost:3000

### 3. Configure API Keys

**backend-worker/.dev.vars:**
```
YT_API_KEY=your_youtube_api_key
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CX=your_google_custom_search_engine_id
GROQ_API_KEY=your_groq_api_key
```

**backend-api/.env:**
```
MONGODB_URI=mongodb://localhost:27017/bottleup
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bottleup
PORT=5000
```

## 📋 API Endpoints

### Search API (Cloudflare Worker - :8787)
- `GET /?q=query&pro=true` - Universal search
- `POST /chat` - AI chatbot
- `GET /quote` - Motivational quote

### MongoDB API (Express - :5000)
- **Notes:**
  - `GET /api/notes` - Get all notes
  - `POST /api/notes` - Create note
  - `PUT /api/notes/:id` - Update note
  - `DELETE /api/notes/:id` - Delete note

- **Expenses:**
  - `GET /api/expenses` - Get all expenses
  - `GET /api/expenses/summary` - Get summary & stats
  - `POST /api/expenses` - Create expense
  - `PUT /api/expenses/:id` - Update expense
  - `DELETE /api/expenses/:id` - Delete expense

## 🔒 Security

- All sensitive files ignored in `.gitignore`
- API keys stored in `.dev.vars` (Cloudflare) and `.env` (Node.js)
- Never commit secrets to Git

## 🛠️ Tech Stack

- **Frontend:** React, React Router
- **Search Backend:** Cloudflare Workers, KV Cache
- **Database Backend:** Express.js, MongoDB
- **APIs:** YouTube Data API, Google Custom Search, Groq AI, ZenQuotes

## 📝 Next Steps

1. ✅ Setup MongoDB (see MONGODB_SETUP.md)
2. ⏳ Build Notes app UI
3. ⏳ Build Expense Tracker UI
4. ⏳ Add quote rotation logic
5. ⏳ Deploy to production

## 🎯 Development

```bash
# Install all dependencies
cd frontend && npm install
cd ../backend-worker && npm install
cd ../backend-api && npm install

# Run in development mode (3 terminals)
# Terminal 1:
cd backend-api && npm run dev

# Terminal 2:
cd backend-worker && wrangler dev

# Terminal 3:
cd frontend && npm start
```

## 📦 Production Deployment

- **Frontend:** Deploy to Vercel/Netlify
- **Cloudflare Worker:** `cd backend-worker && wrangler deploy`
- **MongoDB API:** Deploy to Railway/Render/Heroku
- **Database:** MongoDB Atlas (already cloud)

---

Made with ❤️ for personal productivity
