
import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2';

import pool from '@/config/database';
import { AppError } from '@/middlewares/errorHandler';

// ==========================================
// TYPES
// ==========================================

interface CountRow extends RowDataPacket {
  total: number;
}

interface JobRow extends RowDataPacket {
  id: number;
  idCompany: number | null;
  idField: number | null;
  idProvince: number | null;
  nameJob: string | null;
  request: string | null;
  desc: string | null;
  other: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  sex: string | null;
  typeWork: string | null;
  education: string | null;
  experience: string | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  companyName?: string | null;
}

type JobStatus = 'ACTIVE' | 'HIDDEN';

// ==========================================
// ADMIN JOB SERVICE
// ==========================================

export class AdminJobService {
  // ==========================================
  // 1. DANH SÁCH TIN TUYỂN DỤNG
  // ==========================================

  async getAllJobs(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status: string = 'ALL'
  ) {
    const safePage =
      Number.isFinite(page) && page > 0
        ? Math.floor(page)
        : 1;

    const safeLimit =
      Number.isFinite(limit) && limit > 0
        ? Math.min(100, Math.floor(limit))
        : 10;

    const offset = (safePage - 1) * safeLimit;

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (search.trim()) {
      conditions.push(
        '(j.nameJob LIKE ? OR CAST(j.id AS CHAR) LIKE ?)'
      );

      const keyword = `%${search.trim()}%`;

      params.push(keyword, keyword);
    }

    if (status === 'ACTIVE') {
      conditions.push('j.deletedAt IS NULL');
    } else if (status === 'HIDDEN') {
      conditions.push('j.deletedAt IS NOT NULL');
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const [countRows] =
      await pool.query<CountRow[]>(
        `
        SELECT COUNT(*) AS total
        FROM jobs j
        ${whereClause}
        `,
        params
      );

    const total = Number(
      countRows[0]?.total ?? 0
    );

    const [jobs] =
      await pool.query<JobRow[]>(
        `
        SELECT
          j.id,
          j.idCompany,
          j.idField,
          j.idProvince,
          j.nameJob,
          j.request,
          j.\`desc\`,
          j.other,
          j.salaryMin,
          j.salaryMax,
          j.sex,
          j.typeWork,
          j.education,
          j.experience,
          j.createdAt,
          j.deletedAt
        FROM jobs j
        ${whereClause}
        ORDER BY j.id DESC
        LIMIT ? OFFSET ?
        `,
        [...params, safeLimit, offset]
      );

    return {
      jobs: jobs.map((job) => ({
        ...job,
        status: job.deletedAt
          ? 'HIDDEN'
          : 'ACTIVE',
      })),

      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(
          total / safeLimit
        ),
      },
    };
  }

  // ==========================================
  // 2. CHI TIẾT TIN TUYỂN DỤNG
  // ==========================================

  async getJobById(id: number) {
    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      throw new AppError(
        'ID tin tuyển dụng không hợp lệ',
        400
      );
    }

    const [rows] =
      await pool.query<JobRow[]>(
        `
        SELECT
          id,
          idCompany,
          idField,
          idProvince,
          nameJob,
          request,
          \`desc\`,
          other,
          salaryMin,
          salaryMax,
          sex,
          typeWork,
          education,
          experience,
          createdAt,
          deletedAt
        FROM jobs
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

    if (rows.length === 0) {
      throw new AppError(
        'Không tìm thấy tin tuyển dụng',
        404
      );
    }

    const job = rows[0];

    return {
      ...job,
      status: job.deletedAt
        ? 'HIDDEN'
        : 'ACTIVE',
    };
  }

  // ==========================================
  // 3. ẨN / KHÔI PHỤC TIN TUYỂN DỤNG
  //    + GHI LỊCH SỬ ADMIN
  // ==========================================

  async updateJobStatus(
    id: number,
    status: JobStatus,
    adminId: number
  ) {
    // ========================================
    // VALIDATE INPUT
    // ========================================

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

    if (
      !Number.isSafeInteger(adminId) ||
      adminId <= 0
    ) {
      throw new AppError(
        'Thông tin Admin không hợp lệ',
        401
      );
    }

    // ========================================
    // START TRANSACTION
    // ========================================

    const connection =
      await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Khóa bản ghi để tránh cập nhật
      // đồng thời gây sai lệch nhật ký.
      const [rows] =
        await connection.query<JobRow[]>(
          `
          SELECT
            id,
            nameJob,
            deletedAt
          FROM jobs
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
          `,
          [id]
        );

      if (rows.length === 0) {
        throw new AppError(
          'Không tìm thấy tin tuyển dụng',
          404
        );
      }

      const currentJob = rows[0];

      const currentStatus: JobStatus =
        currentJob.deletedAt
          ? 'HIDDEN'
          : 'ACTIVE';

      // ========================================
      // KHÔNG GHI LOG NẾU TRẠNG THÁI KHÔNG ĐỔI
      // ========================================

      if (currentStatus === status) {
        await connection.commit();

        return await this.getJobById(id);
      }

      // ========================================
      // UPDATE JOB STATUS
      // ========================================

      const updateSql =
        status === 'HIDDEN'
          ? `
            UPDATE jobs
            SET deletedAt = NOW()
            WHERE id = ?
          `
          : `
            UPDATE jobs
            SET deletedAt = NULL
            WHERE id = ?
          `;

      const [result] =
        await connection.query<ResultSetHeader>(
          updateSql,
          [id]
        );

      if (result.affectedRows === 0) {
        throw new AppError(
          'Không thể cập nhật trạng thái tin tuyển dụng',
          400
        );
      }

      // ========================================
      // GHI LỊCH SỬ ADMIN
      // ========================================

      const action =
        status === 'HIDDEN'
          ? 'HIDE_JOB'
          : 'RESTORE_JOB';

      const jobName =
        currentJob.nameJob || `#${id}`;

      const description =
        status === 'HIDDEN'
          ? `Admin đã ẩn tin tuyển dụng "${jobName}" (ID: ${id})`
          : `Admin đã khôi phục tin tuyển dụng "${jobName}" (ID: ${id})`;

      await connection.query<ResultSetHeader>(
        `
        INSERT INTO admin_activity_logs (
          admin_id,
          action,
          target_type,
          target_id,
          description
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          adminId,
          action,
          'JOB',
          id,
          description,
        ]
      );

      // ========================================
      // COMMIT TRANSACTION
      // ========================================

      await connection.commit();

      // Lấy dữ liệu sau khi cập nhật.
      return await this.getJobById(id);
    } catch (error) {
      // Rollback nếu transaction chưa commit.
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'Lỗi rollback cập nhật tin tuyển dụng:',
          rollbackError
        );
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  // ==========================================
  // 4. THỐNG KÊ TIN TUYỂN DỤNG
  // ==========================================

  async getStatistics() {
    const [rows] = await pool.query<
      (RowDataPacket & {
        total: number;
        active: number;
        hidden: number;
      })[]
    >(
      `
      SELECT
        COUNT(*) AS total,

        COALESCE(
          SUM(
            CASE
              WHEN deletedAt IS NULL THEN 1
              ELSE 0
            END
          ),
          0
        ) AS active,

        COALESCE(
          SUM(
            CASE
              WHEN deletedAt IS NOT NULL THEN 1
              ELSE 0
            END
          ),
          0
        ) AS hidden

      FROM jobs
      `
    );

    return {
      total: Number(
        rows[0]?.total ?? 0
      ),

      active: Number(
        rows[0]?.active ?? 0
      ),

      hidden: Number(
        rows[0]?.hidden ?? 0
      ),
    };
  }
}
