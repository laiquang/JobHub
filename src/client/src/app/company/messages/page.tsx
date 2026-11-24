
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  RefreshCw,
  Send,
  UserRound,
  Building2,
  Loader2,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

interface Conversation {
  id: number;
  idApplication: number;
  idUser: number;
  idCompany: number;
  applicantName: string;
  applicantAvatar?: string | null;
  companyName: string;
  jobName: string;
  lastMessage?: string | null;
  unreadCount?: number | string;
  createdAt?: string;
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

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function getAvatarUrl(
  avatar?: string | null
): string | null {
  if (!avatar?.trim()) return null;
  const value = avatar.trim();

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${SERVER_URL}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${SERVER_URL}/${value}`;
  }

  return `${SERVER_URL}/uploads/${value}`;
}

function ApplicantAvatar({
  name,
  avatar,
  size = 48,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = getAvatarUrl(avatar);

  useEffect(() => {
    setFailed(false);
  }, [avatar]);

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-purple-700"
      style={{ width: size, height: size }}
      title={name}
    >
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt={`Ảnh đại diện ${name}`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound size={size * 0.5} />
      )}
    </div>
  );
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Bạn cần đăng nhập tài khoản công ty."
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.error ||
        result?.message ||
        `Yêu cầu thất bại (${response.status})`
    );
  }

  return result?.data ?? result;
}

function extractConversations(
  data: any
): Conversation[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.conversations)) {
    return data.conversations;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

function extractMessages(data: any): Message[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) {
    return data.messages;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
}

export default function CompanyMessagesPage() {
  const searchParams = useSearchParams();

  const conversationIdParam =
    searchParams.get("conversationId") ||
    searchParams.get("conversation");

  const [conversations, setConversations] =
    useState<Conversation[]>([]);
  const [selectedId, setSelectedId] =
    useState<number | null>(null);
  const [messages, setMessages] =
    useState<Message[]>([]);
  const [messageText, setMessageText] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] =
    useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef =
    useRef<HTMLDivElement>(null);
  const selectedIdRef =
    useRef<number | null>(null);

  // Tránh kết quả API cũ ghi đè cuộc hội thoại mới
  const requestIdRef = useRef(0);

  // Tránh gọi PATCH trùng lặp
  const markingReadRef = useRef<Set<number>>(
    new Set()
  );

  const selectedConversation =
    conversations.find(
      (item) => item.id === selectedId
    ) || null;

  const selectConversation = useCallback(
    (id: number | null) => {
      selectedIdRef.current = id;
      requestIdRef.current += 1;
      setSelectedId(id);
    },
    []
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // ==============================================
  // ĐÁNH DẤU TIN NHẮN ĐÃ ĐỌC
  // ==============================================

  const markConversationAsRead = useCallback(
    async (conversationId: number) => {
      if (
        markingReadRef.current.has(conversationId)
      ) {
        return;
      }

      markingReadRef.current.add(conversationId);

      try {
        await apiRequest(
          `/conversations/${conversationId}/read`,
          { method: "PATCH" }
        );

        if (
          selectedIdRef.current === conversationId
        ) {
          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    unreadCount: 0,
                  }
                : conversation
            )
          );

          setMessages((previous) =>
            previous.map((message) =>
              message.senderType === "user"
                ? { ...message, isRead: 1 }
                : message
            )
          );
        }

        // Yêu cầu Navbar và chuông cập nhật badge
        window.dispatchEvent(
          new Event("messages:read")
        );
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

  // ==============================================
  // TẢI DANH SÁCH HỘI THOẠI
  // ==============================================

  const loadConversations = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);

        const data = await apiRequest<any>(
          "/conversations"
        );

        const list = extractConversations(data);

        setConversations(list);
        setError("");

        const requestedId = Number(
          conversationIdParam
        );

        setSelectedId((current) => {
          let nextId: number | null;

          if (
            conversationIdParam &&
            Number.isSafeInteger(requestedId) &&
            requestedId > 0 &&
            list.some(
              (item) => item.id === requestedId
            )
          ) {
            nextId = requestedId;
          } else if (
            current !== null &&
            list.some(
              (item) => item.id === current
            )
          ) {
            nextId = current;
          } else {
            nextId = list[0]?.id ?? null;
          }

          selectedIdRef.current = nextId;
          return nextId;
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách hội thoại."
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [conversationIdParam]
  );

  // ==============================================
  // TẢI TIN NHẮN VÀ ĐÁNH DẤU ĐÃ ĐỌC
  // ==============================================

  const loadMessages = useCallback(
    async (
      conversationId: number,
      showLoading = false
    ) => {
      const requestId = ++requestIdRef.current;

      try {
        if (showLoading) {
          setLoadingMessages(true);
        }

        const data = await apiRequest<any>(
          `/conversations/${conversationId}/messages`
        );

        if (
          selectedIdRef.current !== conversationId ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        const items = extractMessages(data);
        setMessages(items);
        setError("");

        // Công ty chỉ đánh dấu tin nhắn
        // do ứng viên gửi là đã đọc
        const hasUnreadIncoming = items.some(
          (message) =>
            message.senderType === "user" &&
            Number(message.isRead) === 0
        );

        if (hasUnreadIncoming) {
          await markConversationAsRead(
            conversationId
          );
        }
      } catch (err) {
        if (
          selectedIdRef.current === conversationId
        ) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải tin nhắn."
          );
        }
      } finally {
        if (
          showLoading &&
          selectedIdRef.current === conversationId &&
          requestId === requestIdRef.current
        ) {
          setLoadingMessages(false);
        }
      }
    },
    [markConversationAsRead]
  );

  // ==============================================
  // TẢI BAN ĐẦU
  // ==============================================

  useEffect(() => {
    void loadConversations(true);
  }, [loadConversations]);

  // ==============================================
  // KHI CHỌN CUỘC HỘI THOẠI
  // ==============================================

  useEffect(() => {
    selectedIdRef.current = selectedId;

    if (selectedId === null) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setMessages([]);
    setLoadingMessages(true);

    void loadMessages(selectedId, true);
  }, [selectedId, loadMessages]);

  // ==============================================
  // TỰ ĐỘNG CẬP NHẬT MỖI 5 GIÂY
  // ==============================================

  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;

      void loadConversations(false);

      const currentId = selectedIdRef.current;

      if (currentId !== null) {
        void loadMessages(currentId, false);
      }
    };

    const interval = window.setInterval(
      refresh,
      5000
    );

    const handleFocus = () => refresh();

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadConversations, loadMessages]);

  // ==============================================
  // CUỘN XUỐNG TIN NHẮN MỚI
  // ==============================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, selectedId]);

  // ==============================================
  // CHỌN HỘI THOẠI
  // ==============================================

  const handleSelectConversation = (
    id: number
  ) => {
    if (selectedIdRef.current === id) {
      return;
    }

    selectConversation(id);
    setMessageText("");
    setMessages([]);
    setError("");
  };

  // ==============================================
  // GỬI TIN NHẮN
  // ==============================================

  const handleSend = async () => {
    const content = messageText.trim();

    if (
      !content ||
      !selectedId ||
      sending
    ) {
      return;
    }

    const conversationId = selectedId;

    try {
      setSending(true);
      setError("");

      await apiRequest(
        `/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );

