
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { NavBar } from "@/components/NavBar";
import { MainContent } from "@/components/MainContent";
import {
  Facebook,
  Twitter,
  Music,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Tất cả trang Admin dùng layout riêng.
  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="px-8 lg:px-16">
      {/* Navbar dành cho User và Company */}
      <NavBar />

      {/* Nội dung trang */}
      <MainContent>{children}</MainContent>

      {/* Footer JobHub */}
      <footer className="bg-muted py-12 -mx-8 lg:-mx-16">
        <div className="container mx-auto px-12 lg:px-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Thông tin thương hiệu */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Image
                  src="/logo.png"
                  alt="JobHub Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <span className="text-2xl font-bold text-primary">
                  JobHub
                </span>
              </div>

              <p className="text-muted-foreground">
                Kết nối tài năng với cơ hội. Tìm kiếm công
                việc mơ ước của bạn.
              </p>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <a
                    href="https://facebook.com/jobhub"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook JobHub"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <a
                    href="https://twitter.com/jobhub"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter JobHub"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <a
                    href="https://tiktok.com/@jobhub"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok JobHub"
                  >
                    <Music className="h-5 w-5" />
                  </a>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <a
                    href="mailto:contact@jobhub.vn"
                    aria-label="Email JobHub"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Dành cho ứng viên */}
            <div>
              <h3 className="mb-4 font-semibold text-foreground">
                Dành cho ứng viên
              </h3>

              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Tìm việc làm
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Công ty
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Cẩm nang nghề nghiệp
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Công cụ tính lương
                  </a>
                </li>
              </ul>
            </div>

            {/* Dành cho nhà tuyển dụng */}
            <div>
              <h3 className="mb-4 font-semibold text-foreground">
                Dành cho nhà tuyển dụng
              </h3>

              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Đăng tin tuyển dụng
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Tìm hồ sơ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Báo cáo thị trường
                  </a>
                </li>
              </ul>
            </div>

            {/* Liên hệ */}
            <div>
              <h3 className="mb-4 font-semibold text-foreground">
                Liên hệ
              </h3>

              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-sm">
                    Hà Nội, Việt Nam
                  </span>
                </li>

                <li className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-sm">
                    +84 987 654 321
                  </span>
                </li>

                <li className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-sm">
                    info@jobhub.vn
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center text-muted-foreground">
            <p>
              &copy; 2026 JobHub. Nền tảng kết nối ứng viên
              và nhà tuyển dụng. Lại Văn Quang
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
