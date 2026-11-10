const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const { MongoClient, ObjectId } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
const db = client.db(process.env.MONGODB_DB || 'crud_exam');
async function checkConnection() {
  await db.command({ ping: 1 });
  return { databaseName: db.databaseName };
}
async function initDatabase() {
  await checkConnection();
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('auth_sessions').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  await db.collection('auth_sessions').createIndex({ user_id: 1 });
}
module.exports = { client, db, ObjectId, checkConnection, initDatabase };
