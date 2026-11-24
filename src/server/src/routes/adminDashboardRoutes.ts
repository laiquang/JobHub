
import {
  Router,
  Response,
  NextFunction,
} from 'express';

import { RowDataPacket } from 'mysql2';

import pool from '@/config/database';
import {
  authenticate,
  authorize,
} from '@/middlewares/auth';
import { requireActiveAdmin } from '@/middlewares/requireActiveAdmin';
import { AuthenticatedRequest } from '@/types';

const router = Router();

// ==========================================
// TYPES
// ==========================================

interface CountRow extends RowDataPacket {
  total: number;
}

interface PaymentStatsRow extends RowDataPacket {
  totalRevenue: string | number;
  totalPaidPayments: number;
}

interface MonthlyRevenueRow extends RowDataPacket {
  month: number;
  revenue: string | number;
}

interface MonthlyCountRow extends RowDataPacket {
  month: number;
  total: number;
}

// ==========================================
// MIDDLEWARE BẢO VỆ ADMIN
// ==========================================

router.use(
  '/admin/dashboard',
  authenticate,
  authorize('admin'),
  requireActiveAdmin
);

// ==========================================
// GET /api/admin/dashboard/stats
// THỐNG KÊ TỔNG QUAN
// ==========================================

router.get(
  '/admin/dashboard/stats',
  async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const [userRows] =
        await pool.query<CountRow[]>(
          `SELECT COUNT(*) AS total
           FROM users`
        );

      const [companyRows] =
        await pool.query<CountRow[]>(
          `SELECT COUNT(*) AS total
           FROM companies`
        );

      const [jobRows] =
        await pool.query<CountRow[]>(
          `SELECT COUNT(*) AS total
           FROM jobs`
        );

      const [paymentRows] =
        await pool.query<PaymentStatsRow[]>(
          `SELECT
             COALESCE(SUM(amount), 0) AS totalRevenue,
             COUNT(*) AS totalPaidPayments
           FROM payments
           WHERE status = 'PAID'`
        );

      const stats = {
        totalUsers: Number(
          userRows[0]?.total ?? 0
        ),
        totalCompanies: Number(
          companyRows[0]?.total ?? 0
        ),
        totalJobs: Number(
          jobRows[0]?.total ?? 0
        ),
        totalRevenue: Number(
          paymentRows[0]?.totalRevenue ?? 0
        ),
        totalPaidPayments: Number(
          paymentRows[0]?.totalPaidPayments ?? 0
        ),
      };

      res.setHeader(
        'Cache-Control',
        'no-store'
      );

      return res.status(200).json({
        success: true,
        message:
          'Lấy thống kê Dashboard thành công',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /api/admin/dashboard/charts
// THỐNG KÊ THEO THÁNG
// ==========================================

router.get(
  '/admin/dashboard/charts',
  async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const year = new Date().getFullYear();

      const startDate = `${year}-01-01`;
      const endDate = `${year + 1}-01-01`;

      // ======================================
      // 1. DOANH THU THEO THÁNG
      // ======================================

      const [revenueRows] =
        await pool.query<MonthlyRevenueRow[]>(
          `SELECT
             MONTH(paid_at) AS month,
             COALESCE(SUM(amount), 0) AS revenue
           FROM payments
           WHERE status = 'PAID'
             AND paid_at >= ?
             AND paid_at < ?
           GROUP BY MONTH(paid_at)
           ORDER BY month`,
          [startDate, endDate]
        );

      // ======================================
      // 2. ỨNG VIÊN THEO THÁNG
      // ======================================

      const [userRows] =
        await pool.query<MonthlyCountRow[]>(
          `SELECT
             MONTH(created_at) AS month,
             COUNT(*) AS total
           FROM users
           WHERE created_at >= ?
             AND created_at < ?
           GROUP BY MONTH(created_at)
           ORDER BY month`,
          [startDate, endDate]
        );

      // ======================================
      // 3. NHÀ TUYỂN DỤNG THEO THÁNG
      // ======================================

      const [companyRows] =
        await pool.query<MonthlyCountRow[]>(
          `SELECT
             MONTH(created_at) AS month,
             COUNT(*) AS total
           FROM companies
           WHERE created_at >= ?
             AND created_at < ?
           GROUP BY MONTH(created_at)
           ORDER BY month`,
          [startDate, endDate]
        );

      // ======================================
      // 4. TIN TUYỂN DỤNG THEO THÁNG
      // ======================================

      const [jobRows] =
        await pool.query<MonthlyCountRow[]>(
          `SELECT
             MONTH(createdAt) AS month,
             COUNT(*) AS total
           FROM jobs
           WHERE createdAt >= ?
             AND createdAt < ?
           GROUP BY MONTH(createdAt)
           ORDER BY month`,
          [startDate, endDate]
        );

      // ======================================
      // 5. TỔNG HỢP 12 THÁNG
      // ======================================

      const months = Array.from(
        { length: 12 },
        (_, index) => {
          const month = index + 1;

          const revenueRecord =
            revenueRows.find(
              (row) =>
                Number(row.month) === month
            );

          const userRecord =
            userRows.find(
              (row) =>
                Number(row.month) === month
            );

          const companyRecord =
            companyRows.find(
              (row) =>
                Number(row.month) === month
            );

          const jobRecord =
            jobRows.find(
              (row) =>
                Number(row.month) === month
            );

          return {
            month,
            label: `T${month}`,

            revenue: Number(
              revenueRecord?.revenue ?? 0
            ),

            users: Number(
              userRecord?.total ?? 0
            ),

            companies: Number(
              companyRecord?.total ?? 0
            ),

            jobs: Number(
              jobRecord?.total ?? 0
            ),
          };
        }
      );

      res.setHeader(
        'Cache-Control',
        'no-store'
      );

      return res.status(200).json({
        success: true,
        message:
          'Lấy dữ liệu biểu đồ thành công',
        data: {
          year,
          months,
          availability: {
            revenue: true,
            jobs: true,
            users: true,
            companies: true,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
