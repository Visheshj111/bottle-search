import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('tasks');

    if (req.method === 'PUT') {
      const { text, completed } = req.body;
      const update = { updatedAt: new Date() };
      if (text !== undefined) update.text = text;
      if (completed !== undefined) update.completed = completed;

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: 'after' }
      );
      if (!result) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json({ message: 'Task deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
