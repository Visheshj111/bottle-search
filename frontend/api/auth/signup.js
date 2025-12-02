import { connectToDatabase } from '../lib/mongodb.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'bottleup-secret-key-change-in-production';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
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

    // Send verification email (using a simple approach - in production use proper email service)
    const verificationUrl = `${process.env.SITE_URL || 'https://bottleup.me'}/verify-email?token=${verificationToken}`;
    
    // For now, we'll use a simple email service or log it
    // In production, integrate with SendGrid, Resend, etc.
    console.log('Verification URL:', verificationUrl);

    // Try to send email via Resend if API key exists
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
                <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
              </div>
            `
          })
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    }

    // Create JWT token
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
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
