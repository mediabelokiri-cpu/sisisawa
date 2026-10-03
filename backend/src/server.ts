import app from './app.js';
import { initDatabase } from './config/db.js';

const PORT = process.env.PORT || 5050;

async function bootstrap() {
  try {
    console.log('Initializing PostgreSQL database...');
    await initDatabase();
    console.log('Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`===========================================`);
      console.log(`🚀 Kasirku POS Backend Server running on:`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`===========================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
