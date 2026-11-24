
import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth';
import { MessageController } from '@/controllers/messageController';

const router = Router();

// Tất cả API đoạn chat đều yêu cầu đăng nhập
router.use(authenticate);

// Chỉ ứng viên và công ty được sử dụng đoạn chat
router.use(authorize('user', 'company'));

// Lấy danh sách cuộc hội thoại
router.get('/', MessageController.getConversations);

// Tạo hoặc lấy cuộc hội thoại
router.post('/', MessageController.createConversation);

// Đếm số thư chưa đọc
router.get('/unread-count', MessageController.getUnreadCount);

// Lấy lịch sử thư
router.get('/:id/messages', MessageController.getMessages);

// Gửi thư
router.post('/:id/messages', MessageController.sendMessage);

// Đánh dấu thư đã đọc
router.patch('/:id/read', MessageController.markAsRead);

export default router;
