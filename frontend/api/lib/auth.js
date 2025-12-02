import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bottleup-secret-key-change-in-production';

export function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (err) {
    return null;
  }
}
