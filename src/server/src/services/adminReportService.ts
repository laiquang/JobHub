
import { RowDataPacket } from "mysql2";
import pool from "@/config/database";

export interface ReportFilters {
  from: string;
  to: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface OverviewRow extends RowDataPacket {
  total: number;
  active: number;
  locked?: number;
  hidden?: number;
}

interface PaymentRow extends RowDataPacket {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  expired: number;
  revenue: string | number;
}

interface TrendRow extends RowDataPacket {
  month: string;
  total: number;
}

interface RevenueRow extends RowDataPacket {
  month: string;
  revenue: string | number;
  transactions: number;
}

export class AdminReportService {
  private getRange(filters: ReportFilters) {
    return {
      from: `${filters.from} 00:00:00`,
      toExclusive: `${filters.to} 00:00:00`,
    };
  }

  private nextDay(date: string) {
    const [year, month, day] = date
      .split("-")
      .map(Number);

    const value = new Date(
      Date.UTC(year, month - 1, day + 1)
    );

    return value.toISOString().slice(0, 10);
  }

  private async count(
    sql: string,
    params: Array<string | number>
  ): Promise<number> {
    const [rows] = await pool.query<CountRow[]>(
      sql,
      params
    );

    return Number(rows[0]?.total || 0);
  }

  async getOverview(filters: ReportFilters) {
    const from = `${filters.from} 00:00:00`;
    const to = `${this.nextDay(filters.to)} 00:00:00`;

    const [
      users,
      companies,
      jobs,
      applications,
      payments,
      totalUsers,
      totalCompanies,
      totalJobs,
      totalApplications,
    ] = await Promise.all([
      pool.query<OverviewRow[]>(
        `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(status = 'ACTIVE'), 0) AS active,
          COALESCE(SUM(status = 'LOCKED'), 0) AS locked
        FROM users
        WHERE created_at >= ?
          AND created_at < ?
        `,
        [from, to]
      ),

      pool.query<OverviewRow[]>(
        `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(status = 'ACTIVE'), 0) AS active,
          COALESCE(SUM(status = 'LOCKED'), 0) AS locked
        FROM companies
        WHERE created_at >= ?
          AND created_at < ?
        `,
        [from, to]
      ),

      pool.query<OverviewRow[]>(
        `
        SELECT
          COUNT(*) AS total,
          COALESCE(
            SUM(deletedAt IS NULL), 0
          ) AS active,
          COALESCE(
            SUM(deletedAt IS NOT NULL), 0
          ) AS hidden
        FROM jobs
        WHERE createdAt >= ?
          AND createdAt < ?
        `,
        [from, to]
      ),

      pool.query<CountRow[]>(
        `
        SELECT COUNT(*) AS total
        FROM apply_job
        WHERE createdAt >= ?
          AND createdAt < ?
        `,
        [from, to]
      ),

      pool.query<PaymentRow[]>(
        `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(status = 'PAID'), 0) AS paid,
          COALESCE(SUM(status = 'PENDING'), 0) AS pending,
          COALESCE(SUM(status = 'FAILED'), 0) AS failed,
          COALESCE(SUM(status = 'EXPIRED'), 0) AS expired,
          COALESCE(
            SUM(
              CASE
                WHEN status = 'PAID'
                THEN amount
                ELSE 0
              END
            ), 0
          ) AS revenue
        FROM payments
        WHERE created_at >= ?
          AND created_at < ?
        `,
        [from, to]
      ),

      this.count(
        "SELECT COUNT(*) AS total FROM users",
        []
      ),

      this.count(
        "SELECT COUNT(*) AS total FROM companies",
        []
      ),

      this.count(
        "SELECT COUNT(*) AS total FROM jobs",
        []
      ),

      this.count(
        "SELECT COUNT(*) AS total FROM apply_job",
        []
      ),
    ]);

    const u = users[0][0];
    const c = companies[0][0];
    const j = jobs[0][0];
    const a = applications[0][0];
    const p = payments[0][0];

    return {
      period: filters,

      users: {
        total: Number(u?.total || 0),
        active: Number(u?.active || 0),
        locked: Number(u?.locked || 0),
        allTime: totalUsers,
      },

      companies: {
        total: Number(c?.total || 0),
        active: Number(c?.active || 0),
        locked: Number(c?.locked || 0),
        allTime: totalCompanies,
      },

      jobs: {
        total: Number(j?.total || 0),
        active: Number(j?.active || 0),
        hidden: Number(j?.hidden || 0),
        allTime: totalJobs,
      },

      applications: {
        total: Number(a?.total || 0),
        allTime: totalApplications,
      },

      payments: {
        total: Number(p?.total || 0),
        paid: Number(p?.paid || 0),
        pending: Number(p?.pending || 0),
        failed: Number(p?.failed || 0),
        expired: Number(p?.expired || 0),
        revenue: Number(p?.revenue || 0),
      },
    };
  }

