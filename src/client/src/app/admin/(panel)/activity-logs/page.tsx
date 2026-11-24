
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Activity,
  Search,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Building2,
  BriefcaseBusiness,
  Clock3,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Filter,
} from "lucide-react";

// ==========================================
// API CONFIG
// ==========================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const PAGE_LIMIT = 10;

// ==========================================
// TYPES
// ==========================================

type TargetType =
  | "ALL"
  | "USER"
  | "COMPANY"
  | "JOB"
  | "PAYMENT"
  | "SUBSCRIPTION";

type ActionFilter =
  | "ALL"
  | "LOCK_USER"
  | "UNLOCK_USER"
  | "LOCK_COMPANY"
  | "UNLOCK_COMPANY"
  | "HIDE_JOB"
  | "RESTORE_JOB";

interface ActivityLog {
  id: number;
  admin_id: number;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  target_type: string;
  target_id: number;
  description: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ActivityStats {
  total: number;
  today: number;
  thisMonth: number;
  userActions: number;
  companyActions: number;
  jobActions: number;
}

interface ApiResponse {
  success: boolean;
  data?: unknown;
  pagination?: Pagination;
  message?: string;
  error?: string;
}

interface LogsDataObject {
  logs?: ActivityLog[];
  activityLogs?: ActivityLog[];
  pagination?: Pagination;
}

// ==========================================
// OPTIONS
// ==========================================

const TARGET_OPTIONS: {
  value: TargetType;
  label: string;
}[] = [
  {
    value: "ALL",
    label: "Tất cả đối tượng",
  },
  {
    value: "USER",
    label: "Ứng viên",
  },
  {
    value: "COMPANY",
    label: "Nhà tuyển dụng",
  },
  {
    value: "JOB",
    label: "Tin tuyển dụng",
  },
  {
    value: "PAYMENT",
    label: "Thanh toán",
  },
  {
    value: "SUBSCRIPTION",
    label: "Gói dịch vụ",
  },
];

const ACTION_OPTIONS: {
  value: ActionFilter;
  label: string;
}[] = [
  {
    value: "ALL",
    label: "Tất cả hành động",
  },
  {
    value: "LOCK_USER",
    label: "Khóa ứng viên",
  },
  {
    value: "UNLOCK_USER",
    label: "Mở khóa ứng viên",
  },
  {
    value: "LOCK_COMPANY",
    label: "Khóa nhà tuyển dụng",
  },
  {
    value: "UNLOCK_COMPANY",
    label: "Mở khóa nhà tuyển dụng",
  },
  {
    value: "HIDE_JOB",
    label: "Ẩn tin tuyển dụng",
  },
  {
    value: "RESTORE_JOB",
    label: "Khôi phục tin tuyển dụng",
  },
];

// ==========================================
// FORMAT HELPERS
// ==========================================

const formatDate = (
  value?: string | null
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatNumber = (
  value?: number | null
): string => {
  return Number(value ?? 0).toLocaleString(
    "vi-VN"
  );
};

const getActionLabel = (
  action: string
): string => {
  const labels: Record<string, string> = {
    LOCK_USER: "Khóa ứng viên",
    UNLOCK_USER: "Mở khóa ứng viên",
    LOCK_COMPANY: "Khóa nhà tuyển dụng",
    UNLOCK_COMPANY: "Mở khóa nhà tuyển dụng",
    HIDE_JOB: "Ẩn tin tuyển dụng",
    RESTORE_JOB: "Khôi phục tin tuyển dụng",

    // Tương thích với dữ liệu nhật ký cũ.
    SHOW_JOB: "Khôi phục tin tuyển dụng",
    UNHIDE_JOB: "Khôi phục tin tuyển dụng",

    UPDATE_JOB_STATUS: "Cập nhật tin tuyển dụng",
    UPDATE_SUBSCRIPTION: "Cập nhật gói dịch vụ",
  };

  const key = action.toUpperCase();

  return labels[key] || key.replaceAll("_", " ");
};

const getTargetLabel = (
  type: string
): string => {
  const labels: Record<string, string> = {
    USER: "Ứng viên",
    COMPANY: "Nhà tuyển dụng",
    JOB: "Tin tuyển dụng",
    PAYMENT: "Thanh toán",
    SUBSCRIPTION: "Gói dịch vụ",
  };

  return (
    labels[type.toUpperCase()] ||
    type
  );
};

const getTargetIcon = (
  type: string
) => {
  switch (type.toUpperCase()) {
    case "USER":
      return <UserRound size={16} />;

    case "COMPANY":
      return <Building2 size={16} />;

    case "JOB":
      return <BriefcaseBusiness size={16} />;

    default:
      return <Activity size={16} />;
  }
};

const getActionColor = (
  action: string
): string => {
  const upper = action.toUpperCase();

  if (
    upper.includes("UNLOCK") ||
    upper.includes("RESTORE") ||
    upper.includes("UNHIDE") ||
    upper === "SHOW_JOB"
  ) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (
    upper.includes("LOCK") &&
    !upper.includes("UNLOCK")
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (upper.includes("HIDE")) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  return "bg-purple-50 text-purple-700 border-purple-200";
};

const normalizePagination = (
  value: Pagination | undefined,
  fallbackPage: number,
  itemCount: number
): Pagination => {
  if (!value) {
    return {
      page: fallbackPage,
      limit: PAGE_LIMIT,
      total: itemCount,
      totalPages: 1,
    };
  }

  const limit = Math.max(
    1,
    Number(value.limit) || PAGE_LIMIT
  );

  const total = Math.max(
    0,
    Number(value.total) || 0
  );

  return {
    page: Math.max(
      1,
      Number(value.page) || fallbackPage
    ),
    limit,
    total,
    totalPages: Math.max(
      1,
      Number(value.totalPages) ||
        Math.ceil(total / limit)
    ),
  };
};

// ==========================================
// PAGE COMPONENT
// ==========================================

export default function AdminActivityLogsPage() {
  // ========================================
  // DATA STATES
  // ========================================

  const [logs, setLogs] =
    useState<ActivityLog[]>([]);

  const [stats, setStats] =
    useState<ActivityStats | null>(null);

  // ========================================
  // FILTER STATES
  // ========================================

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [targetType, setTargetType] =
    useState<TargetType>("ALL");

  const [action, setAction] =
    useState<ActionFilter>("ALL");

  // ========================================
  // PAGINATION STATES
  // ========================================

  const [page, setPage] = useState(1);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: PAGE_LIMIT,
      total: 0,
      totalPages: 1,
    });

  // ========================================
  // UI STATES
  // ========================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedLog, setSelectedLog] =
    useState<ActivityLog | null>(null);

  // Dùng để bỏ qua response cũ khi
  // người dùng thay đổi bộ lọc liên tục.
  const latestRequestId = useRef(0);

  // ========================================
  // GET ADMIN TOKEN
  // ========================================

  const getToken = useCallback((): string => {
    if (typeof window === "undefined") {
      return "";
    }

    return (
      sessionStorage.getItem(
        "jobyfy_admin_token"
      ) || ""
    );
  }, []);

  // ========================================
  // REQUEST API
  // ========================================

  const requestApi = useCallback(
    async (
      endpoint: string,
      signal?: AbortSignal
    ): Promise<ApiResponse> => {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập Admin không tồn tại. Vui lòng đăng nhập lại."
        );
      }

      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal,
        }
      );

      let result: ApiResponse;

      try {
        result =
          (await response.json()) as ApiResponse;
      } catch {
        throw new Error(
          "Máy chủ trả về dữ liệu không hợp lệ."
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            result.error ||
            "Không thể tải dữ liệu."
        );
      }

      return result;
    },
    [getToken]
  );

  // ========================================
  // LOAD ACTIVITY LOGS
  // ========================================

  const loadLogs = useCallback(
    async (
      signal?: AbortSignal
    ): Promise<void> => {
      const requestId =
        ++latestRequestId.current;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_LIMIT),
        });

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        if (targetType !== "ALL") {
          params.set(
            "targetType",
            targetType
          );
        }

        if (action !== "ALL") {
          params.set(
            "action",
            action
          );
        }

        const result = await requestApi(
          `/admin/activity-logs?${params.toString()}`,
          signal
        );

        if (
          signal?.aborted ||
          requestId !== latestRequestId.current
        ) {
          return;
        }

        const rawData = result.data;

        let items: ActivityLog[] = [];
        let pageInfo = result.pagination;

        // Hỗ trợ response:
        // data: ActivityLog[]
        if (Array.isArray(rawData)) {
          items = rawData as ActivityLog[];
        }

        // Hỗ trợ response:
        // data: { logs, pagination }
        else if (
          rawData &&
          typeof rawData === "object"
        ) {
          const dataObject =
            rawData as LogsDataObject;

          items =
            dataObject.logs ||
            dataObject.activityLogs ||
            [];

          pageInfo =
            pageInfo ||
            dataObject.pagination;
        }

        setLogs(items);

        setPagination(
          normalizePagination(
            pageInfo,
            page,
            items.length
          )
        );
      } catch (err) {
        if (
          signal?.aborted ||
          requestId !== latestRequestId.current
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải lịch sử hoạt động."
        );

        setLogs([]);

        setPagination({
          page,
          limit: PAGE_LIMIT,
          total: 0,
          totalPages: 1,
        });
      } finally {
        if (
          !signal?.aborted &&
          requestId === latestRequestId.current
        ) {
          setLoading(false);
        }
      }
    },
    [
      page,
      search,
      targetType,
      action,
      requestApi,
    ]
  );

  // ========================================
  // LOAD STATISTICS
  // ========================================

  const loadStats = useCallback(
    async (
      signal?: AbortSignal
    ): Promise<void> => {
      try {
        const result = await requestApi(
          "/admin/activity-logs/stats",
          signal
        );

        if (signal?.aborted) {
          return;
        }

        if (
          result.data &&
          typeof result.data === "object" &&
          !Array.isArray(result.data)
        ) {
          const raw =
            result.data as Partial<ActivityStats>;

          setStats({
            total: Number(
              raw.total ?? 0
            ),
            today: Number(
              raw.today ?? 0
            ),
            thisMonth: Number(
              raw.thisMonth ?? 0
            ),
            userActions: Number(
              raw.userActions ?? 0
            ),
            companyActions: Number(
              raw.companyActions ?? 0
            ),
            jobActions: Number(
              raw.jobActions ?? 0
            ),
          });
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        console.warn(
          "Không thể tải thống kê lịch sử Admin:",
          err
        );

        setStats(null);
      }
    },
    [requestApi]
  );

  // ========================================
  // AUTO LOAD LOGS
  // ========================================

  useEffect(() => {
    const controller =
      new AbortController();

    void loadLogs(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadLogs]);

  // ========================================
  // AUTO LOAD STATISTICS
  // ========================================

  useEffect(() => {
    const controller =
      new AbortController();

    void loadStats(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadStats]);

  // ========================================
  // HANDLE SEARCH
  // ========================================

  const handleSearch = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  };

  // ========================================
  // HANDLE RESET FILTERS
  // ========================================

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setTargetType("ALL");
    setAction("ALL");
    setPage(1);
  };

  // ========================================
  // HANDLE REFRESH
  // ========================================

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await Promise.all([
        loadLogs(),
        loadStats(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // ========================================
  // PAGINATION
  // ========================================

  const totalPages = Math.max(
    1,
    pagination.totalPages
  );

  const hasFilters =
    search !== "" ||
    targetType !== "ALL" ||
    action !== "ALL";

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6 pb-10">
      {/* ====================================
          PAGE HEADER
      ==================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <Activity size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Lịch sử hoạt động Admin
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Theo dõi các thao tác quản trị
              trên hệ thống JobHub
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleRefresh();
          }}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Làm mới
        </button>
      </div>

      {/* ====================================
          STATISTICS
      ==================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* TOTAL */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Tổng hoạt động
            </span>

            <Activity
              size={22}
              className="text-purple-600"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {formatNumber(
              stats?.total ??
                pagination.total
            )}
          </p>
        </div>

        {/* TODAY */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Hoạt động hôm nay
            </span>

            <Clock3
              size={22}
              className="text-blue-600"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {stats
              ? formatNumber(stats.today)
              : "—"}
          </p>
        </div>

        {/* THIS MONTH */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Hoạt động tháng này
            </span>

            <ShieldCheck
              size={22}
              className="text-green-600"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {stats
              ? formatNumber(stats.thisMonth)
              : "—"}
          </p>
        </div>
      </div>

      {/* ====================================
          FILTERS
      ==================================== */}

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter
            size={18}
            className="text-purple-600"
          />

          <h2 className="font-semibold text-gray-900">
            Tìm kiếm và bộ lọc
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {/* SEARCH */}

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value
                  )
                }
                placeholder="Tìm hành động, mô tả, Admin, email hoặc ID đối tượng..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              <Search size={17} />
              Tìm kiếm
            </button>
          </form>

          {/* TARGET + ACTION */}

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="activity-target-filter"
                className="mb-2 block text-xs font-medium text-gray-500"
              >
                Lọc theo đối tượng
              </label>

              <select
                id="activity-target-filter"
                value={targetType}
                onChange={(event) => {
                  setTargetType(
                    event.target
                      .value as TargetType
                  );

                  setPage(1);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-purple-500"
              >
                {TARGET_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex-1">
              <label
                htmlFor="activity-action-filter"
                className="mb-2 block text-xs font-medium text-gray-500"
              >
                Lọc theo hành động
              </label>

              <select
                id="activity-action-filter"
                value={action}
                onChange={(event) => {
                  setAction(
                    event.target
                      .value as ActionFilter
                  );

                  setPage(1);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-purple-500"
              >
                {ACTION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={
                  !hasFilters &&
                  !searchInput
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <X size={16} />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================
          ERROR
      ==================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={20}
            className="shrink-0"
          />

          <span>{error}</span>
        </div>
      )}

      {/* ====================================
          ACTIVITY LOG TABLE
      ==================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900">
            Danh sách hoạt động
          </h2>

          <span className="text-sm text-gray-500">
            {formatNumber(
              pagination.total
            )}{" "}
            bản ghi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">
                  ID
                </th>

                <th className="px-5 py-4">
                  Quản trị viên
                </th>

                <th className="px-5 py-4">
                  Hành động
                </th>

                <th className="px-5 py-4">
                  Đối tượng
                </th>

                <th className="px-5 py-4">
                  Thời gian
                </th>

                <th className="px-5 py-4 text-center">
                  Chi tiết
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <RefreshCw
                      size={24}
                      className="mx-auto mb-3 animate-spin text-purple-600"
                    />

                    Đang tải lịch sử hoạt động...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <Activity
                      size={36}
                      className="mx-auto mb-3 text-gray-300"
                    />

                    {error
                      ? "Không thể hiển thị lịch sử hoạt động"
                      : hasFilters
                      ? "Không tìm thấy hoạt động phù hợp với bộ lọc"
                      : "Chưa có lịch sử hoạt động"}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition hover:bg-gray-50"
                  >
                    {/* LOG ID */}

                    <td className="px-5 py-4 font-medium text-gray-600">
                      #{log.id}
                    </td>

                    {/* ADMIN */}

                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {log.admin_name ||
                          `Admin #${log.admin_id}`}
                      </div>

                      {log.admin_email && (
                        <div className="mt-1 text-xs text-gray-500">
                          {log.admin_email}
                        </div>
                      )}
                    </td>

                    {/* ACTION */}

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionLabel(
                          log.action
                        )}
                      </span>
                    </td>

                    {/* TARGET */}

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        {getTargetIcon(
                          log.target_type
                        )}

                        <span>
                          {getTargetLabel(
                            log.target_type
                          )}
                          {" #"}
                          {log.target_id}
                        </span>
                      </div>
                    </td>

                    {/* TIME */}

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {formatDate(
                        log.created_at
                      )}
                    </td>

                    {/* DETAILS */}

                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLog(log)
                        }
                        className="inline-flex items-center justify-center rounded-lg p-2 text-purple-600 transition hover:bg-purple-50"
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết nhật ký ${log.id}`}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ==================================
            PAGINATION
        ================================== */}

        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Trang {page} / {totalPages}
            {" · "}
            Tổng{" "}
            {formatNumber(
              pagination.total
            )}{" "}
            bản ghi
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                page <= 1 ||
                loading
              }
              onClick={() =>
                setPage((current) =>
                  Math.max(
                    1,
                    current - 1
                  )
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Trước
            </button>

            <button
              type="button"
              disabled={
                page >= totalPages ||
                loading
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1
                  )
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================
          DETAIL MODAL
      ==================================== */}

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setSelectedLog(null)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-log-detail-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}

            <div className="mb-5 flex items-center justify-between">
              <h3
                id="activity-log-detail-title"
                className="text-xl font-bold text-gray-900"
              >
                Chi tiết hoạt động
              </h3>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Đóng chi tiết"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL CONTENT */}

            <div className="space-y-4 text-sm">
              {/* LOG ID */}

              <div>
                <p className="text-gray-500">
                  Mã nhật ký
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  #{selectedLog.id}
                </p>
              </div>

              {/* ADMIN */}

              <div>
                <p className="text-gray-500">
                  Quản trị viên thực hiện
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {selectedLog.admin_name ||
                    `Admin #${selectedLog.admin_id}`}
                </p>

                {selectedLog.admin_email && (
                  <p className="mt-1 text-gray-500">
                    {selectedLog.admin_email}
                  </p>
                )}
              </div>

              {/* ACTION */}

              <div>
                <p className="text-gray-500">
                  Hành động
                </p>

                <span
                  className={`mt-2 inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold ${getActionColor(
                    selectedLog.action
                  )}`}
                >
                  {getActionLabel(
                    selectedLog.action
                  )}
                </span>
              </div>

              {/* TARGET */}

              <div>
                <p className="text-gray-500">
                  Đối tượng bị tác động
                </p>

                <div className="mt-2 flex items-center gap-2 font-semibold text-gray-900">
                  {getTargetIcon(
                    selectedLog.target_type
                  )}

                  <span>
                    {getTargetLabel(
                      selectedLog.target_type
                    )}
                    {" #"}
                    {selectedLog.target_id}
                  </span>
                </div>
              </div>

              {/* DESCRIPTION */}

              <div>
                <p className="text-gray-500">
                  Nội dung chi tiết
                </p>

                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 leading-relaxed text-gray-700">
                  {selectedLog.description ||
                    "Không có mô tả"}
                </p>
              </div>

              {/* TIME */}

              <div>
                <p className="text-gray-500">
                  Thời gian thực hiện
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(
                    selectedLog.created_at
                  )}
                </p>
              </div>
            </div>

            {/* MODAL FOOTER */}

            <button
              type="button"
              onClick={() =>
                setSelectedLog(null)
              }
              className="mt-6 w-full rounded-xl bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
