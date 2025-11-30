# Backend API Server (MongoDB)

Express.js API server for Notes and Expenses with MongoDB.

## Setup

### Option 1: Local MongoDB
1. Install MongoDB: https://www.mongodb.com/try/download/community
2. Start MongoDB service:
   ```bash
   mongod
   ```
3. Use the default `.env` configuration

### Option 2: MongoDB Atlas (Cloud - Free)
1. Create account at https://www.mongodb.com/cloud/atlas/register
2. Create a free cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env` file

## Start Server

```bash
npm start
# or with auto-reload
npm run dev
```

Server runs on http://localhost:5000

## API Endpoints

### Notes
- `GET /api/notes` - Get all notes
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/summary` - Get expenses summary (total, by category)
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
