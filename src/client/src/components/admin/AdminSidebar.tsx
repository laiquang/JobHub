
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  BriefcaseBusiness,
  CreditCard,
  Crown,
  Flag,
  ShieldCheck,
  LogOut,
  X,
  Activity,
} from "lucide-react";

type AdminSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

const menuItems = [
  {
    label: "Tổng quan",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Quản lý ứng viên",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Quản lý nhà tuyển dụng",
    href: "/admin/companies",
    icon: Building2,
  },
  {
    label: "Quản lý tin tuyển dụng",
    href: "/admin/jobs",
    icon: BriefcaseBusiness,
  },
  {
    label: "Quản lý thanh toán",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    label: "Quản lý gói dịch vụ",
    href: "/admin/subscriptions",
    icon: Crown,
  },
  {
    label: "Báo cáo & thống kê",
    href: "/admin/reports",
    icon: Flag,
  },
  {
    label: "Lịch sử hoạt động",
    href: "/admin/activity-logs",
    icon: Activity,
  }
];

export default function AdminSidebar({
  open = false,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem("jobyfy_admin_token");
    sessionStorage.removeItem("jobyfy_admin");

    onClose?.();

    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <>
      {/* MOBILE OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* LOGO */}
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-extrabold text-slate-900">
                JobHub
              </h1>

              <p className="text-xs font-semibold tracking-widest text-violet-600">
                ADMIN PANEL
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Quản trị hệ thống
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-50 font-semibold text-violet-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
