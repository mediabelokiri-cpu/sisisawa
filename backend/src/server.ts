import app from './app.js';
import { initDatabase } from './config/db.js';

const PORT = process.env.PORT || 5050;

if (!process.env.VERCEL) {
  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  app.listen(portNum, '0.0.0.0', () => {
    console.log(`===========================================`);
    console.log(`🚀 SISISAWA POS Backend Server running on:`);
    console.log(`   http://0.0.0.0:${portNum}`);
    console.log(`===========================================`);
  });

  initDatabase().catch((err) => {
    console.error('Initial DB connect attempt failed:', err);
  });
}

export default app;
