const { db, client, initDatabase } = require('./db');
const { hashPassword } = require('./auth');
async function migrate() {
  await initDatabase();
  let count = 0;
  for await (const user of db.collection('users').find({})) {
    const changes = {};
    if (user.hoten === undefined && typeof user.name === 'string') changes.hoten = user.name;
    if (user.matkhau === undefined && typeof user.password_hash === 'string') changes.matkhau = user.password_hash;
    // Existing exam data may contain a plain password; hash it before use.
    if (typeof user.matkhau === 'string' && !user.matkhau.startsWith('scrypt$')) changes.matkhau = await hashPassword(user.matkhau);
    if (user.hinhanh === undefined) changes.hinhanh = '';
    if (!Object.keys(changes).length && user.name === undefined && user.password_hash === undefined) continue;
    await db.collection('users').updateOne({ _id: user._id }, { $set: changes, $unset: { name: '', password_hash: '' } });
    count++;
  }
  console.log(`Updated ${count} users to the exam fields.`);
}
migrate().catch(() => { console.error('User migration failed. Check MongoDB and backend/.env.'); process.exitCode = 1; }).finally(() => client.close());
