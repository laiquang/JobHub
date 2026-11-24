import { Response, NextFunction } from 'express';
import { userCVService } from '@/services/userCVService';
import { AuthenticatedRequest } from '@/types';
import { ResponseUtil } from '@/utils/response';

export class UserCVController {

  // =====================================================
  // TẠO CV
  // =====================================================
  async createCV(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      // Kiểm tra đăng nhập
      if (!userId) {
        ResponseUtil.error(
          res,
          'Vui lòng đăng nhập',
          401
        );
        return;
      }

      // Chỉ người tìm việc được tạo CV
      if (req.user?.userType !== 'user') {
        ResponseUtil.error(
          res,
          'Chỉ người tìm việc mới có thể tạo CV',
          403
        );
        return;
      }

      // Lấy dữ liệu từ frontend
      const {
        title,
        templateKey,
        cvData,
        settings
      } = req.body;

      // Kiểm tra tên CV
      if (!title || !title.trim()) {
        ResponseUtil.error(
          res,
          'Tên CV không được để trống',
          400
        );
        return;
      }

      // Kiểm tra nội dung CV
      if (!cvData) {
        ResponseUtil.error(
          res,
          'Nội dung CV không được để trống',
          400
        );
        return;
      }

      // Tạo CV
      const result =
        await userCVService.createCV({
          userId,
          title,
          templateKey:
            templateKey || 'modern',
          cvData,

          // Lưu thiết kế CV
          settings
        });

      ResponseUtil.success(
        res,
        result,
        'Tạo CV thành công',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // LẤY DANH SÁCH CV CỦA USER
  // =====================================================
  async getMyCVs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      // Kiểm tra đăng nhập
      if (!userId) {
        ResponseUtil.error(
          res,
          'Vui lòng đăng nhập',
          401
        );
        return;
      }

      // Chỉ người tìm việc được xem CV
      if (req.user?.userType !== 'user') {
        ResponseUtil.error(
          res,
          'Chỉ người tìm việc mới có thể xem CV',
          403
        );
        return;
      }

      const cvs =
        await userCVService.getMyCVs(
          userId
        );

      ResponseUtil.success(
        res,
        cvs
      );
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // LẤY CHI TIẾT 1 CV
  // =====================================================
  async getCV(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      const id =
        parseInt(req.params.id);

      // Kiểm tra đăng nhập
      if (!userId) {
        ResponseUtil.error(
          res,
          'Vui lòng đăng nhập',
          401
        );
        return;
      }

      // Chỉ người tìm việc được xem CV
      if (req.user?.userType !== 'user') {
        ResponseUtil.error(
          res,
          'Chỉ người tìm việc mới có thể xem CV',
          403
        );
        return;
      }

      // Kiểm tra ID
      if (isNaN(id)) {
        ResponseUtil.error(
          res,
          'ID CV không hợp lệ',
          400
        );
        return;
      }

      const cv =
        await userCVService.getCV(
          id,
          userId
        );

      if (!cv) {
        ResponseUtil.error(
          res,
          'Không tìm thấy CV',
          404
        );
        return;
      }

      ResponseUtil.success(
        res,
        cv
      );
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // CẬP NHẬT CV
  // =====================================================
  async updateCV(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      const id =
        parseInt(req.params.id);

      // Kiểm tra đăng nhập
      if (!userId) {
        ResponseUtil.error(
          res,
          'Vui lòng đăng nhập',
          401
        );
        return;
      }

      // Chỉ người tìm việc được chỉnh sửa CV
      if (req.user?.userType !== 'user') {
        ResponseUtil.error(
          res,
          'Chỉ người tìm việc mới có thể chỉnh sửa CV',
          403
        );
        return;
      }

      // Kiểm tra ID
      if (isNaN(id)) {
        ResponseUtil.error(
          res,
          'ID CV không hợp lệ',
          400
        );
        return;
      }

      // Lấy dữ liệu từ frontend
      const {
        title,
        templateKey,
        cvData,
        settings
      } = req.body;

      // Cập nhật CV
      const cv =
        await userCVService.updateCV(
          id,
          userId,
          {
            title,
            templateKey,
            cvData,

            // Cập nhật thiết kế CV
            settings
          }
        );

      if (!cv) {
        ResponseUtil.error(
          res,
          'Không tìm thấy CV',
          404
        );
        return;
      }

      ResponseUtil.success(
        res,
        cv,
        'Cập nhật CV thành công'
      );
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // XÓA CV
  // =====================================================
  async deleteCV(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      const id =
        parseInt(req.params.id);

      // Kiểm tra đăng nhập
      if (!userId) {
        ResponseUtil.error(
          res,
          'Vui lòng đăng nhập',
          401
        );
        return;
      }

      // Chỉ người tìm việc được xóa CV
      if (req.user?.userType !== 'user') {
        ResponseUtil.error(
          res,
          'Chỉ người tìm việc mới có thể xóa CV',
          403
        );
        return;
      }

      // Kiểm tra ID
      if (isNaN(id)) {
        ResponseUtil.error(
          res,
          'ID CV không hợp lệ',
          400
        );
        return;
      }

      const deleted =
        await userCVService.deleteCV(
          id,
          userId
        );

      if (!deleted) {
        ResponseUtil.error(
          res,
          'Không tìm thấy CV',
          404
        );
        return;
      }

      ResponseUtil.success(
        res,
        null,
        'Xóa CV thành công'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const userCVController =
  new UserCVController();