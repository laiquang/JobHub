
import { Router, Request, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import pool from '@/config/database';
import { authenticateStrict, authorize } from '@/middlewares/auth';
import { AuthenticatedRequest } from '@/types';
import { requireActiveAdmin } from '@/middlewares/requireActiveAdmin';

const router = Router();

interface AdminRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED';
}

// ==========================================
// POST /auth/admins/sessions
// Đăng nhập Admin
// ==========================================

router.post(
  '/auth/admins/sessions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body ?? {};

      if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message: 'Email và mật khẩu là bắt buộc'
        });
      }

      const [rows] = await pool.query<AdminRow[]>(
        `SELECT id, full_name, email, password, role, status
         FROM admins
         WHERE email = ?
         LIMIT 1`,
        [email.trim().toLowerCase()]
      );

      // Thông báo chung để tránh tiết lộ email có tồn tại.
      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không chính xác'
        });
      }

      const admin = rows[0];

      const isPasswordValid = await bcrypt.compare(
        password,
        admin.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không chính xác'
        });
      }

      if (admin.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản quản trị đã bị khóa'
        });
      }

      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        throw new Error('JWT_SECRET chưa được cấu hình');
      }

      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          userType: 'admin'
        },
        jwtSecret,
        { expiresIn: '8h' }
      );

      return res.json({
        success: true,
        message: 'Đăng nhập Admin thành công',
        data: {
          token,
          admin: {
            id: admin.id,
            full_name: admin.full_name,
            email: admin.email,
            role: admin.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// GET /admin/me
// Lấy thông tin Admin đang đăng nhập
// ==========================================

router.get(
  '/admin/me',
  authenticateStrict,
  requireActiveAdmin,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const [rows] = await pool.query<AdminRow[]>(
        `SELECT id, full_name, email, role, status
         FROM admins
         WHERE id = ?
         LIMIT 1`,
        [req.user!.id]
      );

      if (rows.length === 0 || rows[0].status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản Admin không còn hoạt động'
        });
      }

      const admin = rows[0];

      return res.json({
        success: true,
        data: {
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
          role: admin.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
