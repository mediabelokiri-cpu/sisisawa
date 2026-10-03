import { Router } from 'express';
import { getAllSettings, updateSettingByKey } from '../controllers/settingController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Only ADMIN can manage store and system settings
router.get('/', authenticateToken, getAllSettings);
router.put('/:key', authenticateToken, requireRole(['ADMIN']), updateSettingByKey);

export default router;
