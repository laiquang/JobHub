
import { Router, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '@/config/database';
import { authenticate, authorize } from '@/middlewares/auth';
import { AuthenticatedRequest } from '@/types';

const router = Router();

// API 1: Lấy danh sách gói Free/Premium
router.get('/plans', async (_req, res, next) => {
  try {
    const [plans] = await pool.query<RowDataPacket[]>(
      `SELECT
          id,
          code,
          name,
          description,
          price,
          duration_days,
          max_active_jobs,
          ai_cv_scoring,
          priority_jobs
       FROM subscription_plans
       WHERE is_active = 1
       ORDER BY price ASC`
    );

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
});

// API 2: Xem gói hiện tại của nhà tuyển dụng
router.get(
  '/me',
  authenticate,
  authorize('company'),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const companyId = req.user!.id;

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT
            cs.id AS subscription_id,
            cs.status,
            cs.start_date,
            cs.end_date,
            p.code,
            p.name,
            p.price,
            p.max_active_jobs,
            p.ai_cv_scoring,
            p.priority_jobs
         FROM company_subscriptions cs
         JOIN subscription_plans p
           ON cs.plan_id = p.id
         WHERE cs.company_id = ?
           AND cs.status = 'ACTIVE'
           AND (
             cs.end_date IS NULL
             OR cs.end_date > NOW()
           )
         ORDER BY cs.id DESC
         LIMIT 1`,
        [companyId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Chưa tìm thấy gói đang hoạt động'
        });
      }

      return res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
