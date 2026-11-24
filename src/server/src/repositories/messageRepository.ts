
import { pool } from '@/config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { JWTPayload } from '@/types';

interface ApplicationRow extends RowDataPacket {
  id: number;
  idUser: number;
  idJob: number;
  idCompany: number;
  jobName: string;
  applicantName: string;
  applicantAvatar: string | null;
  companyName: string;
}

interface ConversationRow extends RowDataPacket {
  id: number;
  idApplication: number;
  idUser: number;
  idCompany: number;
  idJob: number;
  jobName: string;
  applicantName: string;
  applicantAvatar: string | null;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
  companyAvatar: string | null;
}

interface MessageRow extends RowDataPacket {
  id: number;
  idConversation: number;
  senderType: 'user' | 'company';
  senderId: number;
  content: string;
  isRead: number;
  createdAt: Date;
}

export class MessageRepository {

  // =====================================================
  // 1. KIỂM TRA ĐƠN ỨNG TUYỂN
  // =====================================================

  static async findApplication(
    applicationId: number
  ): Promise<ApplicationRow | null> {

    const [rows] = await pool.execute<ApplicationRow[]>(
      `
      SELECT
        a.id,
        a.idUser,
        a.idJob,
        j.idCompany,
        j.nameJob AS jobName,
        a.name AS applicantName,

        -- Ảnh đại diện ứng viên
        u.avatarPic AS applicantAvatar,

        c.nameCompany AS companyName

      FROM apply_job a

      INNER JOIN jobs j
        ON j.id = a.idJob

      INNER JOIN companies c
        ON c.id = j.idCompany

      LEFT JOIN users u
        ON u.id = a.idUser

      WHERE a.id = ?
        AND a.deletedAt IS NULL
        AND j.deletedAt IS NULL

      LIMIT 1
      `,
      [applicationId]
    );

    return rows[0] || null;
  }

  // =====================================================
  // 2. TẠO HOẶC LẤY CUỘC HỘI THOẠI
  // =====================================================

  static async getOrCreateConversation(
    applicationId: number
  ): Promise<number> {

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO conversations (idApplication)
      VALUES (?)

      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)
      `,
      [applicationId]
    );

    return result.insertId;
  }

  // =====================================================
  // 3. LẤY CHI TIẾT CUỘC HỘI THOẠI
  // =====================================================

  static async findConversation(
    conversationId: number
  ): Promise<ConversationRow | null> {

    const [rows] = await pool.execute<ConversationRow[]>(
      `
      SELECT
        cv.id,
        cv.idApplication,
        cv.createdAt,
        cv.updatedAt,

        a.idUser,
        a.idJob,

        j.idCompany,
        j.nameJob AS jobName,

        a.name AS applicantName,

        -- Ảnh đại diện ứng viên
        u.avatarPic AS applicantAvatar,

        c.nameCompany AS companyName,
        c.avatarPic AS companyAvatar

      FROM conversations cv

      INNER JOIN apply_job a
        ON a.id = cv.idApplication

      INNER JOIN jobs j
        ON j.id = a.idJob

      INNER JOIN companies c
        ON c.id = j.idCompany

      LEFT JOIN users u
        ON u.id = a.idUser

      WHERE cv.id = ?
        AND a.deletedAt IS NULL
        AND j.deletedAt IS NULL

