
import { JWTPayload } from '@/types';
import { MessageRepository } from '@/repositories/messageRepository';
import { NotificationService } from '@/services/notificationService';
import { AppError } from '@/middlewares/errorHandler';

export class MessageService {
  // Tạo hoặc lấy cuộc hội thoại theo đơn ứng tuyển
  static async getOrCreateConversation(
    applicationId: number,
    account: JWTPayload
  ) {
    const application =
      await MessageRepository.findApplication(applicationId);

    if (!application) {
      throw new AppError('Không tìm thấy đơn ứng tuyển', 404);
    }

    const allowed =
      account.userType === 'user'
        ? application.idUser === account.id
        : application.idCompany === account.id;

    if (!allowed) {
      throw new AppError('Không có quyền truy cập', 403);
    }

    const conversationId =
      await MessageRepository.getOrCreateConversation(applicationId);

    return MessageRepository.findAccessibleConversation(
      conversationId,
      account
    );
  }

  // Lấy danh sách cuộc hội thoại
  static async getConversations(account: JWTPayload) {
    return MessageRepository.findConversations(account);
  }

  // Lấy lịch sử thư
  static async getMessages(
    conversationId: number,
    account: JWTPayload
  ) {
    await this.requireConversation(conversationId, account);

    return MessageRepository.findMessages(conversationId);
  }

  // Gửi thư
  static async sendMessage(
    conversationId: number,
    account: JWTPayload,
    content: string
  ) {
    if (typeof content !== 'string' || !content.trim()) {
      throw new AppError('Nội dung thư không được để trống', 400);
    }

    if (content.trim().length > 5000) {
      throw new AppError('Nội dung thư tối đa 5000 ký tự', 400);
    }

    const conversation =
      await this.requireConversation(conversationId, account);

    const message = await MessageRepository.createMessage(
      conversationId,
      account,
      content.trim()
    );

    // Thông báo cho người nhận
    try {
      if (account.userType === 'company') {
        await NotificationService.createNotification({
          idUser: conversation.idUser,
          title: 'Thư mới từ nhà tuyển dụng',
          content: `${conversation.companyName} đã gửi thư về vị trí "${conversation.jobName}"`,
          type: 'new_message'
        });
      } else {
        await NotificationService.createNotification({
          idCompany: conversation.idCompany,
          title: 'Ứng viên trả lời tin nhắn',
          content: `${conversation.applicantName} đã trả lời tin nhắn về vị trí "${conversation.jobName}"`,
          type: 'new_message'
        });
      }
    } catch (error) {
      // Tin nhắn đã được lưu thành công.
      // Không báo lỗi gửi tin nhắn để tránh người dùng gửi lại.
      console.error('Không thể tạo thông báo tin nhắn mới:', error);
    }

    return message;
  }

  // Đánh dấu tin nhắn đã đọc
  static async markAsRead(
    conversationId: number,
    account: JWTPayload
  ) {
    await this.requireConversation(conversationId, account);

    await MessageRepository.markAsRead(conversationId, account);

    return { success: true };
  }

  // Đếm thư chưa đọc
  static async getUnreadCount(account: JWTPayload) {
    const unreadCount = await MessageRepository.countUnread(account);

    return { unreadCount };
  }

  // Kiểm tra quyền trước khi thao tác với hội thoại
  private static async requireConversation(
    conversationId: number,
    account: JWTPayload
  ) {
    const conversation =
      await MessageRepository.findAccessibleConversation(
        conversationId,
        account
      );

    if (!conversation) {
      throw new AppError(
        'Không tìm thấy cuộc hội thoại hoặc không có quyền truy cập',
        404
      );
    }

    return conversation;
  }
}
