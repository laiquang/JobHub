
import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import "./globals.css";

import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { AppShell } from "@/components/AppShell";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "JobHub - Tìm việc làm dễ dàng",
  description:
    "Nền tảng tìm việc làm hiện đại, kết nối ứng viên và nhà tuyển dụng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${roboto.variable} antialiased font-sans`}
      >
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>
              <AppShell>{children}</AppShell>
            </SocketProvider>
          </AuthProvider>
        </QueryProvider>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}
