
import {
  Router,
  Request,
  Response,
  NextFunction,
} from 'express';

import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2';

import pool from '@/config/database';
import {
  authenticateStrict,
  authorize,
} from '@/middlewares/auth';

import { requireActiveAdmin } from '@/middlewares/requireActiveAdmin';
import { AppError } from '@/middlewares/errorHandler';
import { AuthenticatedRequest } from '@/types';

const router = Router();

// ==========================================
// BẢO VỆ TOÀN BỘ ROUTE ADMIN COMPANIES
// ==========================================

router.use(
  authenticateStrict,
  authorize('admin'),
  requireActiveAdmin
);

// ==========================================
// TYPES
// ==========================================

interface CompanyRow extends RowDataPacket {
  id: number;
  nameCompany: string | null;
  nameAdmin: string | null;
  email: string | null;
  phone: string | null;
  avatarPic: string | null;
  idProvince: number | null;
  intro: string | null;
  scale: string | null;
  web: string | null;
  status: 'ACTIVE' | 'LOCKED';
  created_at: Date | string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ==========================================
// GET /api/admin/companies
// DANH SÁCH + TÌM KIẾM + LỌC + PHÂN TRANG
// ==========================================

router.get(
  '/',
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const pageInput = Number(
        req.query.page ?? 1
      );

      const limitInput = Number(
        req.query.limit ?? 10
      );

      const page =
        Number.isInteger(pageInput) &&
        pageInput > 0
          ? pageInput
          : 1;

      const limit =
        Number.isInteger(limitInput) &&
        limitInput > 0
          ? Math.min(limitInput, 100)
          : 10;

      const offset = (page - 1) * limit;

      const search = String(
        req.query.search ?? ''
      ).trim();

      const statusInput = String(
        req.query.status ?? 'ALL'
      ).toUpperCase();

      const status = (
        ['ALL', 'ACTIVE', 'LOCKED'].includes(
          statusInput
        )
          ? statusInput
          : 'ALL'
      ) as 'ALL' | 'ACTIVE' | 'LOCKED';

      const conditions: string[] = [];
      const params: Array<string | number> = [];

      if (search) {
        conditions.push(
          '(c.nameCompany LIKE ? OR c.email LIKE ? OR c.nameAdmin LIKE ?)'
        );

        const keyword = `%${search}%`;

        params.push(
          keyword,
          keyword,
          keyword
        );
      }

      if (status !== 'ALL') {
        conditions.push('c.status = ?');
        params.push(status);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const [countRows] =
        await pool.query<CountRow[]>(
          `
          SELECT COUNT(*) AS total
          FROM companies c
          ${whereClause}
          `,
          params
        );

      const total = Number(
        countRows[0]?.total ?? 0
      );

      const totalPages = Math.max(
        1,
        Math.ceil(total / limit)
      );

      const [companies] =
        await pool.query<CompanyRow[]>(
          `
          SELECT
            c.id,
            c.nameCompany,
            c.nameAdmin,
            c.email,
            c.phone,
            c.avatarPic,
            c.idProvince,
            c.scale,
            c.web,
            c.status,
            c.created_at
          FROM companies c
          ${whereClause}
          ORDER BY c.id DESC
          LIMIT ? OFFSET ?
          `,
          [...params, limit, offset]
        );

      res.status(200).json({
        success: true,
        data: companies,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /api/admin/companies/:id
// XEM CHI TIẾT NHÀ TUYỂN DỤNG
// ==========================================

router.get(
  '/:id',
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);

      if (
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {
        throw new AppError(
          'ID nhà tuyển dụng không hợp lệ',
          400
        );
      }

      const [rows] =
        await pool.query<CompanyRow[]>(
          `
          SELECT
            id,
            nameCompany,
            nameAdmin,
            email,
            phone,
            avatarPic,
            idProvince,
            intro,
            scale,
            web,
            status,
            created_at
          FROM companies
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );

      if (rows.length === 0) {
        throw new AppError(
          'Không tìm thấy nhà tuyển dụng',
          404
        );
      }

      res.status(200).json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// PATCH /api/admin/companies/:id/status
// KHÓA / MỞ KHÓA + GHI LỊCH SỬ ADMIN
// ==========================================

router.patch(
  '/:id/status',
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const status = req.body?.status;

      if (
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {
        throw new AppError(
          'ID nhà tuyển dụng không hợp lệ',
          400
        );
      }

      if (
        status !== 'ACTIVE' &&
        status !== 'LOCKED'
      ) {
        throw new AppError(
          'Trạng thái phải là ACTIVE hoặc LOCKED',
          400
        );
      }

      if (
        !req.user ||
        req.user.userType !== 'admin'
      ) {
        throw new AppError(
          'Bạn không có quyền quản trị',
          403
        );
      }

      const adminId = req.user.id;

      const connection =
        await pool.getConnection();

      try {
        await connection.beginTransaction();

        // Khóa bản ghi công ty để tránh
        // cập nhật đồng thời.
        const [rows] =
          await connection.query<CompanyRow[]>(
            `
            SELECT
              id,
              nameCompany,
              email,
              status
            FROM companies
            WHERE id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [id]
          );

        if (rows.length === 0) {
          throw new AppError(
            'Không tìm thấy nhà tuyển dụng',
            404
          );
        }

        const company = rows[0];

        // Chỉ cập nhật và ghi lịch sử
        // nếu trạng thái thực sự thay đổi.
        if (company.status !== status) {
          const [result] =
            await connection.query<ResultSetHeader>(
              `
              UPDATE companies
              SET status = ?
              WHERE id = ?
              `,
              [status, id]
            );

          if (result.affectedRows === 0) {
            throw new AppError(
              'Không thể cập nhật nhà tuyển dụng',
              400
            );
          }

          const action =
            status === 'LOCKED'
              ? 'LOCK_COMPANY'
              : 'UNLOCK_COMPANY';

          const companyName =
            company.nameCompany ||
            company.email ||
            `#${id}`;

          const description =
            status === 'LOCKED'
              ? `Admin đã khóa nhà tuyển dụng "${companyName}" (ID: ${id})`
              : `Admin đã mở khóa nhà tuyển dụng "${companyName}" (ID: ${id})`;

          await connection.query<ResultSetHeader>(
            `
            INSERT INTO admin_activity_logs (
              admin_id,
              action,
              target_type,
              target_id,
              description
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
              adminId,
              action,
              'COMPANY',
              id,
              description,
            ]
          );
        }

        await connection.commit();

        res.status(200).json({
          success: true,
          message:
            status === 'LOCKED'
              ? 'Đã khóa tài khoản nhà tuyển dụng thành công.'
              : 'Đã mở khóa tài khoản nhà tuyển dụng thành công.',
          data: {
            id,
            status,
          },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
