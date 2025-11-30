const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bottleup';

async function startServer() {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    db = client.db();
    
    // Start server AFTER MongoDB connects
    app.listen(PORT, () => {
      console.log(`🚀 API Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Bottleup API Server Running', status: 'ok' });
});

// ==================== NOTES API ====================

// Get all notes
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await db.collection('notes')
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single note
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await db.collection('notes')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create note
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const note = {
      title: title || 'Untitled',
      content: content || '',
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection('notes').insertOne(note);
    res.status(201).json({ ...note, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update note
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const update = {
      $set: {
        title,
        content,
        tags,
        updatedAt: new Date()
      }
    };
    const result = await db.collection('notes')
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        update,
        { returnDocument: 'after' }
      );
    if (!result) return res.status(404).json({ error: 'Note not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const result = await db.collection('notes')
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EXPENSES API ====================

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await db.collection('expenses')
      .find({})
      .sort({ date: -1 })
      .toArray();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get expenses summary (total, by category, etc.)
app.get('/api/expenses/summary', async (req, res) => {
  try {
    const expenses = await db.collection('expenses').find({}).toArray();
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const byCategory = {};
    expenses.forEach(exp => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += exp.amount;
    });

    res.json({
      total,
      count: expenses.length,
      byCategory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const expense = {
      title: title || 'Expense',
      amount: parseFloat(amount) || 0,
      category: category || 'Other',
      date: date ? new Date(date) : new Date(),
      description: description || '',
      createdAt: new Date()
    };
    const result = await db.collection('expenses').insertOne(expense);
    res.status(201).json({ ...expense, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    const update = {
      $set: {
        title,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        description,
        updatedAt: new Date()
      }
    };
    const result = await db.collection('expenses')
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        update,
        { returnDocument: 'after' }
      );
    if (!result) return res.status(404).json({ error: 'Expense not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const result = await db.collection('expenses')
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TASKS API ====================

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await db.collection('tasks')
      .find({})
      .sort({ completed: 1, createdAt: -1 }) // Incomplete first, then newest
      .toArray();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { text, completed } = req.body;
    const task = {
      text: text || 'New Task',
      completed: completed || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection('tasks').insertOne(task);
    res.status(201).json({ ...task, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task (toggle completion or edit text)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { text, completed } = req.body;
    const update = {
      $set: {
        updatedAt: new Date()
      }
    };
    if (text !== undefined) update.$set.text = text;
    if (completed !== undefined) update.$set.completed = completed;

    const result = await db.collection('tasks')
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        update,
        { returnDocument: 'after' }
      );
    
    if (!result) return res.status(404).json({ error: 'Task not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const result = await db.collection('tasks')
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
startServer();
