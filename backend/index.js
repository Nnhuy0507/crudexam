const { client, initDatabase } = require('./db');
const app = require('./app');
async function start() {
  try {
    await initDatabase();
    const port = Number(process.env.PORT || 3001);
    const server = app.listen(port, '0.0.0.0');
    server.on('listening', () => console.log(`API listening on port ${port}`));
    server.on('error', async error => { console.error(`API startup failed (${error.code || 'UNKNOWN'}).`); await client.close(); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await client.close(); }));
  } catch (error) { console.error(`Startup failed (${error.code || 'UNKNOWN'}). Check MongoDB and backend/.env.`); await client.close(); process.exitCode = 1; }
}
start();