  async getMonthlyTrends(filters: ReportFilters) {
    const from = `${filters.from} 00:00:00`;
    const to = `${this.nextDay(filters.to)} 00:00:00`;

    const [
      users,
      companies,
      jobs,
      applications,
      revenue,
    ] = await Promise.all([
      pool.query<TrendRow[]>(
        `
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          COUNT(*) AS total
        FROM users
        WHERE created_at >= ?
          AND created_at < ?
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
        `,
        [from, to]
      ),

      pool.query<TrendRow[]>(
        `
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          COUNT(*) AS total
        FROM companies
        WHERE created_at >= ?
          AND created_at < ?
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
        `,
        [from, to]
      ),

      pool.query<TrendRow[]>(
        `
        SELECT
          DATE_FORMAT(createdAt, '%Y-%m') AS month,
          COUNT(*) AS total
        FROM jobs
        WHERE createdAt >= ?
          AND createdAt < ?
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month
        `,
        [from, to]
      ),

      pool.query<TrendRow[]>(
        `
        SELECT
          DATE_FORMAT(createdAt, '%Y-%m') AS month,
          COUNT(*) AS total
        FROM apply_job
        WHERE createdAt >= ?
          AND createdAt < ?
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        ORDER BY month
        `,
        [from, to]
      ),

      pool.query<RevenueRow[]>(
        `
        SELECT
          DATE_FORMAT(paid_at, '%Y-%m') AS month,
          COALESCE(SUM(amount), 0) AS revenue,
          COUNT(*) AS transactions
        FROM payments
        WHERE status = 'PAID'
          AND paid_at >= ?
          AND paid_at < ?
        GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
        ORDER BY month
        `,
        [from, to]
      ),
    ]);

    const userMap = new Map(
      users[0].map((row) => [
        row.month,
        Number(row.total),
      ])
    );

    const companyMap = new Map(
      companies[0].map((row) => [
        row.month,
        Number(row.total),
      ])
    );

    const jobMap = new Map(
      jobs[0].map((row) => [
        row.month,
        Number(row.total),
      ])
    );

    const applicationMap = new Map(
      applications[0].map((row) => [
        row.month,
        Number(row.total),
      ])
    );

    const revenueMap = new Map(
      revenue[0].map((row) => [
        row.month,
        {
          revenue: Number(row.revenue),
          transactions: Number(row.transactions),
        },
      ])
    );

    const months: string[] = [];

    const [fromYear, fromMonth] = filters.from
      .split("-")
      .map(Number);

    const [toYear, toMonth] = filters.to
      .split("-")
      .map(Number);

    let year = fromYear;
    let month = fromMonth;

    while (
      year < toYear ||
      (year === toYear && month <= toMonth)
    ) {
      months.push(
        `${year}-${String(month).padStart(2, "0")}`
      );

      month++;

      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return months.map((key) => ({
      month: key,
      users: userMap.get(key) || 0,
      companies: companyMap.get(key) || 0,
      jobs: jobMap.get(key) || 0,
      applications: applicationMap.get(key) || 0,
      revenue: revenueMap.get(key)?.revenue || 0,
      paidTransactions:
        revenueMap.get(key)?.transactions || 0,
    }));
  }

  async getReport(filters: ReportFilters) {
    const [overview, monthly] = await Promise.all([
      this.getOverview(filters),
      this.getMonthlyTrends(filters),
    ]);

    return {
      overview,
      monthly,
    };
  }
}
