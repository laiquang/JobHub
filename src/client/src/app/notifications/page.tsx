
"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";

import { useSocket } from "@/contexts/SocketContext";

import {
  Bell,
  Loader2,
  Trash2,
  Eye,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCheck,
} from "lucide-react";

type NotificationFilter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { socket, isConnected, connectionError } = useSocket();

  const [page, setPage] = useState(1);

  const [filter, setFilter] =
    useState<NotificationFilter>("all");

  // Lấy danh sách thông báo từ backend
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useNotifications({
    page,
    limit: 10,
    isRead:
      filter === "all"
        ? undefined
        : filter === "read",
  });

  // Lấy số lượng thông báo chưa đọc
  const { data: unreadCount = 0 } = useUnreadCount();

  // Các mutation
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const notifications =
    notificationsData?.notifications || [];

  const totalPages =
    notificationsData?.totalPages || 1;

  const totalNotifications =
    notificationsData?.total || 0;

  // Đánh dấu một thông báo đã đọc
  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Xóa thông báo
  const handleDelete = (id: number) => {
    deleteNotificationMutation.mutate(id);
  };

  // Thay đổi bộ lọc
  const handleFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newFilter =
      event.target.value as NotificationFilter;

    setFilter(newFilter);
    setPage(1);
  };

  // Màu sắc theo loại thông báo
  const getStatusColor = (type: string): string => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800";

      case "error":
        return "bg-red-100 text-red-800";

      case "warning":
        return "bg-yellow-100 text-yellow-800";

      case "job_application":
        return "bg-blue-100 text-blue-800";

      case "job_status_update":
        return "bg-purple-100 text-purple-800";

      case "new_job_match":
        return "bg-indigo-100 text-indigo-800";

      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Tên hiển thị của từng loại thông báo
  const getNotificationTypeLabel = (
    type: string
  ): string => {
    switch (type) {
      case "success":
        return "Thành công";

      case "error":
        return "Lỗi";

      case "warning":
        return "Cảnh báo";

      case "job_application":
        return "Ứng tuyển";

      case "job_status_update":
        return "Trạng thái tin";

      case "new_job_match":
        return "Việc làm phù hợp";

      default:
        return type;
    }
  };

  // Định dạng thời gian
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Không rõ thời gian";
    }

    const now = new Date();

    const diffInMinutes = Math.max(
      0,
      Math.floor(
        (now.getTime() - date.getTime()) /
          (1000 * 60)
      )
    );

    if (diffInMinutes < 1) {
      return "Vừa xong";
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes} phút trước`;
    }

    const diffInHours = Math.floor(
      diffInMinutes / 60
    );

    if (diffInHours < 24) {
      return `${diffInHours} giờ trước`;
    }

    const diffInDays = Math.floor(
      diffInHours / 24
    );

    if (diffInDays === 1) {
      return "1 ngày trước";
    }

    if (diffInDays < 7) {
      return `${diffInDays} ngày trước`;
    }

    if (diffInDays < 30) {
      return `${Math.floor(
        diffInDays / 7
      )} tuần trước`;
    }

    if (diffInDays < 365) {
      return `${Math.floor(
        diffInDays / 30
      )} tháng trước`;
    }

    return `${Math.floor(
      diffInDays / 365
    )} năm trước`;
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Tiêu đề */}
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Bell className="h-8 w-8 text-indigo-600" />
            Thông báo
          </h1>

          <p className="mt-2 text-gray-600">
            Quản lý và xem tất cả thông báo của bạn
          </p>
        </div>

        {/* Trạng thái Socket.IO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-green-600" />
                  <span>Kết nối Real-time</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span>Mất kết nối Real-time</span>
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    isConnected
                      ? "default"
                      : "destructive"
                  }
                >
                  {isConnected
                    ? "Đã kết nối"
                    : "Mất kết nối"}
                </Badge>

                {socket?.id && (
                  <span className="text-sm text-gray-600">
                    Socket ID:{" "}
                    {socket.id.substring(0, 8)}...
                  </span>
                )}
              </div>

              {connectionError && (
                <p className="text-sm text-red-600">
                  Lỗi: {connectionError}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bộ lọc và thao tác */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="notification-filter"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Lọc thông báo
                  </label>

                  <select
                    id="notification-filter"
                    value={filter}
                    onChange={handleFilterChange}
                    className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="all">
                      Tất cả
                    </option>

                    <option value="unread">
                      Chưa đọc
                    </option>

                    <option value="read">
                      Đã đọc
                    </option>
                  </select>
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-indigo-600">
                    {unreadCount}
                  </span>{" "}
                  chưa đọc
                  <span className="mx-2">•</span>
                  {totalNotifications} tổng
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refetch();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  Làm mới
                </Button>

                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={
                      markAllAsReadMutation.isPending
                    }
                  >
                    {markAllAsReadMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="mr-2 h-4 w-4" />
                    )}

                    Đánh dấu tất cả đã đọc
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danh sách thông báo */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="mr-3 h-6 w-6 animate-spin text-indigo-600" />

                <span className="text-gray-600">
                  Đang tải thông báo...
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="mx-auto mb-4 h-12 w-12 text-gray-400" />

                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Không có thông báo
                </h3>

                <p className="text-gray-600">
                  {filter === "unread"
                    ? "Bạn không có thông báo chưa đọc nào"
                    : filter === "read"
                    ? "Bạn không có thông báo đã đọc nào"
                    : "Bạn chưa có thông báo nào"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      !notification.isRead
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {notification.title}
                          </h4>

                          <Badge
                            className={getStatusColor(
                              notification.type
                            )}
                            variant="secondary"
                          >
                            {getNotificationTypeLabel(
                              notification.type
                            )}
                          </Badge>

                          {!notification.isRead && (
                            <Badge
                              variant="default"
                              className="bg-blue-600"
                            >
                              Mới
                            </Badge>
                          )}
                        </div>

                        <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                          {notification.content}
                        </p>

                        <p className="text-xs text-gray-500">
                          {formatTime(
                            notification.createdAt
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Đánh dấu đã đọc"
                            aria-label="Đánh dấu đã đọc"
                            onClick={() =>
                              handleMarkAsRead(
                                notification.id
                              )
                            }
                            disabled={
                              markAsReadMutation.isPending
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Xóa thông báo"
                          aria-label="Xóa thông báo"
                          onClick={() =>
                            handleDelete(
                              notification.id
                            )
                          }
                          disabled={
                            deleteNotificationMutation.isPending
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setPage((prev) =>
                  Math.max(1, prev - 1)
                )
              }
              disabled={page === 1 || isLoading}
            >
              Trước
            </Button>

            <span className="px-3 py-2 text-sm text-gray-600">
              Trang{" "}
              <strong>{page}</strong> /{" "}
              <strong>{totalPages}</strong>
            </span>

            <Button
              variant="outline"
              onClick={() =>
                setPage((prev) =>
                  Math.min(
                    totalPages,
                    prev + 1
                  )
                )
              }
              disabled={
                page === totalPages || isLoading
              }
            >
              Sau
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
