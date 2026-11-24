
import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/config/database";
import { AppError } from "@/middlewares/errorHandler";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED";

export interface AdminPayment extends RowDataPacket {
  id: number;
  company_id: number;
  plan_id: number;
  subscription_id: number | null;
  order_code: string;
  amount: number | string;
  payment_method: string;
  status: PaymentStatus;
  transfer_content: string;
  sepay_transaction_id: string | null;
  created_at: Date | null;
  paid_at: Date | null;
  expires_at: Date | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface StatisticsRow extends RowDataPacket {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  expired: number;
  revenue: number | string;
}

export class AdminPaymentService {
  // ==========================================
  // TỰ ĐỘNG ĐÁNH DẤU ĐƠN HẾT HẠN
  // ==========================================

  private async expirePendingPayments(): Promise<void> {
    await pool.query<ResultSetHeader>(
      `
      UPDATE payments
      SET status = 'EXPIRED'
      WHERE status = 'PENDING'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
      `
    );
  }

  // ==========================================
  // DANH SÁCH GIAO DỊCH
  // ==========================================

  async getAllPayments(
    page = 1,
    limit = 10,
    search = "",
    status = "ALL"
  ) {
    await this.expirePendingPayments();

    const safePage = Number.isFinite(page)
      ? Math.max(1, Math.floor(page))
      : 1;

    const safeLimit = Number.isFinite(limit)
      ? Math.min(100, Math.max(1, Math.floor(limit)))
      : 10;

    const offset = (safePage - 1) * safeLimit;

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    const keyword = search.trim();

    if (keyword) {
      conditions.push(`
        (
          p.order_code LIKE ?
          OR p.sepay_transaction_id LIKE ?
          OR CAST(p.company_id AS CHAR) LIKE ?
        )
      `);

      const value = `%${keyword}%`;

      params.push(value, value, value);
    }

    if (status !== "ALL") {
      conditions.push("p.status = ?");
      params.push(status);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [countRows] = await pool.query<CountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM payments p
      ${whereClause}
      `,
      params
    );

    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<AdminPayment[]>(
      `
      SELECT
        p.id,
        p.company_id,
        p.plan_id,
        p.subscription_id,
        p.order_code,
        p.amount,
        p.payment_method,
        p.status,
        p.transfer_content,
        p.sepay_transaction_id,
        p.created_at,
        p.paid_at,
        p.expires_at
      FROM payments p
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, safeLimit, offset]
    );

    return {
      payments: rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
      })),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ==========================================
  // CHI TIẾT GIAO DỊCH
  // ==========================================

  async getPaymentById(id: number) {
    await this.expirePendingPayments();

    const [rows] = await pool.query<AdminPayment[]>(
      `
      SELECT
        id,
        company_id,
        plan_id,
        subscription_id,
        order_code,
        amount,
        payment_method,
        status,
        transfer_content,
        sepay_transaction_id,
        created_at,
        paid_at,
        expires_at
      FROM payments
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      throw new AppError(
        "Không tìm thấy giao dịch thanh toán",
        404
      );
    }

    return {
      ...rows[0],
      amount: Number(rows[0].amount),
    };
  }

  // ==========================================
  // THỐNG KÊ GIAO DỊCH
  // ==========================================

  async getStatistics() {
    await this.expirePendingPayments();

    const [rows] = await pool.query<StatisticsRow[]>(
      `
      SELECT
        COUNT(*) AS total,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'PAID' THEN 1
              ELSE 0
            END
          ),
          0
        ) AS paid,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'PENDING' THEN 1
              ELSE 0
            END
          ),
          0
        ) AS pending,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'FAILED' THEN 1
              ELSE 0
            END
          ),
          0
        ) AS failed,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'EXPIRED' THEN 1
              ELSE 0
            END
          ),
          0
        ) AS expired,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'PAID' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS revenue

      FROM payments
      `
    );

    const stats = rows[0];

    return {
      total: Number(stats?.total || 0),
      paid: Number(stats?.paid || 0),
      pending: Number(stats?.pending || 0),
      failed: Number(stats?.failed || 0),
      expired: Number(stats?.expired || 0),
      revenue: Number(stats?.revenue || 0),
    };
  }
}
