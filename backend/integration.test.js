const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const app = require('./app');
const { db, client, ObjectId, initDatabase } = require('./db');

test('User registration, private profile, image persistence and session lifecycle', async () => {
  let server, userId, otherId, managedId;
  const oldAdmin = process.env.ADMIN_EMAIL;
  const email = `integration-${randomUUID()}@example.test`;
  const otherEmail = `integration-${randomUUID()}@example.test`;
  const image = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../assets/images/favicon.png')).toString('base64');
  try {
    await initDatabase();
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(route, method = 'GET', body, token) {
      const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, data: response.status === 204 ? null : await response.json() };
    }
    const data = { email, matkhau: 'Test-password-123', hoten: 'Nguyễn Văn An', hinhanh: image, role: 'admin' };
    assert.equal((await call('/auth/me')).status, 401);
    assert.equal((await call('/auth/register', 'POST', { ...data, hoten: '' })).status, 400);
    assert.equal((await call('/auth/register', 'POST', { ...data, hinhanh: 'data:image/png;base64,YWJj' })).status, 400);
    const registration = await call('/auth/register', 'POST', data);
    assert.equal(registration.status, 201); userId = new ObjectId(registration.data.user.id);
    const token = registration.data.token;
    assert.equal(registration.data.user.hoten, data.hoten);
    assert.equal(registration.data.user.hinhanh, image);
    assert.equal('matkhau' in registration.data.user, false);
    const stored = await db.collection('users').findOne({ _id: userId });
    assert.deepEqual(Object.keys(stored).sort(), ['_id', 'email', 'matkhau', 'hoten', 'hinhanh'].sort());
    assert.ok(stored.matkhau.startsWith('scrypt$'));
    assert.notEqual(stored.matkhau, data.matkhau);
    assert.equal((await call('/auth/register', 'POST', data)).status, 409);
    assert.equal((await call('/auth/login', 'POST', { email, matkhau: 'wrong-password' })).status, 401);
    const login = await call('/auth/login', 'POST', { email, matkhau: data.matkhau }); assert.equal(login.status, 200);
    const other = await call('/auth/register', 'POST', { ...data, email: otherEmail, hinhanh: '' });
    assert.equal(other.status, 201); otherId = new ObjectId(other.data.user.id);
    assert.equal((await call('/users', 'GET', undefined, token)).status, 403);
    process.env.ADMIN_EMAIL = email;
    assert.equal((await call('/auth/me', 'GET', undefined, token)).data.isAdmin, true);
    assert.equal((await call('/users', 'GET', undefined, other.data.token)).status, 403);
    const managed = await call('/users', 'POST', { hoten: 'Managed User', email: `managed-${randomUUID()}@example.test`, matkhau: 'Managed-pass-123', hinhanh: image, role: 'admin' }, token);
    assert.equal(managed.status, 201); managedId = new ObjectId(managed.data.id);
    assert.equal('matkhau' in managed.data, false);
    assert.equal(managed.data.isAdmin, false);
    assert.deepEqual(Object.keys(await db.collection('users').findOne({_id:managedId})).sort(), ['_id','email','hoten','matkhau','hinhanh'].sort());
    const managedLogin = await call('/auth/login','POST',{email:managed.data.email,matkhau:'Managed-pass-123'});
    assert.equal(managedLogin.status,200);
    const managedUpdate=await call(`/users/${managedId}`,'PUT',{hoten:'Updated managed',email:managed.data.email,hinhanh:image,matkhau:'Changed-pass-123'},token);
    assert.equal(managedUpdate.status,200);
    assert.equal((await call('/auth/me','GET',undefined,managedLogin.data.token)).status,401);
    assert.equal((await call(`/users/${managedId}`,'GET',undefined,token)).data.hoten,'Updated managed');
    assert.equal((await call(`/users?search=${encodeURIComponent(managed.data.email)}`,'GET',undefined,token)).data.total,1);
    assert.equal((await call('/users?search=%5B','GET',undefined,token)).status,200);
    assert.equal((await call('/users/invalid','GET',undefined,token)).status,400);
    assert.equal((await call(`/users/${userId}`,'DELETE',undefined,token)).status,400);
    assert.equal((await call(`/users/${managedId}`,'DELETE',undefined,other.data.token)).status,403);
    assert.equal((await call(`/users/${managedId}`,'DELETE',undefined,token)).status,204);
    assert.equal((await call(`/users/${managedId}`,'GET',undefined,token)).status,404);
    const update = await call('/auth/me', 'PUT', { hoten: 'Tên đã cập nhật', hinhanh: image, email: otherEmail, id: String(otherId) }, token);
    assert.equal(update.status, 200); assert.equal(update.data.email, email);
    assert.equal((await db.collection('users').findOne({ _id: otherId })).hoten, data.hoten);
    const me = await call('/auth/me', 'GET', undefined, login.data.token);
    assert.equal(me.data.hoten, 'Tên đã cập nhật'); assert.equal(me.data.hinhanh, image); assert.equal('matkhau' in me.data, false);
    assert.equal((await call('/auth/me', 'PUT', { hoten: 'An', hinhanh: 'javascript:alert(1)' }, token)).status, 400);
    assert.equal((await call('/auth/me', 'PUT', { hoten: 'An', hinhanh: 'data:image/jpeg;base64,' + Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') }, token)).status, 400);
    assert.equal((await call('/products', 'GET', undefined, token)).status, 404);
    assert.equal((await call('/auth/logout', 'POST', undefined, token)).status, 204);
    assert.equal((await call('/auth/me', 'GET', undefined, token)).status, 401);
    await db.collection('auth_sessions').updateMany({ user_id: userId }, { $set: { expires_at: new Date(Date.now() - 86400000) } });
    assert.equal((await call('/auth/me', 'GET', undefined, login.data.token)).status, 401);
  } finally {
    if (oldAdmin === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL=oldAdmin;
    for (const id of [userId, otherId, managedId].filter(Boolean)) {
      await db.collection('auth_sessions').deleteMany({ user_id: id });
      await db.collection('users').deleteOne({ _id: id });
    }
    if (server) await new Promise(resolve => server.close(resolve));
    await client.close();
  }
});
