
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

import {
  Building2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";

import { apiClient } from "@/services/api";
import { UserAvatar } from "@/components/UserAvatar";

// =====================================================
// TYPES
// =====================================================

interface Conversation {
  id: number;
  idApplication: number;
  companyName: string;
  companyAvatar?: string | null;
  applicantName?: string;
  jobName: string;
  lastMessage?: string | null;
  unreadCount?: number | string;
  updatedAt?: string;
}

interface Message {
  id: number;
  idConversation: number;
  senderType: "user" | "company";
  senderId: number;
  content: string;
  isRead: boolean | number;
  createdAt: string;
}

// =====================================================
// HELPERS
// =====================================================

function extractArray<T>(
  response: any,
  key: string
): T[] {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

// =====================================================
// COMPONENT
// =====================================================

export default function UserMessagesPage() {
  const searchParams = useSearchParams();

  const requestedConversationId =
    searchParams.get("conversationId");

  // =====================================================
  // STATE
  // =====================================================

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [draft, setDraft] = useState("");

  const [loading, setLoading] = useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  // =====================================================
  // REFS
  // =====================================================

  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedIdRef = useRef<number | null>(
    null
  );

  const loadingMessagesRef = useRef(false);

  const markingReadRef = useRef<Set<number>>(
    new Set()
  );

  const messagesRequestRef = useRef(0);

  // =====================================================
  // ĐỒNG BỘ SELECTED ID
  // =====================================================

  const selectConversation = useCallback(
    (conversationId: number | null) => {
      selectedIdRef.current = conversationId;

      // Hủy hiệu lực kết quả request cũ
      messagesRequestRef.current += 1;

      setSelectedId(conversationId);
    },
    []
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // =====================================================
  // ĐÁNH DẤU TIN NHẮN ĐÃ ĐỌC
  // =====================================================

  const markConversationAsRead = useCallback(
    async (conversationId: number) => {
      // Tránh gửi nhiều PATCH cùng lúc
      if (
        markingReadRef.current.has(conversationId)
      ) {
        return;
      }

      markingReadRef.current.add(
        conversationId
      );

      try {
        await apiClient.patch(
          `/conversations/${conversationId}/read`
        );

        // Chỉ cập nhật UI nếu vẫn đang mở hội thoại
        if (
          selectedIdRef.current === conversationId
        ) {
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    unreadCount: 0,
                  }
                : conversation
            )
          );
        }
      } catch (err) {
        console.error(
          "Không thể đánh dấu tin nhắn đã đọc:",
          err
        );
      } finally {
        markingReadRef.current.delete(
          conversationId
        );
      }
    },
    []
  );

  // =====================================================
  // LẤY DANH SÁCH CUỘC HỘI THOẠI
  // =====================================================

  const loadConversations = useCallback(
    async () => {
      try {
        const response = await apiClient.get(
          "/conversations"
        );

        const items = extractArray<Conversation>(
          response,
          "conversations"
        );

        setConversations(items);

        setSelectedId((current) => {
          const requested = Number(
            requestedConversationId
          );

          let nextId: number | null = null;

          if (
            requestedConversationId &&
            Number.isSafeInteger(requested) &&
            requested > 0 &&
            items.some(
              (item) => item.id === requested
            )
          ) {
            nextId = requested;
          } else if (
            current !== null &&
            items.some(
              (item) => item.id === current
            )
          ) {
            nextId = current;
          } else {
            nextId = items[0]?.id ?? null;
          }

          selectedIdRef.current = nextId;

          return nextId;
        });

        setError("");
      } catch (err) {
        console.error(err);

        setError(
          "Không thể tải danh sách cuộc hội thoại."
        );
      } finally {
        setLoading(false);
      }
    },
    [requestedConversationId]
  );

  // =====================================================
  // LẤY DANH SÁCH TIN NHẮN
  // =====================================================

  const loadMessages = useCallback(
    async (conversationId: number) => {
      const requestId =
        ++messagesRequestRef.current;

      try {
        const response = await apiClient.get(
          `/conversations/${conversationId}/messages`
        );

        // Bỏ qua kết quả nếu đã chuyển hội thoại
        if (
          selectedIdRef.current !== conversationId ||
          requestId !== messagesRequestRef.current
        ) {
          return;
        }

        const items = extractArray<Message>(
          response,
          "messages"
        );

        setMessages(items);

        setError("");

        // =================================================
        // TỰ ĐỘNG ĐÁNH DẤU ĐÃ ĐỌC
        // =================================================

        const hasUnreadIncomingMessages =
          items.some(
            (message) =>
              message.senderType === "company" &&
              !Boolean(Number(message.isRead))
          );

        if (hasUnreadIncomingMessages) {
          await markConversationAsRead(
            conversationId
          );
        }
      } catch (err) {
        console.error(err);

        if (
          selectedIdRef.current === conversationId
        ) {
          setError(
            "Không thể tải nội dung cuộc hội thoại."
          );
        }
      } finally {
        if (
          selectedIdRef.current === conversationId &&
          requestId === messagesRequestRef.current
        ) {
          setLoadingMessages(false);
        }
      }
    },
    [markConversationAsRead]
  );

  // =====================================================
  // LOAD DANH SÁCH BAN ĐẦU
  // =====================================================

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // =====================================================
  // LOAD TIN NHẮN KHI CHỌN HỘI THOẠI
  // =====================================================

  useEffect(() => {
    if (selectedId === null) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    selectedIdRef.current = selectedId;

    setMessages([]);
    setLoadingMessages(true);

    void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // =====================================================
  // TỰ ĐỘNG CẬP NHẬT MỖI 5 GIÂY
  // =====================================================

  useEffect(() => {
    const interval = window.setInterval(
      async () => {
        if (document.hidden) {
          return;
        }

        await loadConversations();

        const currentId =
          selectedIdRef.current;

        if (currentId !== null) {
          await loadMessages(currentId);
        }
      },
      5000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadConversations, loadMessages]);

  // =====================================================
  // TỰ ĐỘNG CUỘN XUỐNG TIN NHẮN MỚI NHẤT
  // =====================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  // =====================================================
  // CHỌN CUỘC HỘI THOẠI
  // =====================================================

  const handleSelectConversation = (
    conversationId: number
  ) => {
    if (selectedIdRef.current === conversationId) {
      return;
    }

    selectConversation(conversationId);

    setMessages([]);
    setDraft("");
    setError("");
  };

  // =====================================================
  // GỬI TIN NHẮN
  // =====================================================

  const handleSend = async () => {
    const content = draft.trim();

    if (
      !content ||
      selectedId === null ||
      sending
    ) {
      return;
    }

    const conversationId = selectedId;

    try {
      setSending(true);
      setError("");

      await apiClient.post(
        `/conversations/${conversationId}/messages`,
        { content }
      );

      setDraft("");

      await Promise.all([
        loadMessages(conversationId),
        loadConversations(),
      ]);
    } catch (err) {
      console.error(err);

      setError(
        "Không thể gửi tin nhắn. Vui lòng thử lại."
      );
    } finally {
      setSending(false);
    }
  };

  // =====================================================
  // CUỘC HỘI THOẠI ĐANG CHỌN
  // =====================================================

  const selectedConversation =
    conversations.find(
      (item) => item.id === selectedId
    );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ==============================================
            TIÊU ĐỀ
        ============================================== */}

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-7 w-7 text-primary" />

              <h1 className="text-3xl font-bold text-gray-900">
                Chat
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Trao đổi với nhà tuyển dụng về các
              công việc bạn đã ứng tuyển
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await loadConversations();

              const currentId =
                selectedIdRef.current;

              if (currentId !== null) {
                await loadMessages(currentId);
              }
            }}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            <RefreshCw size={17} />
            Làm mới
          </button>
        </div>

        {/* THÔNG BÁO LỖI */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ==============================================
            KHUNG CHAT
        ============================================== */}

        <div className="grid h-[650px] overflow-hidden rounded-2xl border bg-white shadow-sm md:grid-cols-[350px_minmax(0,1fr)]">

          {/* ============================================
              DANH SÁCH CÔNG TY
          ============================================ */}

          <aside className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
            <div className="border-b px-5 py-5">
              <h2 className="font-semibold text-gray-900">
                Nhà tuyển dụng
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {conversations.length} cuộc hội thoại
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-500">
                  Chưa có cuộc hội thoại nào.
                </div>
              ) : (
                conversations.map(
                  (conversation) => {
                    const isSelected =
                      conversation.id === selectedId;

                    const unread = Number(
                      conversation.unreadCount || 0
                    );

                    return (
                      <button
                        type="button"
                        key={conversation.id}
                        onClick={() =>
                          handleSelectConversation(
                            conversation.id
                          )
                        }
                        className={`flex w-full items-start gap-3 border-b px-4 py-4 text-left transition ${
                          isSelected
                            ? "bg-purple-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <UserAvatar
                          user={{
                            name:
                              conversation.companyName ||
                              "Công ty",
                            avatarPic:
                              conversation.companyAvatar ||
                              undefined,
                          }}
                          size="md"
                          className="h-12 w-12 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate font-semibold text-gray-900">
                              {conversation.companyName}
                            </h3>

                            {unread > 0 && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                                {unread > 99
                                  ? "99+"
                                  : unread}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-xs font-medium text-primary">
                            {conversation.jobName}
                          </p>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {conversation.lastMessage ||
                              "Chưa có tin nhắn"}
                          </p>

                          <p className="mt-2 text-xs text-gray-400">
                            {formatTime(
                              conversation.updatedAt
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )
              )}
            </div>
          </aside>

          {/* ============================================
              NỘI DUNG CHAT
          ============================================ */}

          <section className="flex min-h-0 min-w-0 flex-col">
            {selectedConversation ? (
              <>
                {/* HEADER */}
                <div className="flex items-center gap-3 border-b px-5 py-4">
                  <UserAvatar
                    user={{
                      name:
                        selectedConversation.companyName ||
                        "Công ty",
                      avatarPic:
                        selectedConversation.companyAvatar ||
                        undefined,
                    }}
                    size="md"
                    className="h-12 w-12"
                  />

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-gray-900">
                      {selectedConversation.companyName}
                    </h2>

                    <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
                      <Building2 size={13} />

                      {selectedConversation.jobName}
                    </p>
                  </div>
                </div>

                {/* ======================================
                    DANH SÁCH TIN NHẮN
                ====================================== */}

                <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-5 py-6">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />

                      <p className="text-sm text-gray-500">
                        Chưa có tin nhắn trong cuộc hội thoại này.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isMine =
                          message.senderType === "user";

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isMine
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                                isMine
                                  ? "bg-primary text-white"
                                  : "border bg-white text-gray-800"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm">
                                {message.content}
                              </p>

                              <p
                                className={`mt-2 text-right text-[11px] ${
                                  isMine
                                    ? "text-white/75"
                                    : "text-gray-400"
                                }`}
                              >
                                {formatTime(
                                  message.createdAt
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>

                {/* ======================================
                    GỬI TIN NHẮN
                ====================================== */}

                <div className="border-t bg-white p-4">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={draft}
                      onChange={(event) =>
                        setDraft(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={2}
                      maxLength={5000}
                      placeholder="Nhập nội dung tin nhắn..."
                      className="min-h-[76px] flex-1 resize-none rounded-xl border px-4 py-3 text-sm outline-none focus:border-primary"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        void handleSend()
                      }
                      disabled={
                        sending || !draft.trim()
                      }
                      className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                      ) : (
                        <Send size={18} />
                      )}

                      Gửi
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    Enter để gửi, Shift + Enter để xuống dòng
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-gray-300" />

                <h2 className="font-semibold text-gray-700">
                  Chọn một cuộc hội thoại
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Chọn công ty ở danh sách bên trái để
                  xem và trả lời tin nhắn.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
