
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Users,
  Building2,
  BriefcaseBusiness,
  Wallet,
  Loader2,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

import AdminCharts from "@/components/admin/AdminCharts";

// ==========================================
// TYPES
// ==========================================

type Admin = {
  id: number;
  full_name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
};

type DashboardStats = {
  totalUsers: number;
  totalCompanies: number;
  totalJobs: number;
  totalRevenue: number;
  totalPaidPayments: number;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

// ==========================================
// API
// ==========================================

const apiBase = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

// ==========================================
// FORMAT
// ==========================================

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

// ==========================================
// COLORS
// ==========================================

const dashboardColors = {
  users: "from-[#3520A7] to-[#7048E8]",
  companies: "from-[#2478CE] to-[#59A8F2]",
  jobs: "from-[#E99512] to-[#F5B642]",
  revenue: "from-[#16876C] to-[#27B08D]",
};

// ==========================================
// DECORATIVE MINI CHART
// ==========================================

function MiniChart() {
  return (
    <svg
      viewBox="0 0 220 65"
      className="h-10 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 42 C15 32 25 48 40 36 S65 20 80 30 S105 55 120 38 S145 12 160 25 S185 45 200 26 L220 32"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeOpacity="0.75"
        strokeLinecap="round"
      />

      <path
        d="M0 42 C15 32 25 48 40 36 S65 20 80 30 S105 55 120 38 S145 12 160 25 S185 45 200 26 L220 32 L220 65 L0 65 Z"
        fill="white"
        fillOpacity="0.08"
      />
    </svg>
  );
}

// ==========================================
// ADMIN DASHBOARD PAGE
// ==========================================

export default function AdminDashboardPage() {
  const router = useRouter();

  const [admin, setAdmin] =
    useState<Admin | null>(null);

  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [chartRefreshKey, setChartRefreshKey] =
    useState(0);

  // ==========================================
  // LOGOUT
  // ==========================================

  const logoutAdmin = useCallback(() => {
    sessionStorage.removeItem("jobyfy_admin_token");
    sessionStorage.removeItem("jobyfy_admin");

    router.replace("/admin/login");
  }, [router]);

  // ==========================================
  // LOAD DASHBOARD
  // ==========================================

  const loadDashboard = useCallback(
    async (
      isRefresh = false,
      signal?: AbortSignal
    ) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const token = sessionStorage.getItem(
          "jobyfy_admin_token"
        );

        if (!token) {
          logoutAdmin();
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // GET ADMIN INFO

        const meResponse = await fetch(
          `${apiBase}/admin/me`,
          {
            headers,
            cache: "no-store",
            signal,
          }
        );

        if (
          meResponse.status === 401 ||
          meResponse.status === 403
        ) {
          logoutAdmin();
          return;
        }

        const meResult: ApiResponse<Admin> =
          await meResponse.json();

        if (
          !meResponse.ok ||
          !meResult.success ||
          !meResult.data
        ) {
          throw new Error(
            meResult.message ||
              meResult.error ||
              "Không thể xác thực tài khoản Admin"
          );
        }

        if (signal?.aborted) return;

        setAdmin(meResult.data);

        // GET DASHBOARD STATS

        const statsResponse = await fetch(
          `${apiBase}/admin/dashboard/stats`,
          {
            headers,
            cache: "no-store",
            signal,
          }
        );

        if (
          statsResponse.status === 401 ||
          statsResponse.status === 403
        ) {
          logoutAdmin();
          return;
        }

        const statsResult: ApiResponse<DashboardStats> =
          await statsResponse.json();

        if (
          !statsResponse.ok ||
          !statsResult.success ||
          !statsResult.data
        ) {
          throw new Error(
            statsResult.message ||
              statsResult.error ||
              "Không thể tải thống kê Dashboard"
          );
        }

        if (signal?.aborted) return;

        setStats(statsResult.data);

        // Reload both chart components

        if (isRefresh) {
          setChartRefreshKey((prev) => prev + 1);
        }
      } catch (err) {
        if (signal?.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Có lỗi xảy ra khi tải Dashboard"
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [logoutAdmin]
  );

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    void loadDashboard(false, controller.signal);

    return () => controller.abort();
  }, [loadDashboard]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-violet-600" />
      </div>
    );
  }

  // ==========================================
  // SUMMARY CARDS
  // ==========================================

  const cards = [
    {
      label: "Tổng ứng viên",
      value: stats
        ? formatNumber(stats.totalUsers)
        : "—",
      icon: Users,
      gradient: dashboardColors.users,
      subtitle: "Ứng viên trên hệ thống",
      href: "/admin/users",
    },
    {
      label: "Nhà tuyển dụng",
      value: stats
        ? formatNumber(stats.totalCompanies)
        : "—",
      icon: Building2,
      gradient: dashboardColors.companies,
      subtitle: "Doanh nghiệp đã đăng ký",
      href: "/admin/companies",
    },
    {
      label: "Tin tuyển dụng",
      value: stats
        ? formatNumber(stats.totalJobs)
        : "—",
      icon: BriefcaseBusiness,
      gradient: dashboardColors.jobs,
      subtitle: "Tổng số tin tuyển dụng",
      href: "/admin/jobs",
    },
    {
      label: "Tổng doanh thu",
      value: stats
        ? formatCurrency(stats.totalRevenue)
        : "—",
      icon: Wallet,
      gradient: dashboardColors.revenue,
      subtitle: "Thanh toán thành công",
      href: "/admin/payments",
    },
  ];

  // ==========================================
  // RENDER DASHBOARD
  // ==========================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              ADMIN DASHBOARD
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Xin chào,{" "}
            <span className="text-violet-700">
              {admin?.full_name || "Admin"}
            </span>
            !
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Tổng quan hoạt động nền tảng tuyển dụng JobHub.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* 4 SUMMARY CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} p-4 text-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute right-10 top-10 h-16 w-16 rounded-full bg-white/5" />

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <Link
                  href={item.href}
                  title={`Xem chi tiết ${item.label}`}
                  aria-label={`Xem chi tiết ${item.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 hover:scale-110 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ArrowUpRight className="h-5 w-5" />
                </Link>
              </div>

              <div className="relative z-10 mt-3">
                <p className="text-sm font-medium text-white/85">
                  {item.label}
                </p>

                <p className="mt-1 break-words text-2xl font-extrabold tracking-tight text-white">
                  {item.value}
                </p>

                <p className="mt-2 text-xs text-white/75">
                  {item.subtitle}
                </p>
              </div>

              <div className="relative z-10 mt-2 opacity-80">
                <MiniChart />
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================
          CHART SECTION
      ====================================== */}

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <TrendingUp className="h-5 w-5 text-violet-700" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Biểu đồ thống kê
            </h2>

            <p className="text-sm text-slate-500">
              Theo dõi tăng trưởng và doanh thu theo tháng.
            </p>
          </div>
        </div>

        {/* HÀNG 1:
            TRÁI: DOANH THU
            PHẢI: TĂNG TRƯỞNG
        */}

        {admin && (
          <AdminCharts
            key={`top-${chartRefreshKey}`}
            mode="top"
          />
        )}
      </div>

      {/* ======================================
          HÀNG 2:
          TRÁI: THỐNG KÊ THANH TOÁN
          PHẢI: BIỂU ĐỒ ỨNG VIÊN
      ====================================== */}

      <div className="grid items-stretch gap-6 lg:grid-cols-2">

        {/* CỘT TRÁI - THỐNG KÊ THANH TOÁN */}

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3">
              <CreditCard className="h-6 w-6 text-emerald-700" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Thống kê thanh toán
              </h2>

              <p className="text-sm text-slate-500">
                Giao dịch SePay đã thanh toán thành công
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Tổng giao dịch thành công
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats
                ? formatNumber(stats.totalPaidPayments)
                : "—"}
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-gradient-to-r from-[#16876C] to-[#27B08D] p-5 text-white">
            <p className="text-sm text-white/85">
              Doanh thu đã ghi nhận
            </p>

            <p className="mt-2 break-words text-2xl font-bold">
              {stats
                ? formatCurrency(stats.totalRevenue)
                : "—"}
            </p>
          </div>
        </div>

        {/* CỘT PHẢI - BIỂU ĐỒ ỨNG VIÊN */}

        <div className="min-w-0">
          {admin && (
            <AdminCharts
              key={`users-${chartRefreshKey}`}
              mode="users"
            />
          )}
        </div>
      </div>

      {/* ======================================
          HÀNG 3:
          THÔNG TIN QUẢN TRỊ VIÊN
      ====================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-3">
            <ShieldCheck className="h-6 w-6 text-violet-700" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Thông tin quản trị viên
            </h2>

            <p className="text-sm text-slate-500">
              Phiên đăng nhập hiện tại
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Họ và tên
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {admin?.full_name || "—"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              Email
            </p>

            <p className="mt-2 break-all font-semibold text-slate-900">
              {admin?.email || "—"}
            </p>
          </div>

          <div className="rounded-xl bg-violet-50 p-5">
            <p className="text-sm text-violet-600">
              Vai trò
            </p>

            <p className="mt-2 font-bold text-violet-700">
              {admin?.role || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
