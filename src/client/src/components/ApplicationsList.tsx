
"use client";

import React, { useState } from "react";

import {
  Building,
  MapPin,
  Clock,
  Trash2,
  Loader2,
  Briefcase,
  MessageSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  useApplications,
  useCancelApplication,
  type Application,
} from "@/hooks/useApplications";

import { formatSalary, formatTimeAgo } from "@/utils";
import { apiClient } from "@/services/api";
import { useRouter } from "next/navigation";
import Image from "next/image";

// =====================================================
// INTERFACE
// =====================================================

interface ApplicationsListProps {
  page?: number;
  limit?: number;
}

// =====================================================
// MAPPING TRẠNG THÁI ỨNG TUYỂN
// =====================================================

const getStatusInfo = (status: number) => {
  switch (status) {
    case 1:
      return {
        label: "Chưa xem",
        variant: "secondary" as const,
        color: "bg-gray-100 text-gray-800",
      };

    case 2:
      return {
        label: "Đã xem",
        variant: "default" as const,
        color: "bg-blue-100 text-blue-800",
      };

    case 3:
      return {
        label: "Phỏng vấn",
        variant: "default" as const,
        color: "bg-yellow-100 text-yellow-800",
      };

    case 4:
      return {
        label: "Từ chối",
        variant: "destructive" as const,
        color: "bg-red-100 text-red-800",
      };

    case 5:
      return {
        label: "Chấp nhận",
        variant: "default" as const,
        color: "bg-green-100 text-green-800",
      };

    default:
      return {
        label: "Chưa xác định",
        variant: "secondary" as const,
        color: "bg-gray-100 text-gray-800",
      };
  }
};

// =====================================================
// COMPONENT
// =====================================================

