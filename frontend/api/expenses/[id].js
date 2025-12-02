import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/mongodb.js';
import { getUserIdFromRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const userId = getUserIdFromRequest(req);

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('expenses');
    const query = { _id: new ObjectId(id) };
    if (userId) query.userId = userId;

    if (req.method === 'PUT') {
      const { title, amount, category, date, description } = req.body;
      const result = await collection.findOneAndUpdate(
        query,
        {
          $set: {
            title,
            amount: parseFloat(amount),
            category,
            date: new Date(date),
            description,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );
      if (!result) return res.status(404).json({ error: 'Expense not found' });
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Expense not found' });
      }
      return res.status(200).json({ message: 'Expense deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Expenses API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
