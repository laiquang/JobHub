import { Router } from 'express';
import { userCVController } from '@/controllers/userCVController';
import { authenticate } from '@/middlewares/auth';

const router = Router();

// Tất cả API CV đều bắt buộc đăng nhập

// Tạo CV
router.post(
  '/',
  authenticate,
  userCVController.createCV
);

// Danh sách CV của user hiện tại
router.get(
  '/',
  authenticate,
  userCVController.getMyCVs
);

// Chi tiết CV
router.get(
  '/:id',
  authenticate,
  userCVController.getCV
);

// Cập nhật CV
router.put(
  '/:id',
  authenticate,
  userCVController.updateCV
);

// Xóa CV
router.delete(
  '/:id',
  authenticate,
  userCVController.deleteCV
);

export default router;