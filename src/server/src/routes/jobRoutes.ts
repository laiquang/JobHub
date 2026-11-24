
import { Router } from 'express';
import { JobController } from '@/controllers/jobController';
import { authenticate } from '@/middlewares/auth';

const router = Router();
const jobController = new JobController();

// ============================================
// PUBLIC JOB ROUTES
// Không yêu cầu đăng nhập
// ============================================

/**
 * GET /jobs/stats
 * Lấy thống kê công việc.
 */
router.get(
  '/jobs/stats',
  jobController.getJobStats
);

/**
 * GET /jobs/:id
 * Lấy chi tiết một công việc.
 */
router.get(
  '/jobs/:id',
  jobController.getJobById
);

/**
 * GET /jobs
 * Lấy danh sách công việc, hỗ trợ tìm kiếm,
 * lọc và phân trang.
 */
router.get(
  '/jobs',
  jobController.getAllJobs
);

// ============================================
// AUTHENTICATED JOB ROUTES
// Yêu cầu đăng nhập
// ============================================

/**
 * POST /jobs
 *
 * Tạo tin tuyển dụng mới.
 *
 * Quyền đăng tin được kiểm tra trong JobService:
 * - FREE: tối đa 2 tin chưa bị ẩn.
 * - PREMIUM còn hạn: không giới hạn.
 * - PREMIUM hết hạn: áp dụng giới hạn FREE.
 *
 * JobController kiểm tra userType = 'company'.
 */
router.post(
  '/jobs',
  authenticate,
  jobController.createJob
);

/**
 * PUT /jobs/:id
 *
 * Cập nhật tin tuyển dụng.
 * Chỉ công ty sở hữu tin được cập nhật.
 */
router.put(
  '/jobs/:id',
  authenticate,
  jobController.updateJob
);

/**
 * DELETE /jobs/:id
 *
 * Xóa cứng tin tuyển dụng.
 * Chỉ công ty sở hữu tin được xóa.
 */
router.delete(
  '/jobs/:id',
  authenticate,
  jobController.deleteJob
);

/**
 * PUT /jobs/:id/hidden
 *
 * Ẩn tin tuyển dụng.
 *
 * Tin bị ẩn không được tính vào giới hạn
 * 2 tin đang hoạt động của gói FREE.
 */
router.put(
  '/jobs/:id/hidden',
  authenticate,
  jobController.hideJob
);

/**
 * PUT /jobs/:id/unhidden
 *
 * Khôi phục tin tuyển dụng đã ẩn.
 *
 * JobService sẽ:
 * - Kiểm tra quyền sở hữu.
 * - Kiểm tra giới hạn FREE/PREMIUM.
 * - Khôi phục trong transaction.
 */
router.put(
  '/jobs/:id/unhidden',
  authenticate,
  jobController.unhideJob
);

// ============================================
// NESTED RESOURCE ROUTES
// ============================================

/**
 * GET /companies/:id/jobs
 *
 * Lấy danh sách tin tuyển dụng của công ty.
 */
router.get(
  '/companies/:id/jobs',
  jobController.getJobsByCompany
);

export default router;
