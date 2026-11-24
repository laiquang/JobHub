
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";

type AdminLoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    admin: {
      id: number;
      full_name: string;
      email: string;
      role: "SUPER_ADMIN" | "ADMIN";
    };
  };
};

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000/api";

      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/auth/admins/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const result: AdminLoginResponse = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.data?.token ||
        !result.data?.admin
      ) {
        throw new Error(
          result.message || "Đăng nhập không thành công"
        );
      }

      // Lưu phiên Admin riêng, không ghi đè phiên ứng viên/công ty.
      sessionStorage.setItem(
        "jobyfy_admin_token",
        result.data.token
      );

      sessionStorage.setItem(
        "jobyfy_admin",
        JSON.stringify(result.data.admin)
      );

      router.replace("/admin/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối đến máy chủ"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-300/30">
            <ShieldCheck className="h-9 w-9 text-indigo-300" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            JobHub Admin
          </h1>

          <p className="mt-3 text-sm text-slate-300">
            Đăng nhập vào hệ thống quản trị
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">
              Chào mừng trở lại
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Nhập thông tin tài khoản quản trị viên.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email quản trị
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Nhập email Admin"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Mật khẩu
              </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập quản trị
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Khu vực dành riêng cho quản trị viên JobHub
        </p>
      </div>
    </main>
  );
}