      LIMIT 1
      `,
      [conversationId]
    );

    return rows[0] || null;
  }

  // =====================================================
  // 4. KIỂM TRA QUYỀN TRUY CẬP
  // =====================================================

  static async findAccessibleConversation(
    conversationId: number,
    account: JWTPayload
  ): Promise<ConversationRow | null> {

    const conversation = await this.findConversation(
      conversationId
    );

    if (!conversation) {
      return null;
    }

    const allowed =
      account.userType === 'user'
        ? conversation.idUser === account.id
        : conversation.idCompany === account.id;

    return allowed ? conversation : null;
  }

  // =====================================================
  // 5. LẤY DANH SÁCH CUỘC HỘI THOẠI
  // =====================================================

  static async findConversations(
    account: JWTPayload
  ): Promise<RowDataPacket[]> {

    const column =
      account.userType === 'user'
        ? 'a.idUser'
        : 'j.idCompany';

    const [rows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT
        cv.id,
        cv.idApplication,
        cv.createdAt,
        cv.updatedAt,

        a.idUser,
        j.idCompany,

        j.nameJob AS jobName,

        a.name AS applicantName,

        -- Ảnh đại diện từ hồ sơ ứng viên
        u.avatarPic AS applicantAvatar,

        c.nameCompany AS companyName,

        -- Tin nhắn cuối cùng
        (
          SELECT m.content
          FROM messages m

          WHERE m.idConversation = cv.id

          ORDER BY
            m.createdAt DESC,
            m.id DESC

          LIMIT 1
        ) AS lastMessage,

        -- Số tin nhắn chưa đọc
        (
          SELECT COUNT(*)
          FROM messages m

          WHERE m.idConversation = cv.id
            AND m.isRead = 0
            AND m.senderType <> ?
        ) AS unreadCount

      FROM conversations cv

      INNER JOIN apply_job a
        ON a.id = cv.idApplication

      INNER JOIN jobs j
        ON j.id = a.idJob

      INNER JOIN companies c
        ON c.id = j.idCompany

      LEFT JOIN users u
        ON u.id = a.idUser

      WHERE ${column} = ?
        AND a.deletedAt IS NULL
        AND j.deletedAt IS NULL

      ORDER BY
        cv.updatedAt DESC,
        cv.id DESC
      `,
      [account.userType, account.id]
    );

    return rows;
  }

  // =====================================================
  // 6. LẤY DANH SÁCH TIN NHẮN
  // =====================================================

  static async findMessages(
    conversationId: number
  ): Promise<MessageRow[]> {

    const [rows] = await pool.execute<MessageRow[]>(
      `
      SELECT
        id,
        idConversation,
        senderType,
        senderId,
        content,
        isRead,
        createdAt

      FROM messages

      WHERE idConversation = ?

      ORDER BY
        createdAt ASC,
        id ASC
      `,
      [conversationId]
    );

    return rows;
  }

  // =====================================================
  // 7. GỬI TIN NHẮN
  // =====================================================

  static async createMessage(
    conversationId: number,
    account: JWTPayload,
    content: string
  ): Promise<MessageRow> {

    const connection = await pool.getConnection();

    try {

      await connection.beginTransaction();

      const [result] =
        await connection.execute<ResultSetHeader>(
          `
          INSERT INTO messages (
            idConversation,
            senderType,
            senderId,
            content,
            isRead
          )

          VALUES (?, ?, ?, ?, 0)
          `,
          [
            conversationId,
            account.userType,
            account.id,
            content
          ]
        );

      // Cập nhật thời gian hội thoại
      await connection.execute(
        `
        UPDATE conversations

        SET updatedAt = CURRENT_TIMESTAMP

        WHERE id = ?
        `,
        [conversationId]
      );

      // Lấy tin nhắn vừa gửi
      const [rows] =
        await connection.execute<MessageRow[]>(
          `
          SELECT *
          FROM messages
          WHERE id = ?
          `,
          [result.insertId]
        );

      await connection.commit();

      return rows[0];

    } catch (error) {

      await connection.rollback();
      throw error;

    } finally {

      connection.release();

    }
  }

  // =====================================================
  // 8. ĐÁNH DẤU TIN NHẮN ĐÃ ĐỌC
  // =====================================================

  static async markAsRead(
    conversationId: number,
    account: JWTPayload
  ): Promise<void> {

    await pool.execute(
      `
      UPDATE messages

      SET isRead = 1

      WHERE idConversation = ?
        AND senderType <> ?
        AND isRead = 0
      `,
      [conversationId, account.userType]
    );
  }

  // =====================================================
  // 9. ĐẾM TIN NHẮN CHƯA ĐỌC
  // =====================================================

  static async countUnread(
    account: JWTPayload
  ): Promise<number> {

    const column =
      account.userType === 'user'
        ? 'a.idUser'
        : 'j.idCompany';

    const [rows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT COUNT(*) AS unreadCount

      FROM messages m

      INNER JOIN conversations cv
        ON cv.id = m.idConversation

      INNER JOIN apply_job a
        ON a.id = cv.idApplication

      INNER JOIN jobs j
        ON j.id = a.idJob

      WHERE ${column} = ?
        AND m.senderType <> ?
        AND m.isRead = 0
        AND a.deletedAt IS NULL
        AND j.deletedAt IS NULL
      `,
      [account.id, account.userType]
    );

    return Number(rows[0]?.unreadCount || 0);
  }
}
