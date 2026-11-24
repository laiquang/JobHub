import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quên mật khẩu nhà tuyển dụng - JobHub",
  description: "Khôi phục mật khẩu tài khoản nhà tuyển dụng JobHub",
};

export default function EmployerForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
