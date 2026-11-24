
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Search,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Globe,
  UserRound,
  MapPin,
  Users,
  FileText,
} from "lucide-react";

type CompanyStatus = "ACTIVE" | "LOCKED";
type StatusFilter = "ALL" | CompanyStatus;

interface Company {
  id: number;
  nameCompany: string | null;
  nameAdmin: string | null;
  email: string | null;
  phone: string | null;
  avatarPic: string | null;
  idProvince: number | null;
  intro?: string | null;
  scale: string | null;
  web: string | null;
  status: CompanyStatus;
  created_at: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  pagination?: Pagination;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const TOKEN_KEY = "jobyfy_admin_token";

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không hợp lệ";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    sessionStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(TOKEN_KEY)
  );
}

function getErrorMessage(
  result: ApiResponse<unknown>,
  fallback: string
) {
  return result.message || result.error || fallback;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedCompany, setSelectedCompany] =
    useState<Company | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [confirmCompany, setConfirmCompany] =
    useState<Company | null>(null);

  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // TÌM KIẾM CÓ DEBOUNCE
  // ==========================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ==========================================
  // TẢI DANH SÁCH NHÀ TUYỂN DỤNG
  // ==========================================

  const fetchCompanies = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (!token) {
          throw new Error(
            "Không tìm thấy phiên đăng nhập Admin. Vui lòng đăng nhập lại."
          );
        }

        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          search,
          status,
        });

        const response = await fetch(
          `${API_URL}/admin/companies?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
            signal,
          }
        );

        const result: ApiResponse<Company[]> =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            getErrorMessage(
              result,
              "Không thể tải danh sách nhà tuyển dụng."
            )
          );
        }

        if (!Array.isArray(result.data)) {
          throw new Error(
            "Dữ liệu danh sách nhà tuyển dụng không hợp lệ."
          );
        }

        if (signal?.aborted) return;

        setCompanies(result.data);

        setPagination(
          result.pagination || {
            page,
            limit: 10,
            total: result.data.length,
            totalPages: 1,
          }
        );
      } catch (err) {
        if (signal?.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi không xác định."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, search, status]
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchCompanies(controller.signal);

    return () => controller.abort();
  }, [fetchCompanies, refreshKey]);

  // ==========================================
  // XEM CHI TIẾT NHÀ TUYỂN DỤNG
  // ==========================================

  const viewCompany = async (company: Company) => {
    setSelectedCompany(company);
    setDetailLoading(true);
    setDetailError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      const response = await fetch(
        `${API_URL}/admin/companies/${company.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result: ApiResponse<Company> =
        await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          getErrorMessage(
            result,
            "Không thể tải thông tin nhà tuyển dụng."
          )
        );
      }

      setSelectedCompany(result.data);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Không thể tải thông tin nhà tuyển dụng."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // ==========================================
  // KHÓA / MỞ KHÓA NHÀ TUYỂN DỤNG
  // ==========================================

  const updateCompanyStatus = async () => {
    if (!confirmCompany || updating) return;

    const nextStatus: CompanyStatus =
      confirmCompany.status === "ACTIVE"
        ? "LOCKED"
        : "ACTIVE";

    try {
      setUpdating(true);
      setActionError("");
      setSuccessMessage("");

      const token = getToken();

      if (!token) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      const response = await fetch(
        `${API_URL}/admin/companies/${confirmCompany.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const result: ApiResponse<{
        id: number;
        status: CompanyStatus;
      }> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          getErrorMessage(
            result,
            "Không thể cập nhật trạng thái tài khoản."
          )
        );
      }

      setCompanies((previous) =>
        previous.map((company) =>
          company.id === confirmCompany.id
            ? { ...company, status: nextStatus }
            : company
        )
      );

      setSelectedCompany((previous) =>
        previous?.id === confirmCompany.id
          ? { ...previous, status: nextStatus }
          : previous
      );

      setSuccessMessage(
        nextStatus === "LOCKED"
          ? "Đã khóa tài khoản nhà tuyển dụng thành công."
          : "Đã mở khóa tài khoản nhà tuyển dụng thành công."
      );

      setConfirmCompany(null);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Cập nhật trạng thái thất bại."
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 p-1 sm:p-3">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <Building2 className="h-7 w-7 text-violet-600" />
            Quản lý nhà tuyển dụng
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Quản lý tài khoản công ty và nhà tuyển dụng trên nền tảng JobHub.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Làm mới
        </button>
      </div>

      {/* THÔNG BÁO */}

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* BỘ LỌC */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Tìm theo tên công ty, email hoặc người đại diện..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </div>
      </div>

      {/* BẢNG NHÀ TUYỂN DỤNG */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Danh sách nhà tuyển dụng
          </h2>

          <span className="text-sm text-slate-500">
            Tổng: {pagination.total.toLocaleString("vi-VN")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-4 font-semibold">
                  ID
                </th>

                <th className="px-5 py-4 font-semibold">
                  Công ty
                </th>

                <th className="px-5 py-4 font-semibold">
                  Người đại diện
                </th>

                <th className="px-5 py-4 font-semibold">
                  Số điện thoại
                </th>

                <th className="px-5 py-4 font-semibold">
                  Ngày đăng ký
                </th>

                <th className="px-5 py-4 font-semibold">
                  Trạng thái
                </th>

                <th className="px-5 py-4 text-right font-semibold">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-violet-600" />
                    <p className="mt-3 text-slate-500">
                      Đang tải danh sách nhà tuyển dụng...
                    </p>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-slate-500"
                  >
                    Không tìm thấy nhà tuyển dụng phù hợp.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium">
                      #{company.id}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {company.nameCompany ||
                          "Chưa cập nhật"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {company.email ||
                          "Chưa có email"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {company.nameAdmin ||
                        "Chưa cập nhật"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {company.phone ||
                        "Chưa cập nhật"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(company.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          company.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {company.status === "ACTIVE"
                          ? "Hoạt động"
                          : "Đã khóa"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void viewCompany(company)
                          }
                          className="rounded-lg border border-slate-200 p-2 text-blue-600 hover:bg-blue-50"
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết ${
                            company.nameCompany || company.id
                          }`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionError("");
                            setConfirmCompany(company);
                          }}
                          className={`rounded-lg border p-2 ${
                            company.status === "ACTIVE"
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={
                            company.status === "ACTIVE"
                              ? "Khóa tài khoản"
                              : "Mở khóa tài khoản"
                          }
                          aria-label={
                            company.status === "ACTIVE"
                              ? `Khóa ${
                                  company.nameCompany ||
                                  company.id
                                }`
                              : `Mở khóa ${
                                  company.nameCompany ||
                                  company.id
                                }`
                          }
                        >
                          {company.status === "ACTIVE" ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG */}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Trang {pagination.page} /{" "}
            {Math.max(1, pagination.totalPages)}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() =>
                setPage((value) => value - 1)
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </button>

            <button
              type="button"
              disabled={
                loading ||
                pagination.totalPages === 0 ||
                page >= pagination.totalPages
              }
              onClick={() =>
                setPage((value) => value + 1)
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT CÔNG TY */}

      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết nhà tuyển dụng"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Chi tiết nhà tuyển dụng
              </h2>

              <button
                type="button"
                onClick={() => {
                  setSelectedCompany(null);
                  setDetailError("");
                }}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
              </div>
            ) : (
              <div className="space-y-5">
                {detailError && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                  >
                    {detailError}
                  </p>
                )}

                <div className="rounded-xl bg-violet-50 p-5">
                  <p className="text-lg font-bold text-slate-900">
                    {selectedCompany.nameCompany ||
                      "Chưa cập nhật"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Mã nhà tuyển dụng: #
                    {selectedCompany.id}
                  </p>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      {selectedCompany.email ||
                        "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      {selectedCompany.phone ||
                        "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      Người đại diện:{" "}
                      {selectedCompany.nameAdmin ||
                        "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      Mã tỉnh/thành phố:{" "}
                      {selectedCompany.idProvince ??
                        "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      Quy mô:{" "}
                      {selectedCompany.scale ||
                        "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="break-all">
                      Website:{" "}
                      {selectedCompany.web ||
                        "Chưa cập nhật"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      Ngày đăng ký:{" "}
                      {formatDate(
                        selectedCompany.created_at
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      Trạng thái:{" "}
                      {selectedCompany.status === "ACTIVE"
                        ? "Hoạt động"
                        : "Đã khóa"}
                    </span>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 font-semibold text-slate-700">
                      <FileText className="h-4 w-4" />
                      Giới thiệu công ty
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-slate-500">
                      {selectedCompany.intro ||
                        "Chưa cập nhật"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN KHÓA / MỞ KHÓA */}

      {confirmCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Xác nhận cập nhật trạng thái"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {confirmCompany.status === "ACTIVE"
                ? "Xác nhận khóa tài khoản"
                : "Xác nhận mở khóa tài khoản"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bạn có chắc chắn muốn{" "}
              <strong>
                {confirmCompany.status === "ACTIVE"
                  ? "khóa"
                  : "mở khóa"}
              </strong>{" "}
              tài khoản nhà tuyển dụng{" "}
              <strong>
                {confirmCompany.nameCompany ||
                  confirmCompany.email ||
                  `#${confirmCompany.id}`}
              </strong>
              ?
            </p>

            {actionError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600"
              >
                {actionError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={updating}
                onClick={() => {
                  setConfirmCompany(null);
                  setActionError("");
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void updateCompanyStatus()
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmCompany.status === "ACTIVE"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {updating && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {confirmCompany.status === "ACTIVE"
                  ? "Khóa tài khoản"
                  : "Mở khóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
