import { Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2';

import pool from '@/config/database';
import { AuthenticatedRequest } from '@/types';
import { AppError } from './errorHandler';

interface AdminStatusRow extends RowDataPacket {
  status: 'ACTIVE' | 'LOCKED';
}

export const requireActiveAdmin = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.userType !== 'admin') {
      return next(new AppError('Không có quyền quản trị', 403));
    }

    const [rows] = await pool.query<AdminStatusRow[]>(
      `SELECT status
       FROM admins
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (
      rows.length === 0 ||
      rows[0].status !== 'ACTIVE'
    ) {
      return next(
        new AppError('Tài khoản Admin không còn hoạt động', 403)
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};