      setMessageText("");

      await Promise.all([
        loadMessages(conversationId),
        loadConversations(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể gửi tin nhắn."
      );
    } finally {
      setSending(false);
    }
  };

  // ==============================================
  // LÀM MỚI
  // ==============================================

  const handleRefresh = async () => {
    await loadConversations(true);

    const currentId = selectedIdRef.current;

    if (currentId !== null) {
      await loadMessages(currentId, true);
    }
  };

  // ==============================================
  // GIAO DIỆN
  // ==============================================

  return (
    <div className="min-h-screen bg-[#f8f9fc] px-4 py-6 md:px-8 lg:px-12">
      <div className="mx-auto max-w-[1500px]">

        {/* TIÊU ĐỀ */}
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <MessageSquare
                size={29}
                className="text-purple-600"
              />

              <h1 className="text-3xl font-bold text-slate-900">
                Chat
              </h1>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Trao đổi trực tiếp với các ứng viên trên JobHub
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Làm mới
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* KHUNG HỘP THƯ */}
        <div className="grid h-[calc(100vh-220px)] min-h-[580px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[350px_minmax(0,1fr)]">

          {/* DANH SÁCH HỘI THOẠI */}
          <aside className="flex min-h-0 flex-col border-b border-slate-200 md:border-b-0 md:border-r">
            <div className="border-b border-slate-100 px-5 py-5">
              <h2 className="font-bold text-slate-900">
                Danh sách ứng viên
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {conversations.length} cuộc hội thoại
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2
                    className="animate-spin text-purple-600"
                    size={28}
                  />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <MessageSquare
                    size={36}
                    className="mx-auto mb-3 text-slate-300"
                  />

