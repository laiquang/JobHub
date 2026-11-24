import { Router } from 'express';


import { AdminJobController } from '@/controllers/adminJobController';

import {
authenticateStrict,
authorize,
} from '@/middlewares/auth';

const router = Router();
const controller = new AdminJobController();

// Chỉ Admin đã đăng nhập được truy cập
router.use(
authenticateStrict,
authorize('admin')
);

// GET /api/admin/jobs/stats
router.get(
'/stats',
controller.getStatistics
);

// GET /api/admin/jobs
router.get(
'/',
controller.getAllJobs
);

// GET /api/admin/jobs/:id
router.get(
'/:id',
controller.getJobById
);

// PATCH /api/admin/jobs/:id/status
router.patch(
'/:id/status',
controller.updateJobStatus
);

export default router;