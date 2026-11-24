
"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Users,
} from "lucide-react";

// ==========================================
// TYPES
// ==========================================

type MonthlyStats = {
  month: number;
  label: string;
  revenue: number;
  users: number;
  companies: number;
  jobs: number;
};

type ChartResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    year: number;
    months: MonthlyStats[];
  };
};

type DisplayStats = {
  month: number;
  label: string;
  revenue: number | null;
  users: number | null;
  companies: number | null;
  jobs: number | null;
};

type TooltipItem = {
  name?: string;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
};

type AdminChartsProps = {
  mode?: "top" | "users";
};

// ==========================================
// CONFIG
// ==========================================

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const COLORS = {
  users: "#3520A7",
  companies: "#2478CE",
  jobs: "#E99512",
  revenue: "#16876C",
  grid: "#E2E8F0",
  axis: "#64748B",
};

// Chỉnh chiều cao tất cả biểu đồ tại đây.
const CHART_HEIGHT = 250;

// ==========================================
// FORMATTERS
// ==========================================

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatCompact = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const axisTick = {
  fill: COLORS.axis,
  fontSize: 11,
};

const smallAxisTick = {
  fill: COLORS.axis,
  fontSize: 10,
};

// ==========================================
// TOOLTIP
// ==========================================

function CustomTooltip({
  active,
  payload,
  label,
  isRevenue = false,
}: {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: string | number;
  isRevenue?: boolean;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const items = payload.filter(
    (item) =>
      item.value !== null &&
      item.value !== undefined
  );

  if (!items.length) {
    return null;
  }

  return (
    <div className="min-w-[160px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="mb-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
        {label}
      </p>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item.dataKey ?? index}`}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    item.color || COLORS.revenue,
                }}
              />

              {item.name}
            </span>

            <span className="font-bold text-slate-900">
              {isRevenue
                ? formatVND(Number(item.value ?? 0))
                : formatNumber(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// EMPTY STATE
// ==========================================

function EmptyChart({
  icon,
  title,
  description,
  background,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  background: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl px-4 text-center ${background}`}
      style={{ height: CHART_HEIGHT }}
    >
      <div className="mb-3">{icon}</div>

      <p className="font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

// ==========================================
// ADMIN CHARTS
// ==========================================

export default function AdminCharts({
  mode = "top",
}: AdminChartsProps) {
  const [year, setYear] = useState<number | null>(
    null
  );

  const [data, setData] = useState<MonthlyStats[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // FETCH CHART DATA
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    const loadCharts = async () => {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem(
          "jobyfy_admin_token"
        );

        if (!token) {
          throw new Error(
            "Phiên đăng nhập Admin không tồn tại"
          );
        }

        const response = await fetch(
          `${apiBase}/admin/dashboard/charts`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result: ChartResponse =
          await response.json();

        if (
          !response.ok ||
          !result.success ||
          !result.data ||
          !Array.isArray(result.data.months)
        ) {
          throw new Error(
            result.message ||
              result.error ||
              "Không thể tải dữ liệu biểu đồ"
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setYear(Number(result.data.year));

        // Đọc đúng dữ liệu từ Backend JobHub.
        setData(
          result.data.months.map((item) => ({
            month: Number(item.month),
            label:
              item.label ||
              `T${Number(item.month)}`,
            revenue: Number(item.revenue ?? 0),
            users: Number(item.users ?? 0),
            companies: Number(
              item.companies ?? 0
            ),
            jobs: Number(item.jobs ?? 0),
          }))
        );
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Có lỗi khi tải biểu đồ"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadCharts();

    return () => controller.abort();
  }, []);

  // ==========================================
  // FUTURE MONTHS
  // ==========================================

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Giữ đủ 12 tháng trên trục X.
  // Tháng tương lai có giá trị null.
  const displayData: DisplayStats[] = data.map(
    (item) => {
      const future =
        year !== null &&
        (year > currentYear ||
          (year === currentYear &&
            item.month > currentMonth));

      return {
        month: item.month,
        label: item.label,
        revenue: future ? null : item.revenue,
        users: future ? null : item.users,
        companies: future
          ? null
          : item.companies,
        jobs: future ? null : item.jobs,
      };
    }
  );

  // ==========================================
  // CHECK DATA
  // ==========================================

  const hasRevenue = displayData.some(
    (item) => (item.revenue ?? 0) > 0
  );

  const hasGrowth = displayData.some(
    (item) =>
      (item.companies ?? 0) > 0 ||
      (item.jobs ?? 0) > 0
  );

  const hasUsers = displayData.some(
    (item) => (item.users ?? 0) > 0
  );

  const maxUsers = Math.max(
    0,
    ...displayData.map(
      (item) => item.users ?? 0
    )
  );

  const usersAxisMax = Math.max(
    5,
    Math.ceil(maxUsers * 1.2)
  );

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error}
      </div>
    );
  }

  // ==========================================
  // USERS CHART
  // HÀNG 2 - CỘT PHẢI
  // ==========================================

  if (mode === "users") {
    return (
      <section className="h-full min-w-0">
        <div className="h-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {/* HEADER */}

          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2.5">
                <Users
                  className="h-5 w-5"
                  style={{
                    color: COLORS.users,
                  }}
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ứng viên đăng ký theo tháng
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Thống kê tài khoản ứng viên mới
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              Ứng viên
            </span>
          </div>

          {/* CHART */}

          {hasUsers ? (
            <div
              className="w-full"
              style={{ height: CHART_HEIGHT }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={displayData}
                  margin={{
                    top: 8,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke={COLORS.grid}
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    tickMargin={8}
                    interval={0}
                  />

                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={smallAxisTick}
                    tickFormatter={formatNumber}
                    width={38}
                    domain={[0, usersAxisMax]}
                    tickCount={6}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "#CBD5E1",
                      strokeDasharray: "4 4",
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: 11,
                      paddingTop: 10,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Ứng viên"
                    stroke={COLORS.users}
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: COLORS.users,
                      stroke: "#FFFFFF",
                      strokeWidth: 1.5,
                    }}
                    activeDot={{
                      r: 6,
                      fill: COLORS.users,
                      stroke: "#FFFFFF",
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart
              icon={
                <Users className="h-9 w-9 text-violet-300" />
              }
              title="Chưa có ứng viên đăng ký"
              description={`Chưa ghi nhận ứng viên mới trong năm ${year}.`}
              background="bg-violet-50/50"
            />
          )}

          <p className="mt-3 text-xs text-slate-400">
            Số lượng ứng viên đăng ký mới trên
            JobHub theo từng tháng.
          </p>
        </div>
      </section>
    );
  }

  // ==========================================
  // TOP CHARTS
  // DOANH THU + TĂNG TRƯỞNG
  // ==========================================

  return (
    <section className="space-y-4">
      {/* YEAR */}

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <CalendarDays className="h-4 w-4 text-violet-600" />
          Năm {year ?? "—"}
        </div>
      </div>

      {/* CHART GRID */}

      <div className="grid gap-5 lg:grid-cols-2">

        {/* ==================================
            REVENUE CHART
            CỘT TRÁI
        ================================== */}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {/* HEADER */}

          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5">
                <BarChart3
                  className="h-5 w-5"
                  style={{
                    color: COLORS.revenue,
                  }}
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Doanh thu theo tháng
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Giao dịch SePay thành công
                </p>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              VND
            </span>
          </div>

          {/* CHART */}

          {hasRevenue ? (
            <div
              className="w-full"
              style={{ height: CHART_HEIGHT }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={displayData}
                  margin={{
                    top: 8,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="jobhubRevenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#27B08D"
                      />

                      <stop
                        offset="100%"
                        stopColor={COLORS.revenue}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke={COLORS.grid}
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    tickMargin={8}
                    interval={0}
                  />

                  <YAxis
                    width={58}
                    axisLine={false}
                    tickLine={false}
                    tick={smallAxisTick}
                    tickFormatter={formatCompact}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip isRevenue />
                    }
                    cursor={{
                      fill: "#ECFDF5",
                    }}
                  />

                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="url(#jobhubRevenueGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={35}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart
              icon={
                <BarChart3
                  className="h-9 w-9"
                  style={{
                    color: COLORS.revenue,
                  }}
                />
              }
              title={`Chưa có doanh thu trong năm ${year}`}
              description="Biểu đồ sẽ cập nhật khi có giao dịch SePay thanh toán thành công."
              background="bg-emerald-50/50"
            />
          )}
        </div>

        {/* ==================================
            RECRUITMENT GROWTH
            CỘT PHẢI
        ================================== */}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {/* HEADER */}

          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5">
              <TrendingUp className="h-5 w-5 text-violet-700" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tăng trưởng tuyển dụng
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Nhà tuyển dụng và tin tuyển dụng
              </p>
            </div>
          </div>

          {/* CHART */}

          {hasGrowth ? (
            <div
              className="w-full"
              style={{ height: CHART_HEIGHT }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={displayData}
                  margin={{
                    top: 8,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke={COLORS.grid}
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={axisTick}
                    tickMargin={8}
                    interval={0}
                  />

                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={smallAxisTick}
                    tickFormatter={formatCompact}
                    width={48}
                    domain={[0, "auto"]}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "#CBD5E1",
                      strokeDasharray: "4 4",
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: 11,
                      paddingTop: 10,
                    }}
                  />

                  {/* COMPANIES */}

                  <Line
                    type="monotone"
                    dataKey="companies"
                    name="Nhà tuyển dụng"
                    stroke={COLORS.companies}
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: COLORS.companies,
                      stroke: "#FFFFFF",
                      strokeWidth: 1.5,
                    }}
                    activeDot={{
                      r: 6,
                      fill: COLORS.companies,
                      stroke: "#FFFFFF",
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    animationDuration={900}
                  />

                  {/* JOBS */}

                  <Line
                    type="monotone"
                    dataKey="jobs"
                    name="Tin tuyển dụng"
                    stroke={COLORS.jobs}
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: COLORS.jobs,
                      stroke: "#FFFFFF",
                      strokeWidth: 1.5,
                    }}
                    activeDot={{
                      r: 6,
                      fill: COLORS.jobs,
                      stroke: "#FFFFFF",
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart
              icon={
                <TrendingUp className="h-9 w-9 text-violet-300" />
              }
              title="Chưa có dữ liệu tuyển dụng"
              description={`Chưa ghi nhận hoạt động trong năm ${year}.`}
              background="bg-violet-50/50"
            />
          )}

          <p className="mt-3 text-xs text-slate-400">
            Số lượng doanh nghiệp đăng ký và tin
            tuyển dụng theo từng tháng.
          </p>
        </div>
      </div>
    </section>
  );
}
