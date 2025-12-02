import { connectToDatabase } from './lib/mongodb.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'bottleup-secret-key-change-in-production';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // GET /api/auth?action=me
    if (req.method === 'GET' && action === 'me') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        }
      });
    }

    // GET /api/auth?action=verify-email&token=xxx
    if (req.method === 'GET' && action === 'verify-email') {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      const user = await usersCollection.findOne({
        verificationToken: token,
        verificationExpiry: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: { emailVerified: true, updatedAt: new Date() },
          $unset: { verificationToken: '', verificationExpiry: '' }
        }
      );

      return res.status(200).json({ message: 'Email verified successfully', email: user.email });
    }

    // POST /api/auth?action=login
    if (req.method === 'POST' && action === 'login') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await usersCollection.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date() } }
      );

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        }
      });
    }

    // POST /api/auth?action=signup
    if (req.method === 'POST' && action === 'signup') {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const user = {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        emailVerified: false,
        verificationToken,
        verificationExpiry,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await usersCollection.insertOne(user);
      const userId = result.insertedId;

      const verificationUrl = `${process.env.SITE_URL || 'https://bottleup.me'}/verify-email?token=${verificationToken}`;
      console.log('Verification URL:', verificationUrl);

      if (process.env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'BottleUp <noreply@bottleup.me>',
              to: email,
              subject: 'Verify your email - BottleUp',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <h1 style="font-size: 24px; margin-bottom: 20px;">Welcome to BottleUp! 👋</h1>
                  <p style="color: #666; margin-bottom: 30px;">Hi ${name}, please verify your email address to get started.</p>
                  <a href="${verificationUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify Email</a>
                  <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 24 hours.</p>
                </div>
              `
            })
          });
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
        }
      }

      const token = jwt.sign(
        { userId: userId.toString(), email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Account created successfully. Please check your email to verify your account.',
        token,
        user: {
          id: userId.toString(),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
        }
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