                  <p className="text-sm text-slate-500">
                    Chưa có cuộc hội thoại nào.
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const isSelected =
                    selectedId === conversation.id;

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
                      className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-5 text-left transition ${
                        isSelected
                          ? "bg-purple-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <ApplicantAvatar
                        name={
                          conversation.applicantName ||
                          "Ứng viên"
                        }
                        avatar={
                          conversation.applicantAvatar
                        }
                        size={50}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-semibold text-slate-900">
                            {conversation.applicantName}
                          </h3>

                          {unread > 0 && (
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-purple-600 px-1.5 text-xs font-bold text-white">
                              {unread > 99
                                ? "99+"
                                : unread}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-xs font-medium text-purple-600">
                          {conversation.jobName}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {conversation.lastMessage ||
                            "Chưa có tin nhắn"}
                        </p>

                        <p className="mt-1.5 text-xs text-slate-400">
                          {formatTime(
                            conversation.updatedAt
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* NỘI DUNG HỘI THOẠI */}
          <section className="flex min-h-0 min-w-0 flex-col">
            {selectedConversation ? (
              <>
                {/* HEADER CHAT */}
                <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
                  <ApplicantAvatar
                    name={
                      selectedConversation.applicantName ||
                      "Ứng viên"
                    }
                    avatar={
                      selectedConversation.applicantAvatar
                    }
                    size={52}
                  />

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-slate-900">
                      {selectedConversation.applicantName}
                    </h2>

                    <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <Building2 size={13} />
                      {selectedConversation.jobName}
                    </p>
                  </div>
                </div>

                {/* DANH SÁCH TIN NHẮN */}
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fc] px-4 py-6 md:px-6">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <Loader2
                        size={28}
                        className="animate-spin text-purple-600"
                      />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageSquare
                        size={42}
                        className="mb-3 text-purple-200"
                      />

                      <p className="font-medium text-slate-600">
                        Chưa có tin nhắn
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Hãy gửi lời chào đến ứng viên.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isMine =
                          message.senderType === "company";

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
                              className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm md:max-w-[75%] ${
                                isMine
                                  ? "rounded-br-md bg-purple-600 text-white"
                                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {message.content}
                              </p>

                              <p
                                className={`mt-2 text-right text-[11px] ${
                                  isMine
                                    ? "text-purple-100"
                                    : "text-slate-400"
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

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* NHẬP VÀ GỬI TIN NHẮN */}
                <div className="border-t border-slate-200 bg-white px-4 py-4 md:px-5">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={messageText}
                      onChange={(event) =>
                        setMessageText(
                          event.target.value
                        )
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
                      placeholder="Nhập nội dung thư..."
                      className="min-h-[76px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        void handleSend()
                      }
                      disabled={
                        sending ||
                        !messageText.trim()
                      }
                      className="flex h-14 items-center gap-2 rounded-2xl bg-purple-600 px-6 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2
                          size={19}
                          className="animate-spin"
                        />
                      ) : (
                        <Send size={19} />
                      )}

                      Gửi
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Enter để gửi, Shift + Enter để xuống dòng
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <MessageSquare
                  size={52}
                  className="mb-4 text-purple-200"
                />

                <h2 className="text-lg font-semibold text-slate-700">
                  Chọn một cuộc hội thoại
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Chọn ứng viên ở danh sách bên trái
                  để bắt đầu trao đổi.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
