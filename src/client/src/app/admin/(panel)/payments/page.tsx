
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  X,
  Wallet,
} from "lucide-react";

type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED";

type StatusFilter = "ALL" | PaymentStatus;

interface Payment {
  id: number;
  company_id: number;
  plan_id: number;
  subscription_id: number | null;
  order_code: string;
  amount: number;
  payment_method: string;
  status: PaymentStatus;
  transfer_content: string;
  sepay_transaction_id: string | null;
  created_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
}

interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  expired: number;
  revenue: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  message?: string;
  error?: string;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const PAGE_SIZE = 10;

const initialStats: PaymentStats = {
  total: 0,
  paid: 0,
  pending: 0,
  failed: 0,
  expired: 0,
  revenue: 0,
};

const statusConfig: Record<
  PaymentStatus,
  {
    label: string;
    className: string;
  }
> = {
  PAID: {
    label: "Thành công",
    className: "bg-emerald-50 text-emerald-700",
  },
  PENDING: {
    label: "Đang chờ",
    className: "bg-amber-50 text-amber-700",
  },
  FAILED: {
    label: "Thất bại",
    className: "bg-red-50 text-red-700",
  },
  EXPIRED: {
    label: "Hết hạn",
    className: "bg-slate-100 text-slate-600",
  },
};

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PaymentBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        config?.className || "bg-gray-100 text-gray-600"
      }`}
    >
      {config?.label || status}
    </span>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 py-3">
      <p className="mb-1 text-xs font-medium text-slate-500">
        {label}
      </p>
      <div className="break-all text-sm font-medium text-slate-800">
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>(initialStats);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null);
  const [detailLoading, setDetailLoading] =
    useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;

    return sessionStorage.getItem("jobyfy_admin_token");
  }, []);

  const apiRequest = useCallback(
    async <T,>(path: string): Promise<ApiResponse<T>> => {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Bạn chưa đăng nhập tài khoản Admin."
        );
      }

      const response = await fetch(`${API_BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result: ApiResponse<T> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Không thể tải dữ liệu thanh toán."
        );
      }

      return result;
    },
    [getToken]
  );

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status,
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const result = await apiRequest<Payment[]>(
        `/admin/payments?${params.toString()}`
      );

      setPayments(result.data || []);

      setPagination(
        result.pagination || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      setPayments([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách thanh toán."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest, page, search, status]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const result = await apiRequest<PaymentStats>(
        "/admin/payments/stats"
      );

      setStats(result.data || initialStats);
    } catch (err) {
      console.error("Lỗi tải thống kê:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }

    void loadPayments();
  }, [getToken, loadPayments, router]);

  useEffect(() => {
    if (!getToken()) return;

    void loadStats();
  }, [getToken, loadStats]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleFilter = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const handleRefresh = () => {
    void Promise.all([loadPayments(), loadStats()]);
  };

  const handleViewDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedPayment(null);
    setDetailError("");

    try {
      const result = await apiRequest<Payment>(
        `/admin/payments/${id}`
      );

      if (!result.data) {
        throw new Error("Không tìm thấy giao dịch.");
      }

      setSelectedPayment(result.data);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết giao dịch."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const statsCards = [
    {
      label: "Tổng giao dịch",
      value: stats.total.toLocaleString("vi-VN"),
      icon: CreditCard,
      color: "text-violet-600",
      background: "bg-violet-50",
    },
    {
      label: "Doanh thu đã thanh toán",
      value: formatMoney(stats.revenue),
      icon: Wallet,
      color: "text-emerald-600",
      background: "bg-emerald-50",
    },
    {
      label: "Thanh toán thành công",
      value: stats.paid.toLocaleString("vi-VN"),
      icon: CheckCircle2,
      color: "text-green-600",
      background: "bg-green-50",
    },
    {
      label: "Đang chờ thanh toán",
      value: stats.pending.toLocaleString("vi-VN"),
      icon: Clock3,
      color: "text-amber-600",
      background: "bg-amber-50",
    },
    {
      label: "Giao dịch thất bại",
      value: stats.failed.toLocaleString("vi-VN"),
      icon: XCircle,
      color: "text-red-600",
      background: "bg-red-50",
    },
    {
      label: "Giao dịch hết hạn",
      value: stats.expired.toLocaleString("vi-VN"),
      icon: AlertCircle,
      color: "text-slate-600",
      background: "bg-slate-100",
    },
  ];

  return (
    <div className="space-y-6 text-slate-900">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Quản lý thanh toán
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Theo dõi giao dịch SePay và doanh thu PREMIUM
            của JobHub.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {/* STATISTICS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statsCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-3 break-words text-2xl font-bold">
                    {statsLoading ? "..." : item.value}
                  </p>
                </div>

                <div
                  className={`rounded-xl p-3 ${item.background}`}
                >
                  <Icon
                    className={`h-5 w-5 ${item.color}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEARCH AND FILTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <form
            onSubmit={handleSearch}
            className="flex flex-1 flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Mã đơn, mã SePay hoặc ID công ty..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              htmlFor="payment-status"
              className="text-sm font-medium text-slate-600"
            >
              Trạng thái
            </label>

            <select
              id="payment-status"
              value={status}
              onChange={(event) =>
                handleFilter(
                  event.target.value as StatusFilter
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500"
            >
              <option value="ALL">Tất cả</option>
              <option value="PAID">Thành công</option>
              <option value="PENDING">Đang chờ</option>
              <option value="FAILED">Thất bại</option>
              <option value="EXPIRED">Hết hạn</option>
            </select>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">
            Danh sách giao dịch
          </h2>

          <span className="text-sm text-slate-500">
            {pagination.total.toLocaleString("vi-VN")} giao dịch
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Mã đơn</th>
                <th className="px-5 py-4">Công ty</th>
                <th className="px-5 py-4">Số tiền</th>
                <th className="px-5 py-4">Phương thức</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-slate-500"
                  >
                    Đang tải danh sách giao dịch...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-slate-500"
                  >
                    Không tìm thấy giao dịch phù hợp.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-semibold">
                      #{payment.id}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-semibold text-violet-700">
                        {payment.order_code}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      #{payment.company_id}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatMoney(payment.amount)}
                    </td>

                    <td className="px-5 py-4">
                      {payment.payment_method}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(payment.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <PaymentBadge
                        status={payment.status}
                      />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          void handleViewDetail(payment.id)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        <Eye className="h-4 w-4" />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">
            {pagination.total === 0
              ? "Không có dữ liệu"
              : `Hiển thị ${
                  (page - 1) * PAGE_SIZE + 1
                } - ${Math.min(
                  page * PAGE_SIZE,
                  pagination.total
                )} / ${pagination.total}`}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
            >
              Trước
            </button>

            <span className="text-sm font-semibold">
              {page} / {Math.max(1, pagination.totalPages)}
            </span>

            <button
              type="button"
              disabled={
                loading ||
                page >= pagination.totalPages
              }
              onClick={() =>
                setPage((current) => current + 1)
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetailOpen(false);
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Chi tiết giao dịch
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Thông tin thanh toán SePay
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
              {detailLoading ? (
                <p className="py-12 text-center text-slate-500">
                  Đang tải chi tiết giao dịch...
                </p>
              ) : detailError ? (
                <p className="py-8 text-center text-red-600">
                  {detailError}
                </p>
              ) : selectedPayment ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        Giá trị giao dịch
                      </p>
                      <p className="mt-1 text-2xl font-bold text-violet-700">
                        {formatMoney(selectedPayment.amount)}
                      </p>
                    </div>

                    <PaymentBadge
                      status={selectedPayment.status}
                    />
                  </div>

                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <DetailItem
                      label="ID giao dịch"
                      value={`#${selectedPayment.id}`}
                    />

                    <DetailItem
                      label="ID công ty"
                      value={`#${selectedPayment.company_id}`}
                    />

                    <DetailItem
                      label="ID gói dịch vụ"
                      value={`#${selectedPayment.plan_id}`}
                    />

                    <DetailItem
                      label="ID đăng ký gói"
                      value={
                        selectedPayment.subscription_id != null
                          ? `#${selectedPayment.subscription_id}`
                          : "—"
                      }
                    />

                    <DetailItem
                      label="Phương thức thanh toán"
                      value={selectedPayment.payment_method}
                    />

                    <DetailItem
                      label="Mã giao dịch SePay"
                      value={
                        selectedPayment.sepay_transaction_id ||
                        "Chưa có"
                      }
                    />

                    <DetailItem
                      label="Ngày tạo"
                      value={formatDate(
                        selectedPayment.created_at
                      )}
                    />

                    <DetailItem
                      label="Ngày thanh toán"
                      value={formatDate(
                        selectedPayment.paid_at
                      )}
                    />

                    <DetailItem
                      label="Hạn thanh toán"
                      value={formatDate(
                        selectedPayment.expires_at
                      )}
                    />
                  </div>

                  <DetailItem
                    label="Mã đơn hàng"
                    value={selectedPayment.order_code}
                  />

                  <DetailItem
                    label="Nội dung chuyển khoản"
                    value={selectedPayment.transfer_content}
                  />
                </>
              ) : null}
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
