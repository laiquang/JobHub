import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu - JobHub",
  description: "Đặt lại mật khẩu tài khoản ứng viên JobHub",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
