import { connectToDatabase } from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Find user with this verification token
    const user = await usersCollection.findOne({
      verificationToken: token,
      verificationExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user as verified
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date()
        },
        $unset: {
          verificationToken: '',
          verificationExpiry: ''
        }
      }
    );

    return res.status(200).json({
      message: 'Email verified successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
