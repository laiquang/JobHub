
import { Router, Response, NextFunction } from 'express';
import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2';

import pool from '@/config/database';
import { authenticate, authorize } from '@/middlewares/auth';
import { requireActiveAdmin } from '@/middlewares/requireActiveAdmin';
import { AuthenticatedRequest } from '@/types';
import { AppError } from '@/middlewares/errorHandler';

const router = Router();

interface UserRow extends RowDataPacket {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarPic: string | null;
  birthDay: Date | null;
  sex: string | null;
  idProvince: number | null;
  intro: string | null;
  linkSocial: string | null;
  created_at: Date | null;
  status: 'ACTIVE' | 'LOCKED';
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ==========================================
// BẢO VỆ ROUTE ADMIN
// ==========================================

router.use(
  authenticate,
  authorize('admin'),
  requireActiveAdmin
);

// ==========================================
// GET /api/admin/users
// DANH SÁCH + TÌM KIẾM + LỌC + PHÂN TRANG
// ==========================================

router.get(
  '/',
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const page = Math.max(
        1,
        Math.floor(Number(req.query.page) || 1)
      );

      const limit = Math.min(
        100,
        Math.max(
          1,
          Math.floor(Number(req.query.limit) || 10)
        )
      );

      const search =
        typeof req.query.search === 'string'
          ? req.query.search.trim()
          : '';

      const status =
        typeof req.query.status === 'string'
          ? req.query.status.toUpperCase()
          : '';

      if (
        status &&
        status !== 'ALL' &&
        status !== 'ACTIVE' &&
        status !== 'LOCKED'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái không hợp lệ',
        });
      }

      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (search) {
        conditions.push(
          '(name LIKE ? OR email LIKE ?)'
        );

        params.push(
          `%${search}%`,
          `%${search}%`
        );
      }

      if (status && status !== 'ALL') {
        conditions.push('status = ?');
        params.push(status);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const [countRows] =
        await pool.query<CountRow[]>(
          `
          SELECT COUNT(*) AS total
          FROM users
          ${whereClause}
          `,
          params
        );

      const total = Number(
        countRows[0]?.total ?? 0
      );

      const totalPages = Math.ceil(
        total / limit
      );

      const offset = (page - 1) * limit;

      const [users] =
        await pool.query<UserRow[]>(
          `
          SELECT
            id,
            name,
            email,
            phone,
            avatarPic,
            created_at,
            status
          FROM users
          ${whereClause}
          ORDER BY id DESC
          LIMIT ? OFFSET ?
          `,
          [...params, limit, offset]
        );

      return res.json({
        success: true,
        message: 'Lấy danh sách ứng viên thành công',
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /api/admin/users/:id
// XEM CHI TIẾT ỨNG VIÊN
// ==========================================

router.get(
  '/:id',
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = Number(req.params.id);

      if (
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'ID ứng viên không hợp lệ',
        });
      }

      const [rows] =
        await pool.query<UserRow[]>(
          `
          SELECT
            id,
            name,
            email,
            phone,
            avatarPic,
            birthDay,
            sex,
            idProvince,
            intro,
            linkSocial,
            created_at,
            status
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [id]
        );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy ứng viên',
        });
      }

      return res.json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// PATCH /api/admin/users/:id/status
// KHÓA / MỞ KHÓA + GHI LỊCH SỬ ADMIN
// ==========================================

router.patch(
  '/:id/status',
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body ?? {};

      if (
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {
        throw new AppError(
          'ID ứng viên không hợp lệ',
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

        // Khóa bản ghi ứng viên để tránh
        // cập nhật đồng thời gây sai lịch sử.
        const [rows] =
          await connection.query<UserRow[]>(
            `
            SELECT
              id,
              name,
              email,
              status
            FROM users
            WHERE id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [id]
          );

        if (rows.length === 0) {
          throw new AppError(
            'Không tìm thấy ứng viên',
            404
          );
        }

        const user = rows[0];

        // Không ghi lịch sử khi trạng thái
        // thực tế không thay đổi.
        if (user.status !== status) {
          const [result] =
            await connection.query<ResultSetHeader>(
              `
              UPDATE users
              SET status = ?
              WHERE id = ?
              `,
              [status, id]
            );

          if (result.affectedRows === 0) {
            throw new AppError(
              'Không thể cập nhật ứng viên',
              400
            );
          }

          const action =
            status === 'LOCKED'
              ? 'LOCK_USER'
              : 'UNLOCK_USER';

          const userName =
            user.name ||
            user.email ||
            `#${id}`;

          const description =
            status === 'LOCKED'
              ? `Admin đã khóa tài khoản ứng viên "${userName}" (ID: ${id})`
              : `Admin đã mở khóa tài khoản ứng viên "${userName}" (ID: ${id})`;

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
              'USER',
              id,
              description,
            ]
          );
        }

        await connection.commit();

        return res.json({
          success: true,
          message:
            status === 'LOCKED'
              ? 'Đã khóa tài khoản ứng viên'
              : 'Đã mở khóa tài khoản ứng viên',
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
