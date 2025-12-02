import { connectToDatabase } from '../lib/mongodb.js';
import { getUserIdFromRequest } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = getUserIdFromRequest(req);

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('tasks');

    if (req.method === 'GET') {
      const query = userId ? { userId } : {};
      const tasks = await collection.find(query).sort({ completed: 1, createdAt: -1 }).toArray();
      return res.status(200).json(tasks);
    }

    if (req.method === 'POST') {
      const { text, completed } = req.body;
      const task = {
        text: text || 'New Task',
        completed: completed || false,
        userId: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await collection.insertOne(task);
      return res.status(201).json({ ...task, _id: result.insertedId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
