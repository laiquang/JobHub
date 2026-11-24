
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  Users,
  Building2,
  BriefcaseBusiness,
  FileCheck2,
  Wallet,
  CreditCard,
  RefreshCw,
  Download,
  CalendarDays,
  TrendingUp,
  LockKeyhole,
  EyeOff,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";

type OverviewItem = {
  total: number;
  allTime: number;
  active?: number;
  locked?: number;
  hidden?: number;
};

interface Overview {
  period: {
    from: string;
    to: string;
  };
  users: OverviewItem;
  companies: OverviewItem;
  jobs: OverviewItem;
  applications: OverviewItem;
  payments: {
    total: number;
    paid: number;
    pending: number;
    failed: number;
    expired: number;
    revenue: number;
  };
}

interface MonthlyItem {
  month: string;
  users: number;
  companies: number;
  jobs: number;
  applications: number;
  revenue: number;
  paidTransactions: number;
}

interface ReportData {
  overview: Overview;
  monthly: MonthlyItem[];
}

interface ApiResponse {
  success: boolean;
  data?: ReportData;
  message?: string;
  error?: string;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

function dateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const today = new Date();

  const from = new Date(
    today.getFullYear(),
    today.getMonth() - 11,
    1
  );

  return {
    from: dateString(from),
    to: dateString(today),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(
    value
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");

  return `${month}/${year.slice(2)}`;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "violet",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  accent?: "violet" | "green" | "blue" | "orange";
}) {
  const colors = {
    violet: "bg-violet-100 text-violet-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div
          className={`rounded-xl p-2.5 ${colors[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function BarChart({
  data,
  dataKey,
  formatValue = compactNumber,
}: {
  data: MonthlyItem[];
  dataKey: keyof MonthlyItem;
  formatValue?: (value: number) => string;
}) {
  const width = Math.max(700, data.length * 65);
  const height = 290;

  const left = 65;
  const right = 20;
  const top = 20;
  const bottom = 48;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const values = data.map((item) =>
    Number(item[dataKey] || 0)
  );

  const maximum = Math.max(1, ...values);

  const step = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.min(34, step * 0.6);

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Biểu đồ thống kê theo tháng"
      >
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = maximum * (tick / 4);

          const y =
            top +
            chartHeight -
            chartHeight * (tick / 4);

          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />

              <text
                x={left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
              >
                {compactNumber(value)}
              </text>
            </g>
          );
        })}

        {data.map((item, index) => {
          const value = Number(
            item[dataKey] || 0
          );

          const barHeight =
            (value / maximum) * chartHeight;

          const x =
            left +
            index * step +
            (step - barWidth) / 2;

          const y =
            top + chartHeight - barHeight;

          return (
            <g key={item.month}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={5}
                fill="#7c3aed"
              >
                <title>
                  {`${item.month}: ${formatValue(value)}`}
                </title>
              </rect>

              <text
                x={x + barWidth / 2}
                y={height - 22}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {monthLabel(item.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-slate-500">
      Không có dữ liệu trong khoảng thời gian này.
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();

  const defaults = useMemo(
    () => getDefaultRange(),
    []
  );

  const [fromInput, setFromInput] = useState(
    defaults.from
  );
  const [toInput, setToInput] = useState(
    defaults.to
  );

  const [filters, setFilters] = useState(
    defaults
  );

  const [report, setReport] =
    useState<ReportData | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const [chartType, setChartType] = useState<
    "revenue" | "users" | "companies" | "jobs" | "applications"
  >("revenue");

  const loadReport = useCallback(async () => {
    const token = sessionStorage.getItem(
      "jobyfy_admin_token"
    );

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
      });

      const response = await fetch(
        `${API_BASE}/admin/reports?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result: ApiResponse =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Không tải được báo cáo"
        );
      }

      setReport(result.data || null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được báo cáo"
      );
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();

    if (
      !fromInput ||
      !toInput ||
      fromInput > toInput
    ) {
      setError(
        "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc."
      );
      return;
    }

    setFilters({
      from: fromInput,
      to: toInput,
    });
  };

