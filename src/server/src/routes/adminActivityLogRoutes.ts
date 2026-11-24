import { Router } from 'express';

import {
  authenticateStrict,
  authorize,
} from '@/middlewares/auth';

import { requireActiveAdmin } from '@/middlewares/requireActiveAdmin';

import { AdminActivityLogController } from '@/controllers/adminActivityLogController';

const router = Router();
const controller = new AdminActivityLogController();

router.use(
  authenticateStrict,
  authorize('admin'),
  requireActiveAdmin
);

router.get('/stats', controller.getStatistics);
router.get('/', controller.getAllLogs);

export default router;