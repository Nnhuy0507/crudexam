const express = require('express');
const cors = require('cors');
const { db, ObjectId, checkConnection } = require('./db');
const { hashPassword, verifyPassword, issueSession, requireAuth, publicUser, requireAdmin, isAdmin } = require('./auth');
const app = express();
app.disable('x-powered-by'); app.use(cors()); app.use(express.json({ limit: '3mb' }));
const fail = (res, message, status = 400) => res.status(status).json({ message });

// Bound password work per client to avoid repeated expensive hash operations.
const attempts = new Map();
const cleanup = setInterval(() => { for (const [ip, value] of attempts) if (value.until < Date.now()) attempts.delete(ip); }, 60000);
cleanup.unref();
app.use('/api/auth', (req, res, next) => {
  if (!['/login', '/register'].includes(req.path)) return next();
  const now = Date.now(); const value = attempts.get(req.ip);
  const entry = value && value.until > now ? value : { count: 0, until: now + 60000 };
  entry.count++; attempts.set(req.ip, entry);
  if (entry.count > 20) return fail(res, 'Vui lòng thử lại sau một phút.', 429);
  next();
});
function validImage(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 2800000) return false;
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) return false;
  const data = Buffer.from(match[2], 'base64');
  if (data.length > 2 * 1024 * 1024) return false;
  if (match[1] === 'jpeg') return data[0] === 255 && data[1] === 216 && data[2] === 255;
  if (match[1] === 'png') return data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  return data.subarray(0,4).toString() === 'RIFF' && data.subarray(8,12).toString() === 'WEBP';
}
function credentials(body) {
  return typeof body?.email === 'string' && body.email.trim().length <= 150 && /^\S+@\S+\.\S+$/.test(body.email.trim()) && typeof body.matkhau === 'string' && body.matkhau.length >= 6 && body.matkhau.length <= 128;
}
app.post('/api/auth/register', async (req, res) => {
  if (!credentials(req.body) || typeof req.body.hoten !== 'string' || !req.body.hoten.trim() || req.body.hoten.trim().length > 100) return fail(res, 'Nhập họ tên, email hợp lệ và mật khẩu từ 6 đến 128 ký tự.');
  const hoten = req.body.hoten.trim(), email = req.body.email.trim().toLowerCase();
  try {
    if (!validImage(req.body.hinhanh || '')) return fail(res, 'Ảnh không hợp lệ. Chọn JPG/PNG/WebP tối đa 2 MB.');
    const hash = await hashPassword(req.body.matkhau);
    const result = await db.collection('users').insertOne({ hoten, email, matkhau: hash, hinhanh: req.body.hinhanh || '' });
    res.status(201).json(await issueSession({ _id: result.insertedId, hoten, email, hinhanh: req.body.hinhanh || '' }));
  } catch (error) { if (error.code === 11000) return fail(res, 'Email đã được đăng ký.', 409); throw error; }
});
app.post('/api/auth/login', async (req, res) => {
  if (!credentials(req.body)) return fail(res, 'Email hoặc mật khẩu không hợp lệ.');
  const user = await db.collection('users').findOne({ email: req.body.email.trim().toLowerCase() });
  if (!user || !await verifyPassword(req.body.matkhau, user.matkhau)) return fail(res, 'Email hoặc mật khẩu không đúng.', 401);
  res.json(await issueSession(user));
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json(publicUser(req.user)));
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await db.collection('auth_sessions').deleteOne({ _id: req.tokenHash }); res.sendStatus(204);
});
app.get('/api/health', async (_req, res) => { try { const result = await checkConnection(); res.json({ status: 'ok', database: result.databaseName }); } catch { fail(res, 'Database connection unavailable', 503); } });
app.put('/api/auth/me', requireAuth, async (req, res) => {
  const { hoten, hinhanh } = req.body || {};
  if (typeof hoten !== 'string' || !hoten.trim() || hoten.trim().length > 100 || !validImage(hinhanh)) return fail(res, 'Họ tên hoặc ảnh không hợp lệ. Ảnh tối đa 2 MB.');
  const user = await db.collection('users').findOneAndUpdate({ _id: req.user._id }, { $set: { hoten: hoten.trim(), hinhanh } }, { returnDocument: 'after' });
  res.json(publicUser(user));
});
app.use('/api/users', requireAuth, requireAdmin);
app.get('/api/users', async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 150) : '';
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = search ? { $or: [{ hoten: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }] } : {};
  const [rows, total] = await Promise.all([db.collection('users').find(filter, { projection: { matkhau: 0 } }).sort({ _id: -1 }).skip((page - 1) * 20).limit(20).toArray(), db.collection('users').countDocuments(filter)]);
  res.json({ users: rows.map(publicUser), total, page });
});
app.post('/api/users', async (req, res) => {
  const { hoten, email, matkhau, hinhanh = '' } = req.body || {};
  if (!credentials({ email, matkhau }) || typeof hoten !== 'string' || !hoten.trim() || hoten.trim().length > 100 || !validImage(hinhanh)) return fail(res, 'Nhập họ tên, email, mật khẩu từ 6–128 ký tự và ảnh hợp lệ.');
  const user = { hoten: hoten.trim(), email: email.trim().toLowerCase(), matkhau: await hashPassword(matkhau), hinhanh };
  try { const result = await db.collection('users').insertOne(user); res.status(201).json(publicUser({ ...user, _id: result.insertedId })); }
  catch (error) { if (error.code === 11000) return fail(res, 'Email đã được sử dụng.', 409); throw error; }
});
app.param('id', (req, res, next, id) => /^[a-f0-9]{24}$/i.test(id) ? next() : fail(res, 'ID người dùng không hợp lệ.'));
app.get('/api/users/:id', async (req, res) => {
  const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) }, { projection: { matkhau: 0 } });
  if (!user) return fail(res, 'Không tìm thấy người dùng.', 404);
  res.json(publicUser(user));
});
app.put('/api/users/:id', async (req, res) => {
  const { hoten, email, hinhanh, matkhau } = req.body || {};
  if (typeof hoten !== 'string' || !hoten.trim() || hoten.trim().length > 100 || !credentials({ email, matkhau: matkhau || 'unchanged-password' }) || !validImage(hinhanh)) return fail(res, 'Thông tin người dùng không hợp lệ.');
  const filter = { _id: new ObjectId(req.params.id) };
  const existing = await db.collection('users').findOne(filter);
  if (!existing) return fail(res, 'Không tìm thấy người dùng.', 404);
  if (isAdmin(existing) && existing.email !== email.trim().toLowerCase()) return fail(res, 'Email quản trị được cấu hình ở backend, không thể thay đổi tại đây.');
  const changes = { hoten: hoten.trim(), email: email.trim().toLowerCase(), hinhanh };
  if (matkhau) changes.matkhau = await hashPassword(matkhau);
  try {
    const updated = await db.collection('users').findOneAndUpdate(filter, { $set: changes }, { returnDocument: 'after' });
    if (matkhau) await db.collection('auth_sessions').deleteMany({ user_id: filter._id });
    res.json(publicUser(updated));
  } catch (error) { if (error.code === 11000) return fail(res, 'Email đã được sử dụng.', 409); throw error; }
});
app.delete('/api/users/:id', async (req, res) => {
  const id = new ObjectId(req.params.id);
  const user = await db.collection('users').findOne({ _id: id });
  if (!user) return fail(res, 'Không tìm thấy người dùng.', 404);
  if (isAdmin(user)) return fail(res, 'Không thể xóa tài khoản quản trị đang được cấu hình.');
  await db.collection('users').deleteOne({ _id: id });
  await db.collection('auth_sessions').deleteMany({ user_id: id });
  res.sendStatus(204);
});
app.use((_req, res) => fail(res, 'Không tìm thấy API.', 404));
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.too.large') return fail(res, 'Ảnh quá lớn. Chọn ảnh tối đa 2 MB.', 413);
  if (error.type === 'entity.parse.failed') return fail(res, 'Dữ liệu JSON không hợp lệ.');
  console.error(`API error (${error.code || 'UNKNOWN'}).`); fail(res, 'Không thể xử lý yêu cầu. Vui lòng thử lại.', 500);
});
module.exports = app;
