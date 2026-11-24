import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập nhà tuyển dụng - JobHub",
  description: "Đăng nhập tài khoản nhà tuyển dụng trên JobHub để đăng tin tuyển dụng và tìm kiếm ứng viên tài năng",
};

export default function EmployerLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
