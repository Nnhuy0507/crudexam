const { randomBytes, scrypt: scryptCallback, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { db } = require('./db');
const scrypt = promisify(scryptCallback);
const digest = token => createHash('sha256').update(token).digest('hex');

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const [format, salt, hex] = String(stored).split('$');
  if (format !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(hex || '')) return false;
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
async function issueSession(user) {
  const token = randomBytes(32).toString('hex');
  
  await db.collection('auth_sessions').insertOne({ _id: digest(token), user_id: user._id, expires_at: new Date(Date.now() + 7 * 86400000) });
  return { token, user: publicUser(user) };
}
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  try {
    const session = await db.collection('auth_sessions').findOne({ _id: digest(token), expires_at: { $gt: new Date() } });
    const user = session && await db.collection('users').findOne({ _id: session.user_id }, { projection: { matkhau: 0 } });
    if (!user) return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn.' });
    req.user = user; req.tokenHash = digest(token); next();
  } catch (error) { next(error); }
}
const isAdmin = user => !!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL.trim().toLowerCase();
const publicUser = user => ({ id: String(user._id), email: user.email, hoten: user.hoten, hinhanh: user.hinhanh || '', isAdmin: isAdmin(user) });
function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Chỉ quản trị viên được sử dụng chức năng này.' });
  next();
}
module.exports = { publicUser, hashPassword, verifyPassword, issueSession, requireAuth, requireAdmin, isAdmin };
