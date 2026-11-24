
"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, ShieldCheck } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // ============================================
  // PAGE TITLE
  // ============================================

  const getPageTitle = () => {
    if (pathname.startsWith("/admin/users")) {
      return "Quản lý ứng viên";
    }

    if (pathname.startsWith("/admin/companies")) {
      return "Quản lý nhà tuyển dụng";
    }

    if (pathname.startsWith("/admin/jobs")) {
      return "Quản lý tin tuyển dụng";
    }

    if (pathname.startsWith("/admin/dashboard")) {
      return "Tổng quan hệ thống";
    }

    if (pathname.startsWith("/admin/payments")) {
      return "Quản lý thanh toán";
    }

    return "Quản trị hệ thống";
  };

  const pageTitle = getPageTitle();

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* SIDEBAR */}
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* MAIN CONTENT */}
      <div className="lg:pl-64">
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
          <div className="flex items-center gap-4">
            {/* MOBILE MENU */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Mở menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* PAGE TITLE */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {pageTitle}
              </h2>

              <p className="text-xs text-slate-500">
                Quản trị nền tảng tuyển dụng JobHub
              </p>
            </div>
          </div>

          {/* HEADER RIGHT */}
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-slate-500" />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
              <ShieldCheck className="h-5 w-5 text-violet-600" />
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
