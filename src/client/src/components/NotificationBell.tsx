
"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Bell,
  X,
  Loader2,
  Mail,
  MessageSquare,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useRealtimeNotifications,
  type Notification,
} from "@/hooks/useNotifications";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";

// =====================================================
// TYPES
// =====================================================

interface NotificationBellProps {
  className?: string;
}

interface MessageConversation {
  id: number;
  applicantName?: string;
  companyName?: string;
  jobName?: string;
  lastMessage?: string | null;
  unreadCount?: number | string | null;
  updatedAt?: string;
}

// =====================================================
// HELPER: ĐỌC DANH SÁCH HỘI THOẠI
// =====================================================

function extractConversations(
  responseData: any
): MessageConversation[] {
  const payload = responseData?.data ?? responseData;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.conversations)) {
    return payload.conversations;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

// =====================================================
// HELPER: HIỂN THỊ SỐ THÔNG BÁO
// =====================================================

function NotificationCount({
  count,
}: {
  count: number;
}) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// =====================================================
// COMPONENT
// =====================================================

export function NotificationBell({
  className,
}: NotificationBellProps) {
  const router = useRouter();

  const {
    isAuthenticated,
    userType,
    user,
    company,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  // =====================================================
  // API THÔNG BÁO HỆ THỐNG
  // =====================================================

  const {
    data: notificationsData,
    isLoading,
    error,
  } = useNotifications({
    page: 1,
    limit: 20,
  });

  const { data: unreadCount = 0 } =
    useUnreadCount();

  const markAsReadMutation =
    useMarkAsRead();

  const markAllAsReadMutation =
    useMarkAllAsRead();

  const deleteNotificationMutation =
    useDeleteNotification();

  // Giữ nguyên realtime thông báo hiện tại
  useRealtimeNotifications();

  // =====================================================
  // STATE TIN NHẮN
  // =====================================================

  const [conversations, setConversations] =
    useState<MessageConversation[]>([]);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const accountId =
    userType === "company"
      ? company?.id
      : user?.id;

  // =====================================================
  // LẤY DANH SÁCH CUỘC HỘI THOẠI
  // =====================================================

  const loadConversations = useCallback(
    async () => {
      if (!isAuthenticated || !accountId) {
        setConversations([]);
        return;
      }

      try {
        const response = await apiClient.get(
          "/conversations"
        );

        const result = extractConversations(
          response.data
        );

        setConversations(result);
      } catch (error) {
        console.error(
          "Không thể tải thông báo tin nhắn:",
          error
        );
      }
    },
    [isAuthenticated, accountId, userType]
  );

  // =====================================================
  // CẬP NHẬT TIN NHẮN ĐỊNH KỲ
  // =====================================================

  useEffect(() => {
    if (!isAuthenticated || !accountId) {
      setConversations([]);
      return;
    }

    void loadConversations();

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadConversations();
      }
    }, 5000);

    const handleFocus = () => {
      void loadConversations();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadConversations();
      }
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    isAuthenticated,
    accountId,
    loadConversations,
  ]);

  // =====================================================
  // TÍNH SỐ TIN NHẮN CHƯA ĐỌC
  // =====================================================

  const unreadMessageConversations =
    conversations
      .filter(
        (conversation) =>
          Number(conversation.unreadCount ?? 0) > 0
      )
      .sort((a, b) => {
        const dateA = new Date(
          a.updatedAt || 0
        ).getTime();

        const dateB = new Date(
          b.updatedAt || 0
        ).getTime();

        return dateB - dateA;
      });

  const unreadMessageCount =
    unreadMessageConversations.reduce(
      (total, conversation) =>
        total +
        Math.max(
          0,
          Number(conversation.unreadCount ?? 0) || 0
        ),
      0
    );

  const systemUnreadCount =
    Number(unreadCount) || 0;

  const totalUnreadCount =
    systemUnreadCount + unreadMessageCount;

  const notifications =
    notificationsData?.notifications || [];

  // =====================================================
  // THAO TÁC THÔNG BÁO HỆ THỐNG
  // =====================================================

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleRemoveNotification = (
    id: number
  ) => {
    deleteNotificationMutation.mutate(id);
  };

  // =====================================================
  // MỞ CUỘC HỘI THOẠI
  // =====================================================

  const handleOpenConversation = (
    conversationId: number
  ) => {
    const destination =
      userType === "company"
        ? "/company/messages"
        : "/user/messages";

    setIsOpen(false);

    router.push(
      `${destination}?conversationId=${conversationId}`
    );
  };

  // =====================================================
  // FORMAT THỜI GIAN
  // =====================================================

  const formatTime = (
    dateString?: string
  ) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "";
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

  // =====================================================
  // ICON THÔNG BÁO HỆ THỐNG
  // =====================================================

  const getNotificationIcon = (
    type: Notification["type"]
  ) => {
    switch (type) {
      case "success":
        return "✅";

      case "warning":
        return "⚠️";

      case "error":
        return "❌";

      case "job_application":
        return "💼";

      case "job_status_update":
        return "📋";

      case "new_job_match":
        return "🎯";

      default:
        return "📢";
    }
  };

  // =====================================================
  // TÊN NGƯỜI GỬI
  // =====================================================

  const getSenderName = (
    conversation: MessageConversation
  ) => {
    if (userType === "company") {
      return (
        conversation.applicantName ||
        "Ứng viên"
      );
    }

    return (
      conversation.companyName ||
      "Nhà tuyển dụng"
    );
  };

  // =====================================================
  // CHƯA ĐĂNG NHẬP
  // =====================================================

  if (!isAuthenticated) {
    return null;
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      {/* ======================================
          CHUÔNG THÔNG BÁO
      ====================================== */}

      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Thông báo"
          className={cn(
            "relative hover:bg-primary/10",
            className
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
          ) : (
            <Bell className="h-5 w-5 text-gray-600" />
          )}

          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {totalUnreadCount > 9
                ? "9+"
                : totalUnreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      {/* ======================================
          DROPDOWN
      ====================================== */}

      <DropdownMenuContent
        className="w-80"
        align="end"
        forceMount
      >
        {/* HEADER */}
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Thông báo</span>

          {systemUnreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-primary hover:text-primary/80"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                handleMarkAllAsRead();
              }}
              disabled={
                markAllAsReadMutation.isPending
              }
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* ======================================
            TIN NHẮN MỚI
        ====================================== */}

        {unreadMessageConversations.length > 0 && (
          <>
            <div className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />

                <span className="text-xs font-semibold text-gray-700">
                  Tin nhắn mới
                </span>
              </div>

              <NotificationCount
                count={unreadMessageCount}
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {unreadMessageConversations.map(
                (conversation) => (
                  <DropdownMenuItem
                    key={`message-${conversation.id}`}
                    className="flex flex-col items-start p-3 cursor-pointer bg-primary/5 hover:bg-primary/10"
                    onSelect={() =>
                      handleOpenConversation(
                        conversation.id
                      )
                    }
                  >
                    <div className="flex items-start gap-2 w-full">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {getSenderName(
                              conversation
                            )}
                          </p>

                          <NotificationCount
                            count={Number(
                              conversation.unreadCount ??
                                0
                            )}
                          />
                        </div>

                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          {conversation.jobName ||
                            "Trao đổi tuyển dụng"}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                          {conversation.lastMessage ||
                            "Bạn có tin nhắn mới"}
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatTime(
                            conversation.updatedAt
                          )}
                        </p>
                      </div>

                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                    </div>
                  </DropdownMenuItem>
                )
              )}
            </div>

            <DropdownMenuSeparator />
          </>
        )}

        {/* ======================================
            THÔNG BÁO HỆ THỐNG
        ====================================== */}

        <div className="px-3 py-2">
          <span className="text-xs font-semibold text-gray-700">
            Thông báo hệ thống
          </span>
        </div>

        {isLoading ? (
          <div className="p-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />

            <p className="text-sm text-muted-foreground mt-2">
              Đang tải thông báo...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600 text-sm">
            Có lỗi khi tải thông báo
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {unreadMessageConversations.length === 0
              ? "Không có thông báo nào"
              : "Không có thông báo hệ thống"}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(
              (notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start p-3 cursor-pointer group",
                    !notification.isRead &&
                      "bg-primary/5"
                  )}
                  onSelect={() =>
                    handleMarkAsRead(
                      notification.id
                    )
                  }
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start space-x-2 flex-1">
                      <span className="text-lg">
                        {getNotificationIcon(
                          notification.type
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>

                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Xóa thông báo"
                            className="h-auto p-1 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();

                              handleRemoveNotification(
                                notification.id
                              );
                            }}
                            disabled={
                              deleteNotificationMutation.isPending
                            }
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                          {notification.content}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(
                            notification.createdAt
                          )}
                        </p>
                      </div>
                    </div>

                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </DropdownMenuItem>
              )
            )}
          </div>
        )}

        <DropdownMenuSeparator />

        {/* ======================================
            XEM TẤT CẢ
        ====================================== */}

        <DropdownMenuItem
          className="justify-center text-primary hover:text-primary/80 cursor-pointer"
          onSelect={() => {
            setIsOpen(false);

            router.push(
              userType === "company"
                ? "/company/messages"
                : "/user/messages"
            );
          }}
        >
          <Mail className="w-4 h-4 mr-2" />
          Đi đến đoạn chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
