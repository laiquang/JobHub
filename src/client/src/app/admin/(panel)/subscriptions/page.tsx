
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Users,
  CalendarDays,
  CheckCircle2,
  Clock3,
  XCircle,
  Pencil,
  RefreshCw,
  Search,
  Save,
  X,
} from "lucide-react";

interface Plan {
  id: number;
  code: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number | null;
  max_active_jobs: number;
  ai_cv_scoring: boolean;
  priority_jobs: boolean;
  is_active: boolean;
  created_at: string | null;
  active_companies: number;
  total_subscriptions: number;
}

type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED";

interface Subscription {
  id: number;
  company_id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  start_date: string;
  end_date: string | null;
  status: SubscriptionStatus;
  created_at: string | null;
  updated_at: string | null;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
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

interface PlanForm {
  name: string;
  description: string;
  price: string;
  duration_days: string;
  max_active_jobs: string;
  ai_cv_scoring: boolean;
  priority_jobs: boolean;
  is_active: boolean;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const PAGE_SIZE = 10;

const initialStats: Stats = {
  total: 0,
  active: 0,
  expired: 0,
  cancelled: 0,
};

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateTime(value: string | null) {
  if (!value) return "Không giới hạn";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN");
}

function subscriptionStatus(
  subscription: Subscription
): SubscriptionStatus {
  if (
    subscription.status === "ACTIVE" &&
    subscription.end_date &&
    new Date(subscription.end_date).getTime() <= Date.now()
  ) {
    return "EXPIRED";
  }

  return subscription.status;
}

function StatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  const config = {
    ACTIVE: {
      label: "Đang hoạt động",
      style: "bg-green-50 text-green-700",
    },
    EXPIRED: {
      label: "Hết hạn",
      style: "bg-amber-50 text-amber-700",
    },
    CANCELLED: {
      label: "Đã hủy",
      style: "bg-red-50 text-red-700",
    },
  }[status];

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${config.style}`}
    >
      {config.label}
    </span>
  );
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>([]);

  const [stats, setStats] = useState<Stats>(initialStats);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    });

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingPlan, setEditingPlan] =
    useState<Plan | null>(null);

  const [form, setForm] = useState<PlanForm>({
    name: "",
    description: "",
    price: "",
    duration_days: "",
    max_active_jobs: "",
    ai_cv_scoring: false,
    priority_jobs: false,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  const apiRequest = useCallback(
    async <T,>(
      path: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
      const token = sessionStorage.getItem(
        "jobyfy_admin_token"
      );

      if (!token) {
        throw new Error("Chưa đăng nhập Admin");
      }

      const response = await fetch(
        `${API_BASE}${path}`,
        {
          ...options,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
          cache: "no-store",
        }
      );

      const result: ApiResponse<T> =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Có lỗi xảy ra"
        );
      }

      return result;
    },
    []
  );

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);

    try {
      const result = await apiRequest<Plan[]>(
        "/admin/subscriptions/plans"
      );

      setPlans(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách gói"
      );
    } finally {
      setPlansLoading(false);
    }
  }, [apiRequest]);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status,
      });

      if (search) params.set("search", search);

      if (planFilter !== "ALL") {
        params.set("planId", planFilter);
      }

      const result = await apiRequest<Subscription[]>(
        `/admin/subscriptions?${params.toString()}`
      );

      setSubscriptions(result.data || []);

      setPagination(
        result.pagination || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      setSubscriptions([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được lịch sử đăng ký"
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest, page, search, status, planFilter]);

  const loadStats = useCallback(async () => {
    try {
      const result = await apiRequest<Stats>(
        "/admin/subscriptions/stats"
      );

      setStats(result.data || initialStats);
    } catch (err) {
      console.error(err);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (!sessionStorage.getItem("jobyfy_admin_token")) {
      router.replace("/admin/login");
      return;
    }

    void Promise.all([loadPlans(), loadStats()]);
  }, [router, loadPlans, loadStats]);

  useEffect(() => {
    if (!sessionStorage.getItem("jobyfy_admin_token")) {
      return;
    }

    void loadSubscriptions();
  }, [loadSubscriptions]);

  const refresh = () => {
    setError("");
    void Promise.all([
      loadPlans(),
      loadStats(),
      loadSubscriptions(),
    ]);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);

    setForm({
      name: plan.name,
      description: plan.description || "",
      price: String(plan.price),
      duration_days:
        plan.duration_days === null
          ? ""
          : String(plan.duration_days),
      max_active_jobs: String(plan.max_active_jobs),
      ai_cv_scoring: plan.ai_cv_scoring,
      priority_jobs: plan.priority_jobs,
      is_active: plan.is_active,
    });
  };

  const savePlan = async (event: FormEvent) => {
    event.preventDefault();

    if (!editingPlan) return;

    const price = Number(form.price);
    const maxJobs = Number(form.max_active_jobs);
    const duration = form.duration_days.trim()
      ? Number(form.duration_days)
      : null;

    if (
      !Number.isSafeInteger(price) ||
      price < 0 ||
      !Number.isSafeInteger(maxJobs) ||
      maxJobs < 0 ||
      (duration !== null &&
        (!Number.isSafeInteger(duration) ||
          duration <= 0))
    ) {
      setError("Giá, thời hạn hoặc số tin không hợp lệ.");
      return;
    }

    if (
      editingPlan.code === "PREMIUM" &&
      (price <= 0 || duration === null)
    ) {
      setError(
        "Gói PREMIUM phải có giá lớn hơn 0 và thời hạn hợp lệ."
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/admin/subscriptions/plans/${editingPlan.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            price,
            duration_days: duration,
            max_active_jobs: maxJobs,
            ai_cv_scoring: form.ai_cv_scoring,
            priority_jobs: form.priority_jobs,
            is_active: form.is_active,
          }),
        }
      );

      setEditingPlan(null);
      setNotice("Cập nhật gói dịch vụ thành công.");

      await Promise.all([loadPlans(), loadStats()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Cập nhật thất bại"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Quản lý gói dịch vụ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý FREE, PREMIUM và lịch sử đăng ký
            của nhà tuyển dụng.
          </p>
        </div>

        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {notice && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng lượt đăng ký",
            value: stats.total,
            icon: Users,
          },
          {
            label: "Đang hoạt động",
            value: stats.active,
            icon: CheckCircle2,
          },
          {
            label: "Đã hết hạn",
            value: stats.expired,
            icon: Clock3,
          },
          {
            label: "Đã hủy",
            value: stats.cancelled,
            icon: XCircle,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {item.label}
                </p>
                <Icon className="h-5 w-5 text-violet-600" />
              </div>

              <p className="mt-3 text-3xl font-bold">
                {item.value.toLocaleString("vi-VN")}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">
          Danh sách gói dịch vụ
        </h2>

        <div className="grid gap-5 lg:grid-cols-2">
          {plansLoading ? (
            <div className="rounded-2xl bg-white p-8 text-slate-500">
              Đang tải gói dịch vụ...
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                      <Crown className="h-6 w-6" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold">
                        {plan.name}
                      </h3>
                      <p className="text-xs font-semibold text-violet-600">
                        {plan.code}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {plan.is_active
                      ? "Đang mở"
                      : "Đã tắt"}
                  </span>
                </div>

                <p className="mt-5 text-3xl font-bold text-violet-700">
                  {money(plan.price)}
                </p>

                <p className="mt-2 min-h-10 text-sm text-slate-500">
                  {plan.description || "Chưa có mô tả"}
                </p>

                <div className="mt-5 space-y-3 border-t pt-5 text-sm">
                  <div className="flex justify-between">
                    <span>Thời hạn</span>
                    <strong>
                      {plan.duration_days === null
                        ? "Không giới hạn"
                        : `${plan.duration_days} ngày`}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Giới hạn tin đăng</span>
                    <strong>
                      {plan.max_active_jobs === -1
                        ? "Không giới hạn"
                        : plan.max_active_jobs}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Chấm điểm CV bằng AI</span>
                    <strong>
                      {plan.ai_cv_scoring ? "Có" : "Không"}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Ưu tiên tin tuyển dụng</span>
                    <strong>
                      {plan.priority_jobs ? "Có" : "Không"}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Công ty đang sử dụng</span>
                    <strong>{plan.active_companies}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Tổng lượt đăng ký</span>
                    <strong>{plan.total_subscriptions}</strong>
                  </div>
                </div>

                <button
                  onClick={() => openEdit(plan)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa gói
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">
            Lịch sử đăng ký gói
          </h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setSearch(searchInput.trim());
              }}
              className="flex min-w-64 flex-1 gap-2"
            >
              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="ID công ty hoặc ID đăng ký..."
                className="min-w-0 flex-1 rounded-xl border px-4 py-2.5 text-sm"
              />

              <button className="rounded-xl bg-violet-600 px-4 text-white">
                <Search className="h-4 w-4" />
              </button>
            </form>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="EXPIRED">Hết hạn</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            <select
              value={planFilter}
              onChange={(event) => {
                setPlanFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              <option value="ALL">Tất cả gói</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Công ty</th>
                <th className="px-5 py-4">Gói</th>
                <th className="px-5 py-4">Bắt đầu</th>
                <th className="px-5 py-4">Kết thúc</th>
                <th className="px-5 py-4">Trạng thái</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-slate-500"
                  >
                    Chưa có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                subscriptions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      #{item.id}
                    </td>

                    <td className="px-5 py-4">
                      #{item.company_id}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {item.plan_name}
                    </td>

                    <td className="px-5 py-4">
                      {dateTime(item.start_date)}
                    </td>

                    <td className="px-5 py-4">
                      {dateTime(item.end_date)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={subscriptionStatus(item)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-5">
          <p className="text-sm text-slate-500">
            {pagination.total} lượt đăng ký
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
            >
              Trước
            </button>

            <span className="text-sm">
              {page} / {Math.max(1, pagination.totalPages)}
            </span>

            <button
              disabled={
                loading || page >= pagination.totalPages
              }
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={savePlan}
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Chỉnh sửa gói {editingPlan.code}
                </h2>
                <p className="text-sm text-slate-500">
                  Cập nhật thông tin gói dịch vụ
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Tên gói
                </label>
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Giá (VND)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    disabled={editingPlan.code === "FREE"}
                    value={form.price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border px-4 py-3 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Thời hạn (ngày)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.duration_days}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        duration_days: e.target.value,
                      })
                    }
                    placeholder="Để trống nếu không giới hạn"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Số tin đăng tối đa (-1 = không giới hạn)
                </label>
                <input
                  type="number"
                  min={-1}
                  step={1}
                  value={form.max_active_jobs}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_active_jobs: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.ai_cv_scoring}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ai_cv_scoring: e.target.checked,
                    })
                  }
                />
                Chấm điểm CV bằng AI
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.priority_jobs}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority_jobs: e.target.checked,
                    })
                  }
                />
                Ưu tiên tin tuyển dụng
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  disabled={editingPlan.code === "FREE"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_active: e.target.checked,
                    })
                  }
                />
                Cho phép đăng ký gói
              </label>

              <p className="text-xs text-slate-500">
                Thay đổi giá và thời hạn sẽ áp dụng khi tạo
                đơn thanh toán mới. Các giao dịch đã tạo
                không bị sửa.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="rounded-xl border px-5 py-2.5 text-sm"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
