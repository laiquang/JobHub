
import {
  RowDataPacket,
  ResultSetHeader,
} from "mysql2";
import pool from "@/config/database";
import { AppError } from "@/middlewares/errorHandler";

interface PlanRow extends RowDataPacket {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: string | number;
  duration_days: number | null;
  max_active_jobs: number;
  ai_cv_scoring: number;
  priority_jobs: number;
  is_active: number;
  created_at: Date | null;
  active_companies: number;
  total_subscriptions: number;
}

interface SubscriptionRow extends RowDataPacket {
  id: number;
  company_id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  start_date: Date;
  end_date: Date | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  created_at: Date | null;
  updated_at: Date | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string | null;
  price?: number;
  duration_days?: number | null;
  max_active_jobs?: number;
  ai_cv_scoring?: boolean;
  priority_jobs?: boolean;
  is_active?: boolean;
}

export class AdminSubscriptionService {
  private async findPlan(id: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT *
       FROM subscription_plans
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      throw new AppError(
        "Không tìm thấy gói dịch vụ",
        404
      );
    }

    return rows[0];
  }

  // ============================================
  // DANH SÁCH GÓI DỊCH VỤ
  // ============================================

  async getAllPlans() {
    const [rows] = await pool.query<PlanRow[]>(
      `
      SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.price,
        p.duration_days,
        p.max_active_jobs,
        p.ai_cv_scoring,
        p.priority_jobs,
        p.is_active,
        p.created_at,

        (
          SELECT COUNT(DISTINCT cs.company_id)
          FROM company_subscriptions cs
          WHERE cs.plan_id = p.id
            AND cs.status = 'ACTIVE'
            AND (
              cs.end_date IS NULL
              OR cs.end_date > NOW()
            )
        ) AS active_companies,

        (
          SELECT COUNT(*)
          FROM company_subscriptions cs
          WHERE cs.plan_id = p.id
        ) AS total_subscriptions

      FROM subscription_plans p
      ORDER BY p.price ASC, p.id ASC
      `
    );

    return rows.map((plan) => ({
      ...plan,
      price: Number(plan.price),
      ai_cv_scoring: Boolean(plan.ai_cv_scoring),
      priority_jobs: Boolean(plan.priority_jobs),
      is_active: Boolean(plan.is_active),
      active_companies: Number(plan.active_companies),
      total_subscriptions: Number(
        plan.total_subscriptions
      ),
    }));
  }

  // ============================================
  // CHI TIẾT GÓI
  // ============================================

  async getPlanById(id: number) {
    await this.findPlan(id);

    const plans = await this.getAllPlans();

    return plans.find((plan) => plan.id === id);
  }

  // ============================================
  // CẬP NHẬT GÓI
  // ============================================

  async updatePlan(
    id: number,
    input: UpdatePlanInput
  ) {
    const current = await this.findPlan(id);

    const code = String(current.code).toUpperCase();

    if (!["FREE", "PREMIUM"].includes(code)) {
      throw new AppError(
        "Chỉ hỗ trợ chỉnh sửa gói FREE và PREMIUM",
        400
      );
    }

    const name =
      input.name !== undefined
        ? input.name.trim()
        : String(current.name);

    const description =
      input.description !== undefined
        ? input.description
        : current.description;

    const price =
      input.price !== undefined
        ? input.price
        : Number(current.price);

    const durationDays =
      input.duration_days !== undefined
        ? input.duration_days
        : current.duration_days;

    const maxActiveJobs =
      input.max_active_jobs !== undefined
        ? input.max_active_jobs
        : Number(current.max_active_jobs);

    const aiCvScoring =
      input.ai_cv_scoring !== undefined
        ? input.ai_cv_scoring
        : Boolean(current.ai_cv_scoring);

    const priorityJobs =
      input.priority_jobs !== undefined
        ? input.priority_jobs
        : Boolean(current.priority_jobs);

    const isActive =
      input.is_active !== undefined
        ? input.is_active
        : Boolean(current.is_active);

    if (!name || name.length > 100) {
      throw new AppError(
        "Tên gói phải từ 1 đến 100 ký tự",
        400
      );
    }

    if (
      typeof price !== "number" ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      price > 999999999999
    ) {
      throw new AppError(
        "Giá gói không hợp lệ",
        400
      );
    }

    if (
      !Number.isSafeInteger(maxActiveJobs) ||
      maxActiveJobs < -1
    ) {
      throw new AppError(
        "Số tin đăng tối đa không hợp lệ",
        400
      );
    }

    if (
      durationDays !== null &&
      (
        !Number.isSafeInteger(durationDays) ||
        durationDays <= 0
      )
    ) {
      throw new AppError(
        "Thời hạn gói không hợp lệ",
        400
      );
    }

    if (code === "FREE") {
      if (price !== 0) {
        throw new AppError(
          "Gói FREE phải có giá bằng 0",
          400
        );
      }

      if (!isActive) {
        throw new AppError(
          "Không được vô hiệu hóa gói FREE",
          400
        );
      }
    }

    if (code === "PREMIUM") {
      if (price <= 0) {
        throw new AppError(
          "Giá PREMIUM phải lớn hơn 0",
          400
        );
      }

      if (
        durationDays === null ||
        durationDays <= 0
      ) {
        throw new AppError(
          "PREMIUM phải có thời hạn hợp lệ",
          400
        );
      }
    }

    await pool.execute<ResultSetHeader>(
      `
      UPDATE subscription_plans
      SET
        name = ?,
        description = ?,
        price = ?,
        duration_days = ?,
        max_active_jobs = ?,
        ai_cv_scoring = ?,
        priority_jobs = ?,
        is_active = ?
      WHERE id = ?
      `,
      [
        name,
        description,
        price,
        durationDays,
        maxActiveJobs,
        aiCvScoring ? 1 : 0,
        priorityJobs ? 1 : 0,
        isActive ? 1 : 0,
        id,
      ]
    );

    return this.getPlanById(id);
  }

  // ============================================
  // DANH SÁCH ĐĂNG KÝ GÓI
  // ============================================

  async getSubscriptions(
    page = 1,
    limit = 10,
    search = "",
    status = "ALL",
    planId?: number
  ) {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(
      100,
      Math.max(1, Math.floor(limit))
    );
    const offset = (safePage - 1) * safeLimit;

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (search.trim()) {
      conditions.push(
        "(CAST(cs.company_id AS CHAR) LIKE ? OR CAST(cs.id AS CHAR) LIKE ?)"
      );

      const keyword = `%${search.trim()}%`;
      params.push(keyword, keyword);
    }

    if (status !== "ALL") {
      conditions.push("cs.status = ?");
      params.push(status);
    }

    if (planId !== undefined) {
      conditions.push("cs.plan_id = ?");
      params.push(planId);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [countRows] = await pool.query<CountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM company_subscriptions cs
      ${whereClause}
      `,
      params
    );

    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<SubscriptionRow[]>(
      `
      SELECT
        cs.id,
        cs.company_id,
        cs.plan_id,
        p.code AS plan_code,
        p.name AS plan_name,
        cs.start_date,
        cs.end_date,
        cs.status,
        cs.created_at,
        cs.updated_at
      FROM company_subscriptions cs
      JOIN subscription_plans p
        ON p.id = cs.plan_id
      ${whereClause}
      ORDER BY cs.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, safeLimit, offset]
    );

    return {
      subscriptions: rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ============================================
  // THỐNG KÊ
  // ============================================

  async getStatistics() {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'ACTIVE'
                AND (
                  end_date IS NULL
                  OR end_date > NOW()
                )
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS active,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'EXPIRED'
                OR (
                  status = 'ACTIVE'
                  AND end_date IS NOT NULL
                  AND end_date <= NOW()
                )
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS expired,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'CANCELLED'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS cancelled
      FROM company_subscriptions
      `
    );

    return {
      total: Number(rows[0]?.total || 0),
      active: Number(rows[0]?.active || 0),
      expired: Number(rows[0]?.expired || 0),
      cancelled: Number(rows[0]?.cancelled || 0),
    };
  }
}
