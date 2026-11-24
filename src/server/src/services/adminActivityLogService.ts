
import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2';

import pool from '@/config/database';

// ==========================================
// TYPES
// ==========================================

export type AdminAction =
  | 'LOCK_USER'
  | 'UNLOCK_USER'
  | 'LOCK_COMPANY'
  | 'UNLOCK_COMPANY'
  | 'HIDE_JOB'
  | 'RESTORE_JOB';

export type AdminTargetType =
  | 'USER'
  | 'COMPANY'
  | 'JOB'
  | 'PAYMENT'
  | 'SUBSCRIPTION';

interface ActivityLogRow extends RowDataPacket {
  id: number;
  admin_id: number;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  target_type: string;
  target_id: number;
  description: string | null;
  created_at: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface StatsRow extends RowDataPacket {
  total: number;
  today: number;
  thisMonth: number;
  userActions: number;
  companyActions: number;
  jobActions: number;
}

interface CreateLogInput {
  adminId: number;
  action: AdminAction;
  targetType: AdminTargetType;
  targetId: number;
  description?: string;
}

// ==========================================
// ADMIN ACTIVITY LOG SERVICE
// ==========================================

export class AdminActivityLogService {
  // ========================================
  // 1. GHI LỊCH SỬ HOẠT ĐỘNG ADMIN
  // ========================================

  static async createLog(
    input: CreateLogInput
  ): Promise<void> {
    await pool.query<ResultSetHeader>(
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
        input.adminId,
        input.action,
        input.targetType,
        input.targetId,
        input.description ?? null,
      ]
    );
  }

  // ========================================
  // 2. DANH SÁCH LỊCH SỬ HOẠT ĐỘNG
  // ========================================

  static async getAllLogs(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    action: string = 'ALL',
    targetType: string = 'ALL'
  ) {
    // ====================================
    // PAGINATION
    // ====================================

    const safePage =
      Number.isFinite(page) && page > 0
        ? Math.floor(page)
        : 1;

    const safeLimit =
      Number.isFinite(limit) && limit > 0
        ? Math.min(
            100,
            Math.max(1, Math.floor(limit))
          )
        : 10;

    const offset =
      (safePage - 1) * safeLimit;

    // ====================================
    // BUILD FILTER CONDITIONS
    // ====================================

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    const keyword = search.trim();

    // ====================================
    // SEARCH
    // ====================================

    if (keyword) {
      conditions.push(`
        (
          a.full_name LIKE ?
          OR a.email LIKE ?
          OR l.description LIKE ?
          OR l.action LIKE ?
          OR CAST(l.target_id AS CHAR) LIKE ?
        )
      `);

      const value = `%${keyword}%`;

      params.push(
        value,
        value,
        value,
        value,
        value
      );
    }

    // ====================================
    // FILTER ACTION
    // ====================================

    if (action !== 'ALL') {
      conditions.push(
        'l.action = ?'
      );

      params.push(action);
    }

    // ====================================
    // FILTER TARGET TYPE
    // ====================================

    if (targetType !== 'ALL') {
      conditions.push(
        'l.target_type = ?'
      );

      params.push(targetType);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    // ====================================
    // COUNT TOTAL RECORDS
    // ====================================

    const [countRows] =
      await pool.query<CountRow[]>(
        `
        SELECT
          COUNT(*) AS total
        FROM admin_activity_logs l
        LEFT JOIN admins a
          ON a.id = l.admin_id
        ${whereClause}
        `,
        params
      );

    const total = Number(
      countRows[0]?.total ?? 0
    );

    // ====================================
    // GET ACTIVITY LOGS
    // ====================================

    const [logs] =
      await pool.query<ActivityLogRow[]>(
        `
        SELECT
          l.id,
          l.admin_id,
          a.full_name AS admin_name,
          a.email AS admin_email,
          l.action,
          l.target_type,
          l.target_id,
          l.description,
          l.created_at
        FROM admin_activity_logs l
        LEFT JOIN admins a
          ON a.id = l.admin_id
        ${whereClause}
        ORDER BY
          l.created_at DESC,
          l.id DESC
        LIMIT ? OFFSET ?
        `,
        [
          ...params,
          safeLimit,
          offset,
        ]
      );

    // ====================================
    // RETURN RESULT
    // ====================================

    return {
      logs,

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

  // ========================================
  // 3. THỐNG KÊ LỊCH SỬ HOẠT ĐỘNG
  // ========================================

  static async getStatistics() {
    const [rows] =
      await pool.query<StatsRow[]>(
        `
        SELECT
          COUNT(*) AS total,

          COALESCE(
            SUM(
              CASE
                WHEN created_at >= CURDATE()
                 AND created_at < CURDATE() + INTERVAL 1 DAY
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS today,

          COALESCE(
            SUM(
              CASE
                WHEN created_at >= DATE_FORMAT(
                  CURDATE(),
                  '%Y-%m-01'
                )
                AND created_at < DATE_FORMAT(
                  CURDATE(),
                  '%Y-%m-01'
                ) + INTERVAL 1 MONTH
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS thisMonth,

          COALESCE(
            SUM(
              CASE
                WHEN target_type = 'USER'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS userActions,

          COALESCE(
            SUM(
              CASE
                WHEN target_type = 'COMPANY'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS companyActions,

          COALESCE(
            SUM(
              CASE
                WHEN target_type = 'JOB'
                THEN 1
                ELSE 0
              END
            ),
            0
          ) AS jobActions

        FROM admin_activity_logs
        `
      );

    const stats = rows[0];

    return {
      total: Number(
        stats?.total ?? 0
      ),

      today: Number(
        stats?.today ?? 0
      ),

      thisMonth: Number(
        stats?.thisMonth ?? 0
      ),

      userActions: Number(
        stats?.userActions ?? 0
      ),

      companyActions: Number(
        stats?.companyActions ?? 0
      ),

      jobActions: Number(
        stats?.jobActions ?? 0
      ),
    };
  }
}
