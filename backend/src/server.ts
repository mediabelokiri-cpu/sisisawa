import app from './app.js';
import { initDatabase } from './config/db.js';

const PORT = process.env.PORT || 5050;

async function bootstrap() {
  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

  // 1. Bind port immediately so health checks & requests are answered instantly
  app.listen(portNum, '0.0.0.0', () => {
    console.log(`===========================================`);
    console.log(`🚀 SISISAWA POS Backend Server running on:`);
    console.log(`   http://0.0.0.0:${portNum}`);
    console.log(`===========================================`);
  });

  // 2. Initialize database connection
  try {
    console.log('Initializing PostgreSQL database connection...');
    await initDatabase();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Initial DB connect attempt failed, will retry on demand:', err);
  }
}

bootstrap();
