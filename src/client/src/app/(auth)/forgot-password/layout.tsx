import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quên mật khẩu - JobHub",
  description: "Khôi phục mật khẩu tài khoản ứng viên JobHub",
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
