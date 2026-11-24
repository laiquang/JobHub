
import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import { MessageService } from '@/services/messageService';
import { ResponseUtil } from '@/utils/response';
import { catchAsync, AppError } from '@/middlewares/errorHandler';

export class MessageController {

  // GET /api/conversations
  // Lấy danh sách cuộc hội thoại
  static getConversations = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const account = req.user!;

      const conversations =
        await MessageService.getConversations(account);

      ResponseUtil.success(
        res,
        conversations,
        'Lấy danh sách cuộc hội thoại thành công'
      );
    }
  );

  // POST /api/conversations
  // Tạo hoặc lấy cuộc hội thoại theo đơn ứng tuyển
  static createConversation = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const applicationId = Number(req.body.idApplication);

      if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
        throw new AppError('ID đơn ứng tuyển không hợp lệ', 400);
      }

      const conversation =
        await MessageService.getOrCreateConversation(
          applicationId,
          req.user!
        );

      ResponseUtil.success(
        res,
        conversation,
        'Lấy cuộc hội thoại thành công'
      );
    }
  );

  // GET /api/conversations/unread-count
  // Đếm tổng số thư chưa đọc
  static getUnreadCount = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const result = await MessageService.getUnreadCount(
        req.user!
      );

      ResponseUtil.success(
        res,
        result,
        'Lấy số thư chưa đọc thành công'
      );
    }
  );

  // GET /api/conversations/:id/messages
  // Xem lịch sử thư
  static getMessages = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const conversationId = Number(req.params.id);

      if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
        throw new AppError('ID cuộc hội thoại không hợp lệ', 400);
      }

      const messages = await MessageService.getMessages(
        conversationId,
        req.user!
      );

      ResponseUtil.success(
        res,
        messages,
        'Lấy lịch sử thư thành công'
      );
    }
  );

  // POST /api/conversations/:id/messages
  // Gửi thư mới
  static sendMessage = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const conversationId = Number(req.params.id);
      const { content } = req.body;

      if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
        throw new AppError('ID cuộc hội thoại không hợp lệ', 400);
      }

      const message = await MessageService.sendMessage(
        conversationId,
        req.user!,
        content
      );

      ResponseUtil.success(
        res,
        message,
        'Gửi thư thành công'
      );
    }
  );

  // PATCH /api/conversations/:id/read
  // Đánh dấu thư đã đọc
  static markAsRead = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const conversationId = Number(req.params.id);

      if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
        throw new AppError('ID cuộc hội thoại không hợp lệ', 400);
      }

      await MessageService.markAsRead(
        conversationId,
        req.user!
      );

      ResponseUtil.success(
        res,
        null,
        'Đánh dấu thư đã đọc thành công'
      );
    }
  );
}
