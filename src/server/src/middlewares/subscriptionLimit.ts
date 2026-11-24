
import { Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '@/config/database';
import { AuthenticatedRequest } from '@/types';

export const checkJobPostingLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.userType !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ nhà tuyển dụng mới được đăng tin'
      });
    }

    const companyId = req.user.id;

    // Chỉ Premium ACTIVE và còn hạn mới có quyền không giới hạn.
    const [subscriptions] = await pool.query<RowDataPacket[]>(
      `SELECT cs.id
       FROM company_subscriptions cs
       JOIN subscription_plans sp ON sp.id = cs.plan_id
       WHERE cs.company_id = ?
         AND cs.status = 'ACTIVE'
         AND sp.code = 'PREMIUM'
         AND cs.start_date <= NOW()
         AND cs.end_date > NOW()
       LIMIT 1`,
      [companyId]
    );

    if (subscriptions.length > 0) {
      return next();
    }

    // Không có Premium hợp lệ => áp dụng giới hạn FREE.
    const [counts] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM jobs
       WHERE idCompany = ?
         AND deletedAt IS NULL`,
      [companyId]
    );

    const activeJobs = Number(counts[0].total);

    if (activeJobs >= 2) {
      return res.status(403).json({
        success: false,
        message:
          'Gói FREE chỉ được đăng tối đa 2 tin tuyển dụng đang hoạt động. Vui lòng nâng cấp Premium.',
        data: {
          currentPlan: 'FREE',
          activeJobs,
          maxActiveJobs: 2
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
