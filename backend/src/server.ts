import app from './app.js';
import { initDatabase } from './config/db.js';

const PORT = process.env.PORT || 5050;

async function bootstrap() {
  try {
    console.log('Initializing PostgreSQL database...');
    await initDatabase();
    console.log('Database initialized successfully.');

    const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
    app.listen(portNum, '0.0.0.0', () => {
      console.log(`===========================================`);
      console.log(`🚀 SISISAWA POS Backend Server running on:`);
      console.log(`   http://0.0.0.0:${portNum}`);
      console.log(`===========================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
