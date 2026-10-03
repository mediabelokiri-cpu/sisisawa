import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser
} from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Only ADMIN can manage Users / Cashiers
router.use(authenticateToken, requireRole(['ADMIN']));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.patch('/:id/reset-password', resetUserPassword);
router.delete('/:id', deleteUser);

export default router;
