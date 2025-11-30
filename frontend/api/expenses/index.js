import { connectToDatabase } from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('expenses');

    if (req.method === 'GET') {
      const expenses = await collection.find({}).sort({ date: -1 }).toArray();
      return res.status(200).json(expenses);
    }

    if (req.method === 'POST') {
      const { title, amount, category, date, description } = req.body;
      const expense = {
        title: title || 'Expense',
        amount: parseFloat(amount) || 0,
        category: category || 'Other',
        date: date ? new Date(date) : new Date(),
        description: description || '',
        createdAt: new Date(),
      };
      const result = await collection.insertOne(expense);
      return res.status(201).json({ ...expense, _id: result.insertedId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Expenses API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
