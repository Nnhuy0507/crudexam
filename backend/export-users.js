const fs = require('node:fs/promises');
const path = require('node:path');
const { db, client } = require('./db');
async function main() {
  const users = await db.collection('users').find({}, { projection: { email: 1, matkhau: 1, hoten: 1, hinhanh: 1 } }).toArray();
  const output = path.join(__dirname, 'data', 'users.json');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(users.map(({ _id, ...user }) => user), null, 2) + '\n');
  console.log('Exported backend/data/users.json (contains password hashes; use demo accounts for submission).');
}
main().catch(() => { console.error('Export failed. Check MongoDB.'); process.exitCode = 1; }).finally(() => client.close());
