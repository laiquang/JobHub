"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  BriefcaseBusiness,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { showToast } from "@/utils/toast";

import {
  cvBuilderService,
  type UserCV,
} from "@/services/cvBuilderService";

export default function MyCVsPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    userType,
  } = useAuth();

  const [cvs, setCVs] = useState<UserCV[]>([]);
  const [isLoadingCVs, setIsLoadingCVs] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // =====================================================
  // LOAD DANH SÁCH CV
  // =====================================================

  const loadCVs = useCallback(async () => {
    try {
      setIsLoadingCVs(true);

      const data = await cvBuilderService.getMyCVs();

      setCVs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi tải danh sách CV:", error);

      showToast.error(
        "Không thể tải danh sách CV. Vui lòng thử lại."
      );

      setCVs([]);
    } finally {
      setIsLoadingCVs(false);
    }
  }, []);

  // =====================================================
  // AUTH
  // =====================================================

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      showToast.warning(
        "Vui lòng đăng nhập để sử dụng tính năng Tạo CV"
      );

      router.push("/login");

      return;
    }

    if (userType !== "user") {
      showToast.warning(
        "Chức năng Tạo CV chỉ dành cho tài khoản ứng viên"
      );

      router.push("/");

      return;
    }

    loadCVs();
  }, [
    isAuthenticated,
    isAuthLoading,
    userType,
    router,
    loadCVs,
  ]);

  // =====================================================
  // TẠO CV MỚI
  // =====================================================

  const handleCreateCV = () => {
    router.push("/cv-builder");
  };

  // =====================================================
  // CHỈNH SỬA CV
  // =====================================================

  const handleEditCV = (cv: UserCV) => {
    router.push(
      `/cv-builder/editor?id=${cv.id}&template=${cv.templateKey}`
    );
  };

  // =====================================================
  // XÓA CV
  // =====================================================

  const handleDeleteCV = async (cv: UserCV) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa "${cv.title}" không?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(cv.id);

      await cvBuilderService.deleteCV(cv.id);

      setCVs((prev) =>
        prev.filter((item) => item.id !== cv.id)
      );

      showToast.success("Xóa CV thành công");
    } catch (error) {
      console.error("Lỗi xóa CV:", error);

      showToast.error(
        "Không thể xóa CV. Vui lòng thử lại."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "Chưa cập nhật";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Chưa cập nhật";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // =====================================================
  // TEMPLATE NAME
  // =====================================================

  const getTemplateName = (templateKey: string) => {
    switch (templateKey) {
      case "modern":
        return "Hiện đại";

      case "professional":
        return "Chuyên nghiệp";

      case "minimal":
        return "Đơn giản";

      default:
        return "CV";
    }
  };

  // =====================================================
  // LOADING AUTH
  // =====================================================

  if (isAuthLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />

          <span className="text-sm">
            Đang kiểm tra tài khoản...
          </span>
        </div>
      </div>
    );
  }

  // Không render nội dung trong lúc redirect
  if (!isAuthenticated || userType !== "user") {
    return null;
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-violet-600" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  CV của bạn
                </h1>

                <p className="text-gray-500 mt-1">
                  Quản lý các CV bạn đã tạo và lưu
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCreateCV}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo CV mới
          </Button>
        </div>

        {/* ================================================= */}
        {/* LOADING CVS */}
        {/* ================================================= */}

        {isLoadingCVs && (
          <div className="min-h-[400px] bg-white border border-gray-200 rounded-2xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />

              <p className="text-sm text-gray-500">
                Đang tải CV của bạn...
              </p>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* KHÔNG CÓ CV */}
        {/* ================================================= */}

        {!isLoadingCVs && cvs.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl min-h-[450px] flex items-center justify-center px-6">
            <div className="max-w-md text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-violet-50 flex items-center justify-center mb-5">
                <FileText className="w-10 h-10 text-violet-500" />
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Bạn chưa có CV nào
              </h2>

              <p className="text-gray-500 mb-6">
                Hãy chọn một mẫu CV và bắt đầu tạo CV của riêng bạn.
              </p>

              <Button
                type="button"
                onClick={handleCreateCV}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo CV ngay
              </Button>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* DANH SÁCH CV */}
        {/* ================================================= */}

        {!isLoadingCVs && cvs.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                Bạn có{" "}
                <span className="font-semibold text-gray-900">
                  {cvs.length}
                </span>{" "}
                CV đã lưu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {cvs.map((cv) => {
                const fullName =
                  cv.cvData?.personalInfo?.fullName?.trim();

                const jobTitle =
                  cv.cvData?.personalInfo?.jobTitle?.trim();

                const avatar =
                  cv.cvData?.personalInfo?.avatar;

                // Màu đã lưu của CV
                // CV cũ chưa có settings -> tím mặc định
                const cvColor =
                  cv.settings?.customColor ||
                  "#7c3aed";

                return (
                  <div
                    key={cv.id}
                    className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-lg transition-all duration-200"
                  >

                    {/* ======================================= */}
                    {/* CV PREVIEW */}
                    {/* ======================================= */}

                    <div className="relative h-64 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200 overflow-hidden">

                      <div className="absolute inset-5 bg-white border border-gray-200 shadow-sm rounded-md overflow-hidden">

                        {/* ================================================= */}
                        {/* MODERN TEMPLATE */}
                        {/* ================================================= */}

                        {cv.templateKey === "modern" && (
                          <div className="h-full flex">

                            {/* LEFT SIDEBAR */}

                            <div
                              className="w-[35%] h-full px-3 py-4 text-white"
                              style={{
                                backgroundColor: cvColor,
                              }}
                            >
                              <div className="flex justify-center mb-3">
                                {avatar ? (
                                  <img
                                    src={avatar}
                                    alt="Avatar"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/70 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                      {fullName
                                        ? fullName.charAt(0).toUpperCase()
                                        : "CV"}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <div className="h-1.5 w-10 bg-white/90 rounded mb-2" />
                                  <div className="h-1 w-full bg-white/40 rounded mb-1" />
                                  <div className="h-1 w-4/5 bg-white/40 rounded mb-1" />
                                  <div className="h-1 w-3/4 bg-white/40 rounded" />
                                </div>

                                <div>
                                  <div className="h-1.5 w-12 bg-white/90 rounded mb-2" />
                                  <div className="h-1 w-full bg-white/40 rounded mb-1" />
                                  <div className="h-1 w-3/4 bg-white/40 rounded mb-1" />
                                  <div className="h-1 w-5/6 bg-white/40 rounded" />
                                </div>

                                <div>
                                  <div className="h-1.5 w-8 bg-white/90 rounded mb-2" />
                                  <div className="h-1 w-4/5 bg-white/40 rounded mb-1" />
                                  <div className="h-1 w-full bg-white/40 rounded" />
                                </div>
                              </div>
                            </div>

                            {/* RIGHT CONTENT */}

                            <div className="w-[65%] h-full p-4">
                              <div className="mb-4">
                                <div
                                  className="text-sm font-bold truncate"
                                  style={{
                                    color: cvColor,
                                  }}
                                >
                                  {fullName || "Họ và tên"}
                                </div>

                                <div className="text-[9px] text-gray-500 mt-1 truncate">
                                  {jobTitle || "Vị trí ứng tuyển"}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <div
                                    className="h-2 w-16 rounded mb-2"
                                    style={{
                                      backgroundColor: cvColor,
                                    }}
                                  />

                                  <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-4/5 bg-gray-200 rounded" />
                                </div>

                                <div>
                                  <div
                                    className="h-2 w-20 rounded mb-2"
                                    style={{
                                      backgroundColor: cvColor,
                                    }}
                                  />

                                  <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-5/6 bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-full bg-gray-200 rounded" />
                                </div>

                                <div>
                                  <div
                                    className="h-2 w-14 rounded mb-2"
                                    style={{
                                      backgroundColor: cvColor,
                                    }}
                                  />

                                  <div className="h-1.5 w-4/5 bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-full bg-gray-200 rounded" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ================================================= */}
                        {/* PROFESSIONAL TEMPLATE */}
                        {/* ================================================= */}

                        {cv.templateKey === "professional" && (
                          <div className="h-full bg-white">

                            {/* HEADER */}

                            <div
                              className="h-[78px] px-5 flex items-center gap-3"
                              style={{
                                borderBottom: `4px solid ${cvColor}`,
                              }}
                            >
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt="Avatar"
                                  className="w-12 h-12 rounded-md object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-md flex items-center justify-center text-white font-bold"
                                  style={{
                                    backgroundColor: cvColor,
                                  }}
                                >
                                  {fullName
                                    ? fullName.charAt(0).toUpperCase()
                                    : "CV"}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="text-gray-900 font-bold text-sm truncate">
                                  {fullName || "Họ và tên"}
                                </div>

                                <div
                                  className="text-[9px] font-medium mt-1 truncate"
                                  style={{
                                    color: cvColor,
                                  }}
                                >
                                  {jobTitle || "Vị trí ứng tuyển"}
                                </div>
                              </div>
                            </div>

                            {/* BODY */}

                            <div className="p-4 grid grid-cols-[1fr_34%] gap-4">

                              {/* MAIN */}

                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-1 h-3 rounded"
                                      style={{
                                        backgroundColor: cvColor,
                                      }}
                                    />

                                    <div className="h-2 w-16 bg-gray-700 rounded" />
                                  </div>

                                  <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-4/5 bg-gray-200 rounded" />
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div
                                      className="w-1 h-3 rounded"
                                      style={{
                                        backgroundColor: cvColor,
                                      }}
                                    />

                                    <div className="h-2 w-20 bg-gray-700 rounded" />
                                  </div>

                                  <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-5/6 bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-full bg-gray-200 rounded" />
                                </div>
                              </div>

                              {/* SIDE */}

                              <div className="border-l border-gray-200 pl-3 space-y-4">
                                <div>
                                  <div
                                    className="h-2 w-10 rounded mb-2"
                                    style={{
                                      backgroundColor: cvColor,
                                    }}
                                  />

                                  <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-4/5 bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-full bg-gray-200 rounded" />
                                </div>

                                <div>
                                  <div
                                    className="h-2 w-12 rounded mb-2"
                                    style={{
                                      backgroundColor: cvColor,
                                    }}
                                  />

                                  <div className="h-1.5 w-5/6 bg-gray-200 rounded mb-1" />
                                  <div className="h-1.5 w-full bg-gray-200 rounded" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ================================================= */}
                        {/* MINIMAL TEMPLATE */}
                        {/* ================================================= */}

                        {cv.templateKey === "minimal" && (
                          <div className="h-full bg-white p-5">

                            {/* HEADER */}

                            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                              <div className="min-w-0 pr-4">
                                <div className="text-gray-900 font-bold text-base truncate">
                                  {fullName || "Họ và tên"}
                                </div>

                                <div
                                  className="text-[9px] mt-1 truncate"
                                  style={{
                                    color: cvColor,
                                  }}
                                >
                                  {jobTitle || "Vị trí ứng tuyển"}
                                </div>
                              </div>

                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt="Avatar"
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                  style={{
                                    backgroundColor: cvColor,
                                  }}
                                >
                                  {fullName
                                    ? fullName.charAt(0).toUpperCase()
                                    : "CV"}
                                </div>
                              )}
                            </div>

                            {/* BODY */}

                            <div className="pt-4 space-y-4">

                              {/* GIỚI THIỆU */}

                              <div>
                                <div
                                  className="text-[8px] font-bold uppercase tracking-wider mb-2"
                                  style={{
                                    color: cvColor,
                                  }}
                                >
                                  Giới thiệu
                                </div>

                                <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                <div className="h-1.5 w-4/5 bg-gray-200 rounded" />
                              </div>

                              {/* KINH NGHIỆM */}

                              <div>
                                <div
                                  className="text-[8px] font-bold uppercase tracking-wider mb-2"
                                  style={{
                                    color: cvColor,
                                  }}
                                >
                                  Kinh nghiệm
                                </div>

                                <div className="flex gap-3">
                                  <div
                                    className="w-[2px] rounded-full shrink-0"
                                    style={{
                                      backgroundColor: cvColor,
                                    }}
                                  />

                                  <div className="flex-1">
                                    <div className="h-1.5 w-1/2 bg-gray-300 rounded mb-2" />
                                    <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                    <div className="h-1.5 w-5/6 bg-gray-200 rounded mb-1" />
                                    <div className="h-1.5 w-full bg-gray-200 rounded" />
                                  </div>
                                </div>
                              </div>

                              {/* HỌC VẤN */}

                              <div>
                                <div
                                  className="text-[8px] font-bold uppercase tracking-wider mb-2"
                                  style={{
                                    color: cvColor,
                                  }}
                                >
                                  Học vấn
                                </div>

                                <div className="h-1.5 w-2/3 bg-gray-300 rounded mb-2" />
                                <div className="h-1.5 w-full bg-gray-200 rounded mb-1" />
                                <div className="h-1.5 w-3/4 bg-gray-200 rounded" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ================================================= */}
                        {/* FALLBACK */}
                        {/* ================================================= */}

                        {![
                          "modern",
                          "professional",
                          "minimal",
                        ].includes(cv.templateKey) && (
                          <div className="h-full flex items-center justify-center">
                            <FileText
                              className="w-14 h-14"
                              style={{
                                color: cvColor,
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* ================================================= */}
                      {/* TEMPLATE BADGE */}
                      {/* ================================================= */}

                      <div
                        className="absolute top-3 right-3 bg-white/95 border border-gray-200 shadow-sm rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          color: cvColor,
                        }}
                      >
                        {getTemplateName(cv.templateKey)}
                      </div>
                    </div>

                    {/* ======================================= */}
                    {/* INFORMATION */}
                    {/* ======================================= */}

                    <div className="p-5">
                      <h2
                        className="text-lg font-semibold text-gray-900 truncate"
                        title={cv.title}
                      >
                        {cv.title || "CV chưa đặt tên"}
                      </h2>

                      {jobTitle && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                          <BriefcaseBusiness className="w-4 h-4 shrink-0" />

                          <span className="truncate">
                            {jobTitle}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <CalendarDays className="w-4 h-4 shrink-0" />

                        <span>
                          Cập nhật:{" "}
                          {formatDate(cv.updatedAt)}
                        </span>
                      </div>

                      {/* ===================================== */}
                      {/* ACTIONS */}
                      {/* ===================================== */}

                      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
                        <Button
                          type="button"
                          onClick={() =>
                            handleEditCV(cv)
                          }
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Chỉnh sửa
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            deletingId === cv.id
                          }
                          onClick={() =>
                            handleDeleteCV(cv)
                          }
                          className="border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                          title="Xóa CV"
                        >
                          {deletingId === cv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}