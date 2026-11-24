import { pool } from '@/config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

import {
  UserCV,
  CreateUserCVDTO,
  UpdateUserCVDTO
} from '@/models/UserCV';

export class UserCVRepository {

  // =====================================================
  // MAP DATABASE ROW -> USER CV
  // =====================================================

  private mapRow(row: any): UserCV {
    let cvData = row.cv_data;
    let settings = row.settings;

    // Parse cv_data nếu MySQL trả về dạng string
    if (typeof cvData === 'string') {
      try {
        cvData = JSON.parse(cvData);
      } catch (error) {
        console.error('Lỗi parse cv_data:', error);
      }
    }

    // Parse settings nếu MySQL trả về dạng string
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch (error) {
        console.error('Lỗi parse settings:', error);
        settings = null;
      }
    }

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      templateKey: row.template_key,
      cvData,
      settings: settings ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // =====================================================
  // CREATE CV
  // =====================================================

  async create(
    data: CreateUserCVDTO
  ): Promise<UserCV> {

    const [result] =
      await pool.execute<ResultSetHeader>(
        `
        INSERT INTO user_cvs
          (
            user_id,
            title,
            template_key,
            cv_data,
            settings
          )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          data.userId,
          data.title,
          data.templateKey,
          JSON.stringify(data.cvData),
          data.settings
            ? JSON.stringify(data.settings)
            : null
        ]
      );

    const cv = await this.findById(
      result.insertId,
      data.userId
    );

    if (!cv) {
      throw new Error('Không thể tạo CV');
    }

    return cv;
  }

  // =====================================================
  // GET ALL CVS OF USER
  // =====================================================

  async findByUserId(
    userId: number
  ): Promise<UserCV[]> {

    const [rows] =
      await pool.execute<RowDataPacket[]>(
        `
        SELECT *
        FROM user_cvs
        WHERE user_id = ?
        `,
        [userId]
      );

    return rows.map((row) =>
      this.mapRow(row)
    );
  }

  // =====================================================
  // GET CV BY ID
  // =====================================================

  async findById(
    id: number,
    userId: number
  ): Promise<UserCV | null> {

    const [rows] =
      await pool.execute<RowDataPacket[]>(
        `
        SELECT *
        FROM user_cvs
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
        `,
        [id, userId]
      );

    if (rows.length === 0) {
      return null;
    }

    return this.mapRow(rows[0]);
  }

  // =====================================================
  // UPDATE CV
  // =====================================================

  async update(
    id: number,
    userId: number,
    data: UpdateUserCVDTO
  ): Promise<UserCV | null> {

    const fields: string[] = [];
    const values: any[] = [];

    // Title
    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }

    // Template
    if (data.templateKey !== undefined) {
      fields.push('template_key = ?');
      values.push(data.templateKey);
    }

    // CV content
    if (data.cvData !== undefined) {
      fields.push('cv_data = ?');
      values.push(
        JSON.stringify(data.cvData)
      );
    }

    // CV design settings
    if (data.settings !== undefined) {
      fields.push('settings = ?');

      values.push(
        data.settings
          ? JSON.stringify(data.settings)
          : null
      );
    }

    // Không có dữ liệu thay đổi
    if (fields.length === 0) {
      return this.findById(
        id,
        userId
      );
    }

    values.push(id, userId);

    const [result] =
      await pool.execute<ResultSetHeader>(
        `
        UPDATE user_cvs
        SET ${fields.join(', ')}
        WHERE id = ?
          AND user_id = ?
        `,
        values
      );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(
      id,
      userId
    );
  }

  // =====================================================
  // DELETE CV
  // =====================================================

  async delete(
    id: number,
    userId: number
  ): Promise<boolean> {

    const [result] =
      await pool.execute<ResultSetHeader>(
        `
        DELETE FROM user_cvs
        WHERE id = ?
          AND user_id = ?
        `,
        [id, userId]
      );

    return result.affectedRows > 0;
  }
}

export const userCVRepository =
  new UserCVRepository();