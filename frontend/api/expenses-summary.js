import { connectToDatabase } from './lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('expenses');

    const expenses = await collection.find({}).toArray();
    
    // Calculate total
    const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    // Calculate by category
    const byCategory = {};
    expenses.forEach(exp => {
      const cat = exp.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + (exp.amount || 0);
    });

    return res.status(200).json({
      total,
      count: expenses.length,
      byCategory
    });
  } catch (error) {
    console.error('Expenses summary API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
