import { Router } from 'express';
import { getDashboardStats, getTransactionDetail } from '../controllers/dashboardController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Only ADMIN can access dashboard stats
router.get('/stats', authenticateToken, requireRole(['ADMIN']), getDashboardStats);
router.get('/transactions/:id', authenticateToken, requireRole(['ADMIN']), getTransactionDetail);

export default router;
