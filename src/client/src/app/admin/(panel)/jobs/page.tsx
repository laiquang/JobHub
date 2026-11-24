
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "ACTIVE" | "HIDDEN";
type StatusFilter = "ALL" | JobStatus;

interface Job {
  id: number;
  idCompany: number | null;
  idField: number | null;
  idProvince: number | null;
  nameJob: string | null;
  request: string | null;
  desc: string | null;
  other: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  sex: string | null;
  typeWork: string | null;
  education: string | null;
  experience: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  status: JobStatus;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Statistics {
  total: number;
  active: number;
  hidden: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  message?: string;
  error?: string;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const PAGE_SIZE = 10;

const emptyStatistics: Statistics = {
  total: 0,
  active: 0,
  hidden: 0,
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN");
}

function formatSalary(
  min: number | null,
  max: number | null
) {
  if (min == null && max == null) {
    return "Thỏa thuận";
  }

  const format = (value: number) =>
    new Intl.NumberFormat("vi-VN").format(value);

  if (min != null && max != null) {
    return `${format(min)} - ${format(max)}`;
  }

  if (min != null) {
    return `Từ ${format(min)}`;
  }

  return `Đến ${format(max!)}`;
}

function statusLabel(status: JobStatus) {
  return status === "ACTIVE"
    ? "Đang hiển thị"
    : "Đã ẩn";
}

function StatusBadge({
  status,
}: {
  status: JobStatus;
}) {
  return (
    <span
      className={
        status === "ACTIVE"
          ? "inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
          : "inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
      }
    >
      {statusLabel(status)}
    </span>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 py-3">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="whitespace-pre-wrap break-words text-sm text-gray-800">
        {value || "—"}
      </div>
    </div>
  );
}

export default function AdminJobsPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [statistics, setStatistics] =
    useState<Statistics>(emptyStatistics);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    });

  const [searchInput, setSearchInput] =
    useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] =
    useState(true);
  const [error, setError] = useState("");

  const [selectedJob, setSelectedJob] =
    useState<Job | null>(null);
  const [detailLoading, setDetailLoading] =
    useState(false);
  const [actionJobId, setActionJobId] =
    useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const getAdminToken = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return sessionStorage.getItem(
      "jobyfy_admin_token"
    );
  }, []);

  const apiRequest = useCallback(
    async <T,>(
      path: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
      const token = getAdminToken();

      if (!token) {
        throw new Error(
          "Bạn chưa đăng nhập tài khoản Admin."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
          cache: "no-store",
        }
      );

      const result: ApiResponse<T> =
        await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          throw new Error(
            result.error ||
              "Phiên đăng nhập Admin đã hết hạn."
          );
        }

        throw new Error(
          result.error ||
            result.message ||
            "Có lỗi xảy ra khi gọi API."
        );
      }

      return result;
    },
    [getAdminToken]
  );

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status: statusFilter,
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const result = await apiRequest<Job[]>(
        `/admin/jobs?${params.toString()}`
      );

      setJobs(result.data || []);

      setPagination(
        result.pagination || {
          page,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      setJobs([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách tin tuyển dụng."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest, page, search, statusFilter]);

  const loadStatistics = useCallback(
    async () => {
      setStatsLoading(true);

      try {
        const result =
          await apiRequest<Statistics>(
            "/admin/jobs/stats"
          );

        setStatistics(
          result.data || emptyStatistics
        );
      } catch (err) {
        console.error(
          "Không thể tải thống kê:",
          err
        );
      } finally {
        setStatsLoading(false);
      }
    },
    [apiRequest]
  );

  useEffect(() => {
    const token = getAdminToken();

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    void loadJobs();
  }, [getAdminToken, loadJobs, router]);

  useEffect(() => {
    if (!getAdminToken()) return;

    void loadStatistics();
  }, [getAdminToken, loadStatistics]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => {
      setNotice("");
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const handleSearch = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleStatusChange = (
    value: StatusFilter
  ) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleViewDetail = async (id: number) => {
    setDetailLoading(true);
    setSelectedJob(null);
    setError("");

    try {
      const result = await apiRequest<Job>(
        `/admin/jobs/${id}`
      );

      if (!result.data) {
        throw new Error(
          "Không tìm thấy thông tin tin tuyển dụng."
        );
      }

      setSelectedJob(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết tin tuyển dụng."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleChangeStatus = async (
    job: Job
  ) => {
    const nextStatus: JobStatus =
      job.status === "ACTIVE"
        ? "HIDDEN"
        : "ACTIVE";

    const action =
      nextStatus === "HIDDEN"
        ? "ẩn"
        : "khôi phục";

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${action} tin "${job.nameJob || `#${job.id}`}" không?`
    );

    if (!confirmed) return;

    setActionJobId(job.id);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest<Job>(
        `/admin/jobs/${job.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      setNotice(
        result.message ||
          `${
            nextStatus === "HIDDEN"
              ? "Ẩn"
              : "Khôi phục"
          } tin tuyển dụng thành công.`
      );

      if (result.data) {
        setSelectedJob((current) =>
          current?.id === job.id
            ? result.data!
            : current
        );
      }

      await Promise.all([
        loadJobs(),
        loadStatistics(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật trạng thái tin."
      );
    } finally {
      setActionJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              Quản lý tin tuyển dụng
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Theo dõi, tìm kiếm và quản lý các tin tuyển dụng trên JobHub.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void Promise.all([
                loadJobs(),
                loadStatistics(),
              ]);
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Làm mới dữ liệu
          </button>
        </div>

        {/* STATISTICS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Tổng số tin tuyển dụng
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {statsLoading
                ? "..."
                : statistics.total.toLocaleString(
                    "vi-VN"
                  )}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Tin đang hiển thị
            </p>
            <p className="mt-3 text-3xl font-bold text-green-600">
              {statsLoading
                ? "..."
                : statistics.active.toLocaleString(
                    "vi-VN"
                  )}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Tin đã ẩn
            </p>
            <p className="mt-3 text-3xl font-bold text-red-600">
              {statsLoading
                ? "..."
                : statistics.hidden.toLocaleString(
                    "vi-VN"
                  )}
            </p>
          </div>
        </div>

        {/* SEARCH AND FILTER */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <form
              onSubmit={handleSearch}
              className="flex flex-1 flex-col gap-2 sm:flex-row"
            >
              <input
                type="text"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Tìm theo tên công việc hoặc ID..."
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Tìm kiếm
              </button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label
                htmlFor="job-status-filter"
                className="text-sm font-medium text-gray-600"
              >
                Trạng thái
              </label>

              <select
                id="job-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  handleStatusChange(
                    event.target.value as StatusFilter
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="ALL">
                  Tất cả trạng thái
                </option>
                <option value="ACTIVE">
                  Đang hiển thị
                </option>
                <option value="HIDDEN">
                  Đã ẩn
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* NOTICE */}
        {notice && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* JOB TABLE */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-semibold">
              Danh sách tin tuyển dụng
            </h2>

            <span className="text-sm text-gray-500">
              {pagination.total.toLocaleString(
                "vi-VN"
              )}{" "}
              tin
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">
                    ID
                  </th>
                  <th className="px-5 py-4">
                    Tên công việc
                  </th>
                  <th className="px-5 py-4">
                    ID công ty
                  </th>
                  <th className="px-5 py-4">
                    Mức lương
                  </th>
                  <th className="px-5 py-4">
                    Ngày đăng
                  </th>
                  <th className="px-5 py-4">
                    Trạng thái
                  </th>
                  <th className="px-5 py-4 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-gray-500"
                    >
                      Đang tải danh sách tin tuyển dụng...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-gray-500"
                    >
                      Không tìm thấy tin tuyển dụng phù hợp.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-semibold text-gray-700">
                        #{job.id}
                      </td>

                      <td className="px-5 py-4">
                        <div className="max-w-[280px] truncate font-semibold text-gray-900">
                          {job.nameJob ||
                            "Chưa có tiêu đề"}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {job.typeWork ||
                            "Chưa có hình thức làm việc"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {job.idCompany != null
                          ? `#${job.idCompany}`
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatSalary(
                          job.salaryMin,
                          job.salaryMax
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(
                          job.createdAt
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={job.status}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleViewDetail(
                                job.id
                              )
                            }
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Chi tiết
                          </button>

                          <button
                            type="button"
                            disabled={
                              actionJobId === job.id
                            }
                            onClick={() =>
                              void handleChangeStatus(
                                job
                              )
                            }
                            className={
                              job.status === "ACTIVE"
                                ? "rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                : "rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-600 hover:bg-green-50 disabled:opacity-50"
                            }
                          >
                            {actionJobId === job.id
                              ? "Đang xử lý..."
                              : job.status === "ACTIVE"
                              ? "Ẩn tin"
                              : "Khôi phục"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
            <div className="text-sm text-gray-500">
              {pagination.total === 0
                ? "Không có dữ liệu"
                : `Hiển thị ${
                    (page - 1) * PAGE_SIZE + 1
                  } - ${Math.min(
                    page * PAGE_SIZE,
                    pagination.total
                  )} trong ${pagination.total} tin`}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  loading || page <= 1
                }
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1)
                  )
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
              >
                Trước
              </button>

              <span className="px-2 text-sm font-medium text-gray-600">
                Trang {page} /{" "}
                {Math.max(
                  1,
                  pagination.totalPages
                )}
              </span>

              <button
                type="button"
                disabled={
                  loading ||
                  page >=
                    pagination.totalPages
                }
                onClick={() =>
                  setPage((current) =>
                    current + 1
                  )
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {(selectedJob || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedJob(null);
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Chi tiết tin tuyển dụng
                </h2>

                {selectedJob && (
                  <p className="mt-1 text-sm text-gray-500">
                    Mã tin: #{selectedJob.id}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedJob(null)
                }
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4">
              {detailLoading ? (
                <div className="py-12 text-center text-gray-500">
                  Đang tải chi tiết...
                </div>
              ) : selectedJob ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedJob.nameJob ||
                        "Chưa có tiêu đề"}
                    </h3>

                    <StatusBadge
                      status={
                        selectedJob.status
                      }
                    />
                  </div>

                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <DetailField
                      label="ID công ty"
                      value={
                        selectedJob.idCompany != null
                          ? `#${selectedJob.idCompany}`
                          : "—"
                      }
                    />

                    <DetailField
                      label="ID ngành nghề"
                      value={
                        selectedJob.idField != null
                          ? `#${selectedJob.idField}`
                          : "—"
                      }
                    />

                    <DetailField
                      label="ID tỉnh/thành phố"
                      value={
                        selectedJob.idProvince != null
                          ? `#${selectedJob.idProvince}`
                          : "—"
                      }
                    />

                    <DetailField
                      label="Mức lương"
                      value={formatSalary(
                        selectedJob.salaryMin,
                        selectedJob.salaryMax
                      )}
                    />

                    <DetailField
                      label="Hình thức làm việc"
                      value={selectedJob.typeWork}
                    />

                    <DetailField
                      label="Kinh nghiệm"
                      value={selectedJob.experience}
                    />

                    <DetailField
                      label="Học vấn"
                      value={selectedJob.education}
                    />

                    <DetailField
                      label="Giới tính"
                      value={selectedJob.sex}
                    />

                    <DetailField
                      label="Ngày đăng"
                      value={formatDate(
                        selectedJob.createdAt
                      )}
                    />

                    <DetailField
                      label="Ngày ẩn"
                      value={formatDate(
                        selectedJob.deletedAt
                      )}
                    />
                  </div>

                  <DetailField
                    label="Mô tả công việc"
                    value={selectedJob.desc}
                  />

                  <DetailField
                    label="Yêu cầu ứng viên"
                    value={selectedJob.request}
                  />

                  <DetailField
                    label="Thông tin khác"
                    value={selectedJob.other}
                  />
                </>
              ) : null}
            </div>

            {selectedJob && (
              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedJob(null)
                  }
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  disabled={
                    actionJobId ===
                    selectedJob.id
                  }
                  onClick={() =>
                    void handleChangeStatus(
                      selectedJob
                    )
                  }
                  className={
                    selectedJob.status === "ACTIVE"
                      ? "rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      : "rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  }
                >
                  {actionJobId ===
                  selectedJob.id
                    ? "Đang xử lý..."
                    : selectedJob.status ===
                      "ACTIVE"
                    ? "Ẩn tin tuyển dụng"
                    : "Khôi phục tin"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