export default function ApplicationsList({
  page = 1,
  limit = 10,
}: ApplicationsListProps) {
  const router = useRouter();

  // Đơn ứng tuyển đang được chọn để hủy
  const [
    cancelingApplication,
    setCancelingApplication,
  ] = useState<Application | null>(null);

  // ID đơn ứng tuyển đang mở cuộc hội thoại
  const [
    openingConversationId,
    setOpeningConversationId,
  ] = useState<number | null>(null);

  // Thông báo lỗi khi mở hộp thư
  const [messageError, setMessageError] = useState("");

  // =====================================================
  // HOOKS
  // =====================================================

  const { data, isLoading, error } = useApplications({
    page,
    limit,
  });

  const cancelApplicationMutation =
    useCancelApplication();

  // =====================================================
  // XEM CHI TIẾT CÔNG VIỆC
  // =====================================================

  const handleViewJob = (idJob: number) => {
    router.push(`/jobs/${idJob}`);
  };

  // =====================================================
  // XEM THÔNG TIN CÔNG TY
  // =====================================================

  const handleViewCompany = (idCompany: number) => {
    router.push(`/companies/${idCompany}`);
  };

  // =====================================================
  // HỦY ỨNG TUYỂN
  // =====================================================

  const handleCancelApplication = async (
    application: Application
  ) => {
    setCancelingApplication(application);
  };

  const confirmCancelApplication = async () => {
    if (!cancelingApplication) return;

    await cancelApplicationMutation.mutateAsync(
      cancelingApplication.idJob
    );

    setCancelingApplication(null);
  };

  // =====================================================
  // MỞ CUỘC HỘI THOẠI VỚI NHÀ TUYỂN DỤNG
  // =====================================================

  const handleOpenConversation = async (
    application: Application
  ) => {
    if (openingConversationId !== null) return;

    try {
      setOpeningConversationId(application.id);
      setMessageError("");

      // Tạo cuộc hội thoại nếu chưa tồn tại.
      // Nếu đã tồn tại, Backend trả về hội thoại cũ.
      const response = await apiClient.post(
        "/conversations",
        {
          idApplication: application.id,
        }
      );

      // Hỗ trợ các cấu trúc phản hồi thông dụng
      const responseData = response.data;

      const conversation =
        responseData?.data?.conversation ??
        responseData?.data ??
        responseData?.conversation ??
        responseData;

      const conversationId =
        conversation?.id ??
        conversation?.conversationId ??
        conversation?.idConversation;

      const numericId = Number(conversationId);

      if (
        !Number.isSafeInteger(numericId) ||
        numericId <= 0
      ) {
        throw new Error(
          "API không trả về ID cuộc hội thoại hợp lệ."
        );
      }

      // Chuyển ứng viên đến đúng cuộc hội thoại
      router.push(
        `/user/messages?conversationId=${numericId}`
      );
    } catch (error) {
      console.error(
        "Lỗi khi mở cuộc hội thoại:",
        error
      );

      setMessageError(
        "Không thể mở cuộc hội thoại. Vui lòng thử lại!"
      );
    } finally {
      setOpeningConversationId(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />

          <span className="text-gray-600">
            Đang tải danh sách ứng tuyển...
          </span>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">
          Có lỗi xảy ra khi tải danh sách ứng tuyển
        </p>
      </div>
    );
  }

  // =====================================================
  // DANH SÁCH TRỐNG
  // =====================================================

  if (!data || data.data.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />

        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Chưa có ứng tuyển nào
        </h3>

        <p className="text-gray-600 mb-6">
          Bạn chưa ứng tuyển vào công việc nào.
          Hãy khám phá các cơ hội việc làm mới!
        </p>

        <Button
          onClick={() => router.push("/search")}
          className="bg-primary hover:bg-primary/90"
        >
          Tìm việc làm
        </Button>
      </div>
    );
  }

  // =====================================================
  // GIAO DIỆN DANH SÁCH ỨNG TUYỂN
  // =====================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Danh sách ứng tuyển ({data.total})
        </h2>
      </div>

      {/* THÔNG BÁO LỖI HỘP THƯ */}
      {messageError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {messageError}
        </div>
      )}

      {/* APPLICATIONS LIST */}
      <div className="space-y-4">

        {data.data.map((application) => {
          const statusInfo = getStatusInfo(
            application.status
          );

          const isOpening =
            openingConversationId === application.id;

          return (
            <Card
              key={application.id}
              className="bg-card border border-border hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() =>
                handleViewJob(application.idJob)
              }
            >

              {/* ======================================
                  THÔNG TIN CÔNG VIỆC
              ====================================== */}
              <CardHeader className="flex flex-row items-start justify-between">

                <div className="flex items-start space-x-3">

                  {/* LOGO CÔNG TY */}
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative"
                    onClick={(e) => {
                      e.stopPropagation();

                      handleViewCompany(
                        application.idCompany
                      );
                    }}
                  >
                    {application.avatarPic ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Building className="w-6 h-6 text-gray-400" />
                        </div>

                        <Image
                          src={
                            application.avatarPic.startsWith(
                              "http"
                            )
                              ? application.avatarPic
                              : `/api/uploads/${application.avatarPic}`
                          }
                          unoptimized
                          alt={`${application.nameCompany} logo`}
                          width={48}
                          height={48}
                          className="object-cover relative z-10"
                          onError={(e) => {
                            const target =
                              e.target as HTMLImageElement;

                            target.style.display = "none";
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <Building className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* TÊN CÔNG VIỆC VÀ CÔNG TY */}
                  <div>
                    <CardTitle className="text-lg">
                      {application.nameJob}
                    </CardTitle>

                    <CardDescription>
                      {application.nameCompany}
                    </CardDescription>
                  </div>
                </div>

                {/* TRẠNG THÁI ỨNG TUYỂN */}
                <div
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>

              {/* ======================================
                  NỘI DUNG ĐƠN ỨNG TUYỂN
              ====================================== */}
              <CardContent className="space-y-2">

                {/* ĐỊA ĐIỂM - LƯƠNG - LOẠI VIỆC */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">

                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {application.province}
                  </span>

                  <span>
                    {formatSalary(
                      application.salaryMin,
                      application.salaryMax
                    )}
                  </span>

                  <span>
                    {application.typeWork}
                  </span>
                </div>

                {/* NGÀNH NGHỀ - THỜI GIAN */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">

                  <span className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {application.nameFields}
                  </span>

                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />

                    Ứng tuyển{" "}
                    {formatTimeAgo(
                      application.createdAt
                    )}
                  </span>
                </div>

                {/* ======================================
                    CÁC NÚT HÀNH ĐỘNG
                ====================================== */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">

                  {/* NÚT TRAO ĐỔI VỚI NHÀ TUYỂN DỤNG */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      openingConversationId !== null
                    }
                    onClick={(e) => {
                      e.stopPropagation();

                      void handleOpenConversation(
                        application
                      );
                    }}
                    className="flex items-center gap-2 border-gray-200 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900"
                  >
                    {isOpening ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}

                    {isOpening
                      ? "Đang mở đoạn chat..."
                      : "Trao đổi với nhà tuyển dụng"}
                  </Button>

                  {/* NÚT HỦY ỨNG TUYỂN */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();

                      void handleCancelApplication(
                        application
                      );
                    }}
                    disabled={
                      cancelApplicationMutation.isPending ||
                      application.status !== 1
                    }
                    className={`flex items-center gap-1 ${
                      application.status !== 1
                        ? "text-gray-400 hover:text-gray-400 hover:bg-gray-50 border-gray-200 cursor-not-allowed"
                        : "text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    }`}
                    title={
                      application.status !== 1
                        ? "Chỉ có thể hủy ứng tuyển khi chưa được xem"
                        : "Hủy ứng tuyển"
                    }
                  >
                    {cancelApplicationMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}

                    {application.status !== 1
                      ? "Không thể hủy"
                      : "Hủy ứng tuyển"}
                  </Button>

                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ======================================
          THÔNG TIN PHÂN TRANG
      ====================================== */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center pt-4">
          <p className="text-sm text-gray-600">
            Trang {data.page} của {data.totalPages}
            {" "}(Tổng {data.total} ứng tuyển)
          </p>
        </div>
      )}

      {/* ======================================
          HỘP THOẠI XÁC NHẬN HỦY
      ====================================== */}
      <AlertDialog
        open={cancelingApplication !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelingApplication(null);
          }
        }}
      >
        <AlertDialogContent>

          <AlertDialogHeader>
            <AlertDialogTitle>
              Xác nhận hủy ứng tuyển
            </AlertDialogTitle>

            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy ứng tuyển
              cho vị trí{" "}
              <strong>
                "{cancelingApplication?.nameJob}"
              </strong>{" "}
              tại{" "}
              <strong>
                {cancelingApplication?.nameCompany}
              </strong>
              ?

              <br />

              <strong className="text-red-600">
                Hành động này không thể hoàn tác.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>

            <AlertDialogCancel
              disabled={
                cancelApplicationMutation.isPending
              }
            >
              Hủy bỏ
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={confirmCancelApplication}
              disabled={
                cancelApplicationMutation.isPending
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelApplicationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận hủy"
              )}
            </AlertDialogAction>

          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
