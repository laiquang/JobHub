
import { Response, NextFunction } from 'express';

import { AuthenticatedRequest } from '@/types';

import { AppError } from '@/middlewares/errorHandler';

import { AdminActivityLogService } from '@/services/adminActivityLogService';

// ==========================================
// DANH SÁCH ACTION ĐƯỢC PHÉP
// ==========================================

const ALLOWED_ACTIONS = [
  'ALL',
  'LOCK_USER',
  'UNLOCK_USER',
  'LOCK_COMPANY',
  'UNLOCK_COMPANY',
  'HIDE_JOB',
  'RESTORE_JOB',
];

// ==========================================
// DANH SÁCH TARGET TYPE ĐƯỢC PHÉP
// ==========================================

const ALLOWED_TARGET_TYPES = [
  'ALL',
  'USER',
  'COMPANY',
  'JOB',
  'PAYMENT',
  'SUBSCRIPTION',
];

// ==========================================
// ADMIN ACTIVITY LOG CONTROLLER
// ==========================================

export class AdminActivityLogController {
  // ========================================
  // GET /api/admin/activity-logs
  // DANH SÁCH + TÌM KIẾM + LỌC + PHÂN TRANG
  // ========================================

  getAllLogs = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // ====================================
      // PAGINATION
      // ====================================

      const pageInput = Number(
        req.query.page ?? 1
      );

      const limitInput = Number(
        req.query.limit ?? 10
      );

      const page =
        Number.isSafeInteger(pageInput) &&
        pageInput > 0
          ? pageInput
          : 1;

      const limit =
        Number.isSafeInteger(limitInput) &&
        limitInput > 0
          ? Math.min(limitInput, 100)
          : 10;

      // ====================================
      // SEARCH
      // ====================================

      const search =
        typeof req.query.search === 'string'
          ? req.query.search.trim()
          : '';

      // ====================================
      // FILTER ACTION
      // ====================================

      const action =
        typeof req.query.action === 'string'
          ? req.query.action.toUpperCase()
          : 'ALL';

      if (!ALLOWED_ACTIONS.includes(action)) {
        throw new AppError(
          'Loại hành động không hợp lệ',
          400
        );
      }

      // ====================================
      // FILTER TARGET TYPE
      // ====================================

      const targetType =
        typeof req.query.targetType === 'string'
          ? req.query.targetType.toUpperCase()
          : 'ALL';

      if (
        !ALLOWED_TARGET_TYPES.includes(
          targetType
        )
      ) {
        throw new AppError(
          'Loại đối tượng không hợp lệ',
          400
        );
      }

      // ====================================
      // GET DATA FROM SERVICE
      // ====================================

      const result =
        await AdminActivityLogService.getAllLogs(
          page,
          limit,
          search,
          action,
          targetType
        );

      // ====================================
      // RESPONSE
      // ====================================

      res.status(200).json({
        success: true,
        message:
          'Lấy lịch sử hoạt động Admin thành công',
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  // ========================================
  // GET /api/admin/activity-logs/stats
  // THỐNG KÊ HOẠT ĐỘNG ADMIN
  // ========================================

  getStatistics = async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data =
        await AdminActivityLogService.getStatistics();

      res.status(200).json({
        success: true,
        message:
          'Lấy thống kê hoạt động Admin thành công',
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
