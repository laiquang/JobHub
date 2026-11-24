import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu công ty - JobHub",
  description: "Đặt lại mật khẩu tài khoản nhà tuyển dụng JobHub",
};

export default function EmployerResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
