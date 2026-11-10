const { client, checkConnection } = require('./db');

async function main() {
  try {
    const result = await checkConnection();
    console.log(`Connected to MongoDB database: ${result.databaseName}`);
  } catch (error) {
    console.error(`MongoDB connection failed (${error.code || 'UNKNOWN'}). Check backend/.env and start MongoDB.`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}
main();
