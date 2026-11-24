
import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  AdminReportService,
  ReportFilters,
} from "@/services/adminReportService";

const service = new AdminReportService();

function getFilters(req: Request): ReportFilters {
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);

  const defaultFromDate = new Date(today);
  defaultFromDate.setUTCMonth(
    defaultFromDate.getUTCMonth() - 11
  );
  defaultFromDate.setUTCDate(1);

  const defaultFrom = defaultFromDate
    .toISOString()
    .slice(0, 10);

  const from = String(
    req.query.from || defaultFrom
  );

  const to = String(
    req.query.to || defaultTo
  );

  const pattern = /^\d{4}-\d{2}-\d{2}$/;

  const isValidDate = (value: string) => {
    if (!pattern.test(value)) return false;

    const date = new Date(`${value}T00:00:00Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  if (
    !isValidDate(from) ||
    !isValidDate(to) ||
    from > to
  ) {
    throw new Error(
      "Khoảng thời gian báo cáo không hợp lệ"
    );
  }

  const [fromYear, fromMonth] = from
    .split("-")
    .map(Number);

  const [toYear, toMonth] = to
    .split("-")
    .map(Number);

  const monthCount =
    (toYear - fromYear) * 12 +
    (toMonth - fromMonth) +
    1;

  if (monthCount > 60) {
    throw new Error(
      "Chỉ hỗ trợ khoảng thời gian tối đa 60 tháng"
    );
  }

  return { from, to };
}

function escapeCSV(value: unknown): string {
  const text = String(value ?? "");

  // Tránh công thức CSV bị thực thi trong Excel.
  const safe = /^[\s]*[=+\-@\t\r]/.test(text)
    ? `'${text}`
    : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

function csvRow(values: unknown[]): string {
  return values.map(escapeCSV).join(",");
}

export class AdminReportController {
  getReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const filters = getFilters(req);

      const data = await service.getReport(filters);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  exportCSV = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const filters = getFilters(req);

      const report = await service.getReport(
        filters
      );

      const { overview, monthly } = report;

      const rows: unknown[][] = [
        ["BAO CAO HE THONG JOBYFY"],
        ["Tu ngay", filters.from],
        ["Den ngay", filters.to],
        [],
        ["CHI TIEU", "TRONG KY", "TOAN HE THONG"],
        [
          "Ung vien moi",
          overview.users.total,
          overview.users.allTime,
        ],
        [
          "Nha tuyen dung moi",
          overview.companies.total,
          overview.companies.allTime,
        ],
        [
          "Tin tuyen dung moi",
          overview.jobs.total,
          overview.jobs.allTime,
        ],
        [
          "Luot ung tuyen moi",
          overview.applications.total,
          overview.applications.allTime,
        ],
        [
          "Giao dich thanh toan thanh cong",
          overview.payments.paid,
          "",
        ],
        [
          "Doanh thu giao dich tao trong ky (VND)",
          overview.payments.revenue,
          "",
        ],
        [],
        [
          "THANG",
          "UNG VIEN",
          "NHA TUYEN DUNG",
          "TIN TUYEN DUNG",
          "LUOT UNG TUYEN",
          "DOANH THU (VND)",
          "GIAO DICH THANH CONG",
        ],
      ];

      for (const item of monthly) {
        rows.push([
          item.month,
          item.users,
          item.companies,
          item.jobs,
          item.applications,
          item.revenue,
          item.paidTransactions,
        ]);
      }

      const csv =
        "\uFEFF" +
        rows.map(csvRow).join("\r\n");

      const filename =
        `jobyfy-report-${filters.from}-to-${filters.to}.csv`;

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      return res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  };
}
