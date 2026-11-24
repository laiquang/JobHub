import { Response, NextFunction } from 'express';


import { AuthenticatedRequest } from '@/types';
import { AdminJobService } from '@/services/adminJobService';
import { AppError } from '@/middlewares/errorHandler';

export class AdminJobController {
private adminJobService = new AdminJobService();

// ==========================================
// LẤY DANH SÁCH TIN TUYỂN DỤNG
// ==========================================

getAllJobs = async (
req: AuthenticatedRequest,
res: Response,
next: NextFunction
) => {
try {
const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;

const search = String(
req.query.search || ''
);

const status = String(
req.query.status || 'ALL'
).toUpperCase();

if (
!['ALL', 'ACTIVE', 'HIDDEN'].includes(status)
) {
throw new AppError(
'Trạng thái lọc không hợp lệ',
400
);
}

const result =
await this.adminJobService.getAllJobs(
page,
limit,
search,
status
);

res.status(200).json({
success: true,
data: result.jobs,
pagination: result.pagination,
});
} catch (error) {
next(error);
}
};

// ==========================================
// THỐNG KÊ
// ==========================================

getStatistics = async (
_req: AuthenticatedRequest,
res: Response,
next: NextFunction
) => {
try {
const data =
await this.adminJobService.getStatistics();

res.status(200).json({
success: true,
data,
});
} catch (error) {
next(error);
}
};

// ==========================================
// CHI TIẾT TIN TUYỂN DỤNG
// ==========================================

getJobById = async (
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
throw new AppError(
'ID tin tuyển dụng không hợp lệ',
400
);
}

const job =
await this.adminJobService.getJobById(id);

res.status(200).json({
success: true,
data: job,
});
} catch (error) {
next(error);
}
};

// ==========================================
// ẨN / KHÔI PHỤC TIN TUYỂN DỤNG
// VÀ GHI LỊCH SỬ HOẠT ĐỘNG ADMIN
// ==========================================

updateJobStatus = async (
req: AuthenticatedRequest,
res: Response,
next: NextFunction
) => {
try {
const id = Number(req.params.id);
const status = req.body?.status;

if (
!Number.isSafeInteger(id) ||
id <= 0
) {
throw new AppError(
'ID tin tuyển dụng không hợp lệ',
400
);
}

if (
status !== 'ACTIVE' &&
status !== 'HIDDEN'
) {
throw new AppError(
'Trạng thái phải là ACTIVE hoặc HIDDEN',
400
);
}

// Chỉ Admin đã xác thực mới được thao tác.
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

// Truyền ID Admin xuống Service
// để ghi lịch sử thao tác.
const job =
await this.adminJobService.updateJobStatus(
id,
status,
adminId
);

res.status(200).json({
success: true,
message:
status === 'HIDDEN'
? 'Ẩn tin tuyển dụng thành công'
: 'Khôi phục tin tuyển dụng thành công',
data: job,
});
} catch (error) {
next(error);
}
};
}