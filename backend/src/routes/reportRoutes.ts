import { Router } from 'express';
import { getMonthlyReport, getAvailableMonths } from '../controllers/reportController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Only ADMIN can access monthly report analysis
router.get('/monthly', authenticateToken, requireRole(['ADMIN']), getMonthlyReport);
router.get('/months', authenticateToken, requireRole(['ADMIN']), getAvailableMonths);

export default router;
