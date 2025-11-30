import { connectToDatabase } from '../lib/mongodb.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('notes');

    if (req.method === 'GET') {
      const notes = await collection.find({}).sort({ updatedAt: -1 }).toArray();
      return res.status(200).json(notes);
    }

    if (req.method === 'POST') {
      const { title, content, tags } = req.body;
      const note = {
        title: title || 'Untitled',
        content: content || '',
        tags: tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await collection.insertOne(note);
      return res.status(201).json({ ...note, _id: result.insertedId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Notes API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
