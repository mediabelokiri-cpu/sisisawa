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

dotenv.config();

const app = express();

// Middleware with 10mb limit for product photo uploads
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes - supporting both prefixed /api/ and direct paths
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/categories', '/categories'], categoryRoutes);
app.use(['/api/products', '/products'], productRoutes);
app.use(['/api/transactions', '/transactions'], transactionRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/settings', '/settings'], settingRoutes);

// Health check endpoint
app.get(['/api/health', '/health', '/api', '/'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'SISISAWA POS API Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default app;
