import app from './app.js';
import { initDatabase } from './config/db.js';

const PORT = process.env.PORT || 5050;
const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

app.listen(portNum, '0.0.0.0', async () => {
  console.log(`===========================================`);
  console.log(`🚀 SISISAWA POS Backend Server running on:`);
  console.log(`   http://0.0.0.0:${portNum}`);
  console.log(`===========================================`);

  try {
    console.log('Connecting to PostgreSQL database...');
    await initDatabase();
    console.log('✅ PostgreSQL database connected successfully.');
  } catch (err) {
    console.error('❌ DB connection error on startup:', err);
  }
});

export default app;
