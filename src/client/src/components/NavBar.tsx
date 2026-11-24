
"use client";

import {
  useEffect,
  useState,
  useCallback,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { showToast } from "@/utils/toast";
import { apiClient } from "@/services/api";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Home,
  MapPin,
  Search,
  Building,
  LogOut,
  User,
  FileText,
  Briefcase,
  Heart,
  Lock,
  ChevronDown,
  Bot,
  LayoutTemplate,
  Files,
  Mail,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

// ==========================================
// TYPES
// ==========================================

type ConversationUnread = {
  id: number;
  unreadCount?: number | string | null;
};

type SubscriptionPlan = "FREE" | "PREMIUM" | null;

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

// ==========================================
// HELPERS
// ==========================================

function extractConversations(
  responseData: any
): ConversationUnread[] {
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

function UnreadBadge({
  count,
}: {
  count: number;
}) {
  if (count <= 0) return null;

  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white"
      aria-label={`${count} tin nhắn chưa đọc`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ==========================================
// NAVIGATION ITEMS
// ==========================================

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Trang chủ",
    icon: Home,
  },
  {
    href: "/fields",
    label: "Ngành nghề/Địa điểm",
    icon: MapPin,
  },
  {
    href: "/search",
    label: "Tìm kiếm",
    icon: Search,
  },
  {
    href: "/companies",
    label: "Công ty",
    icon: Building,
  },
  {
    href: "/cv-evaluation",
    label: "Đánh giá CV với AI",
    icon: Bot,
  },
];

// ==========================================
// COMPONENT
// ==========================================

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ========================================
  // AUTH
  // ========================================

  const {
    user,
    company,
    isAuthenticated,
    logout,
    isLoading,
    userType,
    avatarUpdateTime,
  } = useAuth();

  const currentAccount =
    userType === "company" ? company : user;

  const accountId = currentAccount?.id;

  // ========================================
  // FREE / PREMIUM
  // ========================================

  const [subscriptionPlan, setSubscriptionPlan] =
    useState<SubscriptionPlan>(null);

  const loadSubscription = useCallback(async () => {
    if (
      !mounted ||
      !isAuthenticated ||
      userType !== "company" ||
      !company?.id
    ) {
      setSubscriptionPlan(null);
      return;
    }

    try {
      const response = await apiClient.get(
        "/subscriptions/me"
      );

      const subscription = response.data?.data;

      if (subscription?.code === "PREMIUM") {
        setSubscriptionPlan("PREMIUM");
      } else {
        setSubscriptionPlan("FREE");
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setSubscriptionPlan("FREE");
      } else {
        console.error(
          "Không thể tải thông tin gói đăng ký:",
          error
        );

        setSubscriptionPlan(null);
      }
    }
  }, [
    mounted,
    isAuthenticated,
    userType,
    company?.id,
  ]);

  useEffect(() => {
    if (
      !mounted ||
      !isAuthenticated ||
      userType !== "company" ||
      !company?.id
    ) {
      setSubscriptionPlan(null);
      return;
    }

    void loadSubscription();
  }, [
    mounted,
    isAuthenticated,
    userType,
    company?.id,
    pathname,
    loadSubscription,
  ]);

  // ========================================
  // UNREAD MESSAGES
  // ========================================

  const [unreadMessages, setUnreadMessages] =
    useState(0);

  const loadUnreadMessages = useCallback(async () => {
    if (
      !mounted ||
      !isAuthenticated ||
      !accountId ||
      (userType !== "user" &&
        userType !== "company")
    ) {
      setUnreadMessages(0);
      return;
    }

    try {
      const response = await apiClient.get(
        "/conversations"
      );

      const conversations = extractConversations(
        response.data
      );

      const totalUnread = conversations.reduce(
        (total, conversation) => {
          const count = Number(
            conversation.unreadCount ?? 0
          );

          return (
            total +
            (Number.isFinite(count) && count > 0
              ? count
              : 0)
          );
        },
        0
      );

      setUnreadMessages(totalUnread);
    } catch (error) {
      console.error(
        "Không thể cập nhật số tin nhắn chưa đọc:",
        error
      );
    }
  }, [
    mounted,
    isAuthenticated,
    accountId,
    userType,
  ]);

  useEffect(() => {
    if (
      !mounted ||
      !isAuthenticated ||
      !accountId
    ) {
      setUnreadMessages(0);
      return;
    }

    void loadUnreadMessages();

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadUnreadMessages();
      }
    }, 5000);

    const handleFocus = () => {
      void loadUnreadMessages();

      if (userType === "company") {
        void loadSubscription();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadUnreadMessages();

        if (userType === "company") {
          void loadSubscription();
        }
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
    mounted,
    isAuthenticated,
    accountId,
    userType,
    loadUnreadMessages,
    loadSubscription,
  ]);

  // ========================================
  // CLOSE MOBILE MENU ON ROUTE CHANGE
  // ========================================

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // ========================================
  // CV NAVIGATION
  // ========================================

  const handleCVNavigation = (href: string) => {
    setMobileMenuOpen(false);

    if (!isAuthenticated) {
      showToast.warning(
        "Vui lòng đăng nhập để sử dụng tính năng Tạo CV"
      );

      setTimeout(() => {
        router.push("/login");
      }, 100);

      return;
    }

    if (userType === "company") {
      return;
    }

    router.push(href);
  };

  // ========================================
  // LOGOUT
  // ========================================

  const handleLogout = async () => {
    setUnreadMessages(0);
    setSubscriptionPlan(null);
    setMobileMenuOpen(false);

    await logout();
  };

  // ========================================
  // ACTIVE LINK
  // ========================================

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  // ========================================
  // DESKTOP NAV ITEM
  // ========================================

  const renderDesktopNavItem = (
    item: NavItem
  ) => {
    const active = isLinkActive(item.href);
    const IconComponent = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group flex min-w-0 items-center",
          "justify-center gap-2",
          "rounded-lg px-1 py-2",
          "text-[13px] font-medium",
          "transition-colors",
          "hover:bg-violet-50",
          "hover:text-violet-600",
          active
            ? "font-semibold text-violet-600"
            : "text-slate-600"
        )}
      >
        <IconComponent
          className={cn(
            "h-[17px] w-[17px] shrink-0",
            active
              ? "text-violet-600"
              : "text-slate-500"
          )}
        />

        {item.href === "/fields" ? (
          <span className="text-center leading-[17px]">
            <span className="block whitespace-nowrap">
              Ngành nghề
            </span>

            <span className="block whitespace-nowrap">
              / Địa điểm
            </span>
          </span>
        ) : (
          <span className="whitespace-nowrap">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  // ========================================
  // MOBILE NAV ITEM
  // ========================================

  const renderMobileNavItem = (
    item: NavItem
  ) => {
    const active = isLinkActive(item.href);
    const IconComponent = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3",
          "rounded-xl px-4 py-3",
          "text-sm font-medium",
          "transition-colors",
          active
            ? "bg-violet-50 text-violet-700"
            : "text-slate-700 hover:bg-slate-50"
        )}
      >
        <IconComponent className="h-5 w-5 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  // ========================================
  // UI
  // ========================================

  return (
    <header
      className={cn(
        "sticky top-0 z-50",
        "border-b border-slate-200",
        "bg-white",
        "-mx-8 lg:-mx-16"
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[1800px]",
          "px-4 sm:px-6 lg:px-8 xl:px-10",
          "2xl:px-12"
        )}
      >
        <div
          className={cn(
            "flex min-h-[76px] items-center",
            "justify-between gap-4",
            "xl:gap-6"
          )}
        >
          {/* =========================== */}
          {/* LOGO */}
          {/* =========================== */}

          <Link
            href="/"
            className={cn(
              "flex shrink-0 items-center",
              "gap-2.5",
              "xl:mr-5 2xl:mr-8"
            )}
          >
            <Image
              src="/logo.png"
              alt="JobHub Logo"
              width={38}
              height={38}
              className="h-[38px] w-[38px] object-contain"
            />

            <span
              className={cn(
                "whitespace-nowrap",
                "text-[24px] font-bold",
                "tracking-tight text-primary",
                "xl:text-[26px]"
              )}
            >
              JobHub
            </span>
          </Link>

          {/* =========================== */}
          {/* DESKTOP NAVIGATION */}
          {/* =========================== */}

          <nav
            className={cn(
              "hidden min-w-0 flex-1",
              "items-center justify-evenly",
              "gap-2 xl:gap-3",
              "lg:flex"
            )}
            aria-label="Điều hướng chính"
          >
            {/* TRANG CHỦ */}
            {renderDesktopNavItem(navItems[0])}

            {/* NGÀNH NGHỀ / ĐỊA ĐIỂM */}
            {renderDesktopNavItem(navItems[1])}

            {/* TÌM KIẾM */}
            {renderDesktopNavItem(navItems[2])}

            {/* CÔNG TY */}
            {renderDesktopNavItem(navItems[3])}

            {/* TẠO CV */}
            {mounted && userType !== "company" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "group flex shrink-0 items-center",
                      "justify-center gap-2",
                      "rounded-lg px-1 py-2",
                      "text-[13px] font-medium",
                      "outline-none transition-colors",
                      "hover:bg-violet-50",
                      "hover:text-violet-600",
                      pathname.startsWith("/cv-builder") ||
                        pathname.startsWith("/my-cvs")
                        ? "font-semibold text-violet-600"
                        : "text-slate-600"
                    )}
                  >
                    <FileText className="h-[17px] w-[17px] shrink-0" />

                    <span className="whitespace-nowrap">
                      Tạo CV
                    </span>

                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="w-64"
                >
                  <DropdownMenuItem
                    className="cursor-pointer py-3"
                    onSelect={(event) => {
                      event.preventDefault();
                      handleCVNavigation("/cv-builder");
                    }}
                  >
                    <LayoutTemplate className="mr-3 h-5 w-5 text-primary" />

                    <div className="flex flex-col">
                      <span className="font-medium">
                        Mẫu CV
                      </span>

                      <span className="text-xs font-normal text-muted-foreground">
                        Tạo CV từ mẫu có sẵn
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer py-3"
                    onSelect={(event) => {
                      event.preventDefault();
                      handleCVNavigation("/my-cvs");
                    }}
                  >
                    <Files className="mr-3 h-5 w-5 text-primary" />

                    <div className="flex flex-col">
                      <span className="font-medium">
                        CV của bạn
                      </span>

                      <span className="text-xs font-normal text-muted-foreground">
                        Quản lý CV đã lưu
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* ĐÁNH GIÁ CV AI */}
            {renderDesktopNavItem(navItems[4])}
          </nav>

          {/* =========================== */}
          {/* RIGHT ACTIONS */}
          {/* =========================== */}

          <div
            className={cn(
              "flex shrink-0 items-center",
              "gap-2 xl:gap-3"
            )}
          >
            {/* ADMIN LOGIN */}
            <Link
              href="/admin/login"
              title="Đăng nhập quản trị viên"
              aria-label="Đăng nhập quản trị viên"
              className={cn(
                "hidden h-10 w-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-violet-200",
                "bg-violet-50",
                "text-violet-600",
                "transition-all",
                "hover:border-violet-400",
                "hover:bg-violet-100",
                "hover:text-violet-700",
                "lg:inline-flex"
              )}
            >
              <ShieldCheck className="h-5 w-5" />
            </Link>

            {!mounted ? (
              <div className="h-10 w-[130px]" />
            ) : isAuthenticated && currentAccount ? (
              <>
                {/* NOTIFICATION */}
                <NotificationBell />

                {/* ACCOUNT DROPDOWN */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex h-auto items-center",
                        "gap-2 rounded-xl",
                        "px-2 py-2",
                        "hover:bg-violet-50",
                        "xl:px-3"
                      )}
                    >
                      <UserAvatar
                        user={
                          userType === "company"
                            ? {
                                name:
                                  company?.nameCompany ||
                                  "",
                                avatarPic:
                                  company?.avatarPic,
                              }
                            : user
                        }
                        size="md"
                        showFallbackIcon={false}
                        className="border-2 border-primary/20"
                        forceRefresh={avatarUpdateTime}
                      />

                      <div className="hidden min-w-0 flex-col items-start sm:flex">
                        <span
                          className={cn(
                            "max-w-[100px] truncate",
                            "text-sm font-medium",
                            "text-slate-700",
                            "2xl:max-w-[140px]"
                          )}
                        >
                          {userType === "company"
                            ? company?.nameCompany
                            : user?.name}
                        </span>

                        {userType === "company" &&
                          subscriptionPlan && (
                            <span
                              className={cn(
                                "text-xs font-medium",
                                subscriptionPlan === "PREMIUM"
                                  ? "text-violet-600"
                                  : "text-gray-500"
                              )}
                            >
                              {subscriptionPlan === "PREMIUM"
                                ? "Premium"
                                : "Free"}
                            </span>
                          )}
                      </div>

                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="w-64"
                    align="end"
                    forceMount
                  >
                    {/* ACCOUNT INFO */}
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userType === "company"
                            ? company?.nameCompany
                            : user?.name}
                        </p>

                        {userType === "company" &&
                          subscriptionPlan && (
                            <p
                              className={cn(
                                "text-xs font-semibold",
                                subscriptionPlan === "PREMIUM"
                                  ? "text-violet-600"
                                  : "text-gray-500"
                              )}
                            >
                              {subscriptionPlan === "PREMIUM"
                                ? "Premium"
                                : "Free"}
                            </p>
                          )}

                        <p className="text-xs leading-none text-muted-foreground">
                          {userType === "company"
                            ? company?.email
                            : user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    {/* PREMIUM */}
                    {userType === "company" && (
                      <>
                        <DropdownMenuItem
                          asChild
                          className="cursor-pointer py-3"
                        >
                          <Link
                            href="/pricing"
                            className="flex w-full items-center"
                          >
                            <Sparkles className="mr-2 h-5 w-5 text-violet-600" />

                            <div className="flex flex-col">
                              <span className="font-medium">
                                {subscriptionPlan === "PREMIUM"
                                  ? "Gia hạn Premium"
                                  : "Nâng cấp gói"}
                              </span>

                              <span className="text-xs font-normal text-muted-foreground">
                                {subscriptionPlan === "PREMIUM"
                                  ? "Gia hạn thêm 30 ngày"
                                  : "Mở khóa các tính năng Premium"}
                              </span>
                            </div>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                      </>
                    )}

                    {/* COMPANY MENU */}
                    {userType === "company" ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/company/profile"
                            className="flex items-center"
                          >
                            <User className="mr-2 h-4 w-4" />
                            <span>Trang cá nhân</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/company/profile?tab=thong-tin"
                            className="flex items-center"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Thông tin cá nhân</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/company/applications"
                            className="flex items-center"
                          >
                            <Briefcase className="mr-2 h-4 w-4" />
                            <span>Đơn ứng tuyển</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/company/messages"
                            className="flex w-full items-center"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            <span>Chat</span>
                            <UnreadBadge
                              count={unreadMessages}
                            />
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/company/jobs/create"
                            className="flex items-center"
                          >
                            <Building className="mr-2 h-4 w-4" />
                            <span>Đăng ứng tuyển</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/company/profile?tab=doi-mat-khau"
                            className="flex items-center"
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            <span>Đổi mật khẩu</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        {/* USER MENU */}

                        <DropdownMenuItem asChild>
                          <Link
                            href="/user/profile"
                            className="flex items-center"
                          >
                            <User className="mr-2 h-4 w-4" />
                            <span>Trang cá nhân</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/user/profile?tab=thong-tin"
                            className="flex items-center"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Thông tin cá nhân</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/user/profile?tab=ung-tuyen"
                            className="flex items-center"
                          >
                            <Briefcase className="mr-2 h-4 w-4" />
                            <span>Ứng tuyển</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/user/messages"
                            className="flex w-full items-center"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            <span>Chat</span>
                            <UnreadBadge
                              count={unreadMessages}
                            />
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/user/profile?tab=viec-lam"
                            className="flex items-center"
                          >
                            <Heart className="mr-2 h-4 w-4" />
                            <span>Việc làm đã lưu</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link
                            href="/user/profile?tab=theo-doi"
                            className="flex items-center"
                          >
                            <Building className="mr-2 h-4 w-4" />
                            <span>Theo dõi</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />

                    {/* LOGOUT */}
                    <DropdownMenuItem
                      className="text-red-600 focus:bg-red-50 focus:text-red-600"
                      onClick={handleLogout}
                      disabled={isLoading}
                    >
                      <LogOut className="mr-2 h-4 w-4" />

                      <span>
                        {isLoading
                          ? "Đang đăng xuất..."
                          : "Đăng xuất"}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* GUEST LOGIN */}
                <Button
                  variant="ghost"
                  className={cn(
                    "hidden whitespace-nowrap",
                    "px-2 font-semibold",
                    "hover:bg-violet-50",
                    "sm:inline-flex"
                  )}
                  asChild
                >
                  <Link href="/login">
                    Đăng nhập
                  </Link>
                </Button>

                {/* EMPLOYER LOGIN */}
                <Button
                  className={cn(
                    "hidden whitespace-nowrap",
                    "bg-primary",
                    "hover:bg-primary/90",
                    "xl:inline-flex"
                  )}
                  asChild
                >
                  <Link href="/employer/login">
                    Nhà tuyển dụng
                  </Link>
                </Button>
              </>
            )}

            {/* MOBILE MENU BUTTON */}
            <button
              type="button"
              aria-label={
                mobileMenuOpen
                  ? "Đóng menu"
                  : "Mở menu"
              }
              aria-expanded={mobileMenuOpen}
              onClick={() =>
                setMobileMenuOpen((prev) => !prev)
              }
              className={cn(
                "inline-flex h-10 w-10",
                "items-center justify-center",
                "rounded-xl border",
                "border-slate-200",
                "text-slate-700",
                "hover:bg-slate-50",
                "lg:hidden"
              )}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* =========================== */}
        {/* MOBILE / TABLET MENU */}
        {/* =========================== */}

        {mobileMenuOpen && (
          <nav
            className={cn(
              "border-t border-slate-100",
              "py-3 lg:hidden"
            )}
            aria-label="Điều hướng di động"
          >
            <div className="grid gap-1">
              {navItems.slice(0, 4).map(
                renderMobileNavItem
              )}

              {/* MOBILE CV MENU */}
              {mounted && userType !== "company" && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleCVNavigation("/cv-builder")
                    }
                    className={cn(
                      "flex items-center gap-3",
                      "rounded-xl px-4 py-3",
                      "text-left text-sm font-medium",
                      "text-slate-700",
                      "hover:bg-slate-50"
                    )}
                  >
                    <LayoutTemplate className="h-5 w-5" />
                    <span>Tạo CV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCVNavigation("/my-cvs")
                    }
                    className={cn(
                      "flex items-center gap-3",
                      "rounded-xl px-4 py-3",
                      "text-left text-sm font-medium",
                      "text-slate-700",
                      "hover:bg-slate-50"
                    )}
                  >
                    <Files className="h-5 w-5" />
                    <span>CV của bạn</span>
                  </button>
                </>
              )}

              {renderMobileNavItem(navItems[4])}

              <div className="my-2 border-t border-slate-100" />

              {/* ADMIN */}
              <Link
                href="/admin/login"
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                className={cn(
                  "flex items-center gap-3",
                  "rounded-xl px-4 py-3",
                  "text-sm font-medium",
                  "text-violet-700",
                  "hover:bg-violet-50"
                )}
              >
                <ShieldCheck className="h-5 w-5" />
                <span>Quản trị hệ thống</span>
              </Link>

              {/* GUEST ACTIONS */}
              {mounted && !isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className={cn(
                      "flex items-center gap-3",
                      "rounded-xl px-4 py-3",
                      "text-sm font-medium",
                      "text-slate-700",
                      "hover:bg-slate-50",
                      "sm:hidden"
                    )}
                  >
                    <User className="h-5 w-5" />
                    <span>Đăng nhập</span>
                  </Link>

                  <Link
                    href="/employer/login"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className={cn(
                      "flex items-center gap-3",
                      "rounded-xl px-4 py-3",
                      "text-sm font-medium",
                      "text-violet-700",
                      "hover:bg-violet-50",
                      "xl:hidden"
                    )}
                  >
                    <Building className="h-5 w-5" />
                    <span>Nhà tuyển dụng</span>
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