  const exportCSV = async () => {
    const token = sessionStorage.getItem(
      "jobyfy_admin_token"
    );

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setExporting(true);
    setError("");

    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
      });

      const response = await fetch(
        `${API_BASE}/admin/reports/export?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Không thể xuất báo cáo CSV"
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        `jobyfy-report-${filters.from}-to-${filters.to}.csv`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Xuất báo cáo thất bại"
      );
    } finally {
      setExporting(false);
    }
  };

  const overview = report?.overview;
  const monthly = report?.monthly || [];

  const chartOptions = [
    { key: "revenue", label: "Doanh thu" },
    { key: "users", label: "Ứng viên" },
    { key: "companies", label: "Nhà tuyển dụng" },
    { key: "jobs", label: "Tin tuyển dụng" },
    { key: "applications", label: "Lượt ứng tuyển" },
  ] as const;

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Báo cáo & thống kê
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi hoạt động tuyển dụng và doanh thu
            JobHub.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void loadReport()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>

          <button
            onClick={() => void exportCSV()}
            disabled={exporting || !report}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting
              ? "Đang xuất..."
              : "Xuất báo cáo CSV"}
          </button>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-5 w-5 text-violet-600" />
          Khoảng thời gian
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Từ ngày
          </label>

          <input
            type="date"
            value={fromInput}
            onChange={(event) =>
              setFromInput(event.target.value)
            }
            className="rounded-xl border px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Đến ngày
          </label>

          <input
            type="date"
            value={toInput}
            onChange={(event) =>
              setToInput(event.target.value)
            }
            className="rounded-xl border px-3 py-2.5 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Áp dụng
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">
          Đang tải dữ liệu báo cáo...
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Ứng viên mới"
              value={formatNumber(overview.users.total)}
              subtitle={`Toàn hệ thống: ${formatNumber(
                overview.users.allTime
              )}`}
              icon={Users}
              accent="violet"
            />

            <MetricCard
              title="Nhà tuyển dụng mới"
              value={formatNumber(
                overview.companies.total
              )}
              subtitle={`Toàn hệ thống: ${formatNumber(
                overview.companies.allTime
              )}`}
              icon={Building2}
              accent="blue"
            />

            <MetricCard
              title="Tin tuyển dụng mới"
              value={formatNumber(overview.jobs.total)}
              subtitle={`Toàn hệ thống: ${formatNumber(
                overview.jobs.allTime
              )}`}
              icon={BriefcaseBusiness}
              accent="orange"
            />

            <MetricCard
              title="Lượt ứng tuyển mới"
              value={formatNumber(
                overview.applications.total
              )}
              subtitle={`Toàn hệ thống: ${formatNumber(
                overview.applications.allTime
              )}`}
              icon={FileCheck2}
              accent="green"
            />

            <MetricCard
              title="Doanh thu giao dịch tạo trong kỳ"
              value={formatMoney(
                overview.payments.revenue
              )}
              subtitle="Chỉ tính giao dịch đã thanh toán"
              icon={Wallet}
              accent="violet"
            />

            <MetricCard
              title="Giao dịch thành công"
              value={formatNumber(
                overview.payments.paid
              )}
              subtitle={`${formatNumber(
                overview.payments.total
              )} giao dịch tạo trong kỳ`}
              icon={CreditCard}
              accent="green"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  Biểu đồ theo tháng
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Doanh thu được nhóm theo ngày thanh toán
                  thành công.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {chartOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() =>
                      setChartType(option.key)
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      chartType === option.key
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              {monthly.length === 0 ? (
                <EmptyChart />
              ) : (
                <BarChart
                  data={monthly}
                  dataKey={chartType}
                  formatValue={
                    chartType === "revenue"
                      ? formatMoney
                      : formatNumber
                  }
                />
              )}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-5 text-lg font-bold">
                Tình trạng tài khoản mới
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Ứng viên đang hoạt động
                  </span>
                  <strong>
                    {formatNumber(
                      overview.users.active || 0
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-red-600" />
                    Ứng viên bị khóa
                  </span>
                  <strong>
                    {formatNumber(
                      overview.users.locked || 0
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Nhà tuyển dụng đang hoạt động
                  </span>
                  <strong>
                    {formatNumber(
                      overview.companies.active || 0
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-red-600" />
                    Nhà tuyển dụng bị khóa
                  </span>
                  <strong>
                    {formatNumber(
                      overview.companies.locked || 0
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-5 text-lg font-bold">
                Tình trạng tuyển dụng & thanh toán
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-4 w-4 text-violet-600" />
                    Tin đang hiển thị
                  </span>
                  <strong>
                    {formatNumber(
                      overview.jobs.active || 0
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-slate-500" />
                    Tin đã ẩn
                  </span>
                  <strong>
                    {formatNumber(
                      overview.jobs.hidden || 0
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-600" />
                    Giao dịch đang chờ
                  </span>
                  <strong>
                    {formatNumber(
                      overview.payments.pending
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Tỷ lệ thanh toán thành công
                  </span>
                  <strong>
                    {overview.payments.total > 0
                      ? `${(
                          (overview.payments.paid /
                            overview.payments.total) *
                          100
                        ).toFixed(1)}%`
                      : "0%"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="text-lg font-bold">
                Chi tiết thống kê từng tháng
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Tháng</th>
                    <th className="px-5 py-4">Ứng viên</th>
                    <th className="px-5 py-4">Nhà tuyển dụng</th>
                    <th className="px-5 py-4">Tin đăng</th>
                    <th className="px-5 py-4">Ứng tuyển</th>
                    <th className="px-5 py-4">Giao dịch PAID</th>
                    <th className="px-5 py-4">Doanh thu</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {[...monthly]
                    .reverse()
                    .map((item) => (
                      <tr
                        key={item.month}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {item.month}
                        </td>
                        <td className="px-5 py-4">
                          {formatNumber(item.users)}
                        </td>
                        <td className="px-5 py-4">
                          {formatNumber(item.companies)}
                        </td>
                        <td className="px-5 py-4">
                          {formatNumber(item.jobs)}
                        </td>
                        <td className="px-5 py-4">
                          {formatNumber(item.applications)}
                        </td>
                        <td className="px-5 py-4">
                          {formatNumber(
                            item.paidTransactions
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-violet-700">
                          {formatMoney(item.revenue)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
