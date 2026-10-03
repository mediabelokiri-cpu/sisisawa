import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import { initDatabase } from './config/db.js';

dotenv.config();

const app = express();

// Middleware with 10mb limit for product photo uploads
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to ensure DB connection is ready for incoming requests
app.use(async (req, res, next) => {
  try {
    await initDatabase();
  } catch (err) {
    console.error('Database connection error in request handler:', err);
  }
  next();
});

// Routes - supporting both prefixed /api/ and direct paths
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/dashboard', dashboardRoutes);

app.use('/api/categories', categoryRoutes);
app.use('/categories', categoryRoutes);

app.use('/api/products', productRoutes);
app.use('/products', productRoutes);

app.use('/api/transactions', transactionRoutes);
app.use('/transactions', transactionRoutes);

app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/settings', settingRoutes);
app.use('/settings', settingRoutes);

// Health check endpoint
const handleHealth = async (req: express.Request, res: express.Response) => {
  try {
    const client = await initDatabase();
    await client.query('SELECT 1');
    res.json({
      status: 'ok',
      dbType: client.type,
      databaseConnected: true,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      message: 'SISISAWA POS API Server is running',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err?.message || 'Database connection error',
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      timestamp: new Date().toISOString(),
    });
  }
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);
app.get('/api', handleHealth);
app.get('/', handleHealth);

const handler = (req: express.Request, res: express.Response) => {
  return app(req, res);
};

export { app };
export default handler;

