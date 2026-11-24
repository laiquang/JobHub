
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  Check,
  X,
  Crown,
  Zap,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Sparkles,
  BriefcaseBusiness
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

import {
  paymentService,
  getPaymentErrorMessage
} from '@/services/paymentService';

// =====================================================
// QUYỀN LỢI GÓI FREE
// =====================================================

const FREE_FEATURES = [
  {
    label: 'Đăng tối đa 2 tin tuyển dụng',
    enabled: true
  },
  {
    label: 'Quản lý hồ sơ ứng viên',
    enabled: true
  },
  {
    label: 'Quản lý tin tuyển dụng',
    enabled: true
  },
  {
    label: 'Đăng tin không giới hạn',
    enabled: false
  },
  {
    label: 'Chấm điểm CV bằng AI',
    enabled: false
  },
  {
    label: 'Ưu tiên hiển thị tin tuyển dụng',
    enabled: false
  }
];

// =====================================================
// QUYỀN LỢI GÓI PREMIUM
// =====================================================

const PREMIUM_FEATURES = [
  {
    label: 'Đăng tin tuyển dụng không giới hạn',
    enabled: true
  },
  {
    label: 'Quản lý hồ sơ ứng viên',
    enabled: true
  },
  {
    label: 'Quản lý tin tuyển dụng',
    enabled: true
  },
  {
    label: 'Chấm điểm CV bằng AI',
    enabled: true
  },
  {
    label: 'Ưu tiên hiển thị tin tuyển dụng',
    enabled: true
  },
  {
    label: 'Sử dụng quyền lợi trong 1 tháng',
    enabled: true
  }
];

// =====================================================
// TRANG BẢNG GIÁ
// =====================================================

export default function PricingPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading: authLoading,
    userType
  } = useAuth();

  const [isCreatingOrder, setIsCreatingOrder] =
    useState(false);

  const [error, setError] = useState('');

  // =====================================================
  // TẠO ĐƠN THANH TOÁN PREMIUM
  // =====================================================

  const handleUpgrade = async () => {
    setError('');

    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setError(
        'Vui lòng đăng nhập tài khoản nhà tuyển dụng trước khi nâng cấp.'
      );
      return;
    }

    if (userType !== 'company') {
      setError(
        'Chỉ tài khoản nhà tuyển dụng mới có thể nâng cấp PREMIUM.'
      );
      return;
    }

    if (isCreatingOrder) {
      return;
    }

    try {
      setIsCreatingOrder(true);

      const order = await paymentService.createOrder();

      if (
        !order.orderCode ||
        !order.qrUrl ||
        order.status !== 'PENDING'
      ) {
        throw new Error(
          'Dữ liệu đơn thanh toán không hợp lệ.'
        );
      }

      // Lưu thông tin đơn thanh toán tạm thời
      // để trang payment lấy dữ liệu hiển thị QR.
      sessionStorage.setItem(
        'jobyfy_pending_payment',
        JSON.stringify({
          ...order,
          createdAtClient: Date.now()
        })
      );

      router.push(
        `/payment?orderCode=${encodeURIComponent(
          order.orderCode
        )}`
      );
    } catch (err) {
      setError(getPaymentErrorMessage(err));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // =====================================================
  // GIAO DIỆN
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ============================================= */}
      {/* HEADER NỀN XANH TÍM                         */}
      {/* ============================================= */}

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 px-4 py-14 text-white sm:py-16">

        {/* Hiệu ứng nền */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">

          {/* Nhãn giới thiệu */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-indigo-100 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            Gói dịch vụ dành cho nhà tuyển dụng
          </div>

          {/* Tiêu đề */}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Tuyển dụng hiệu quả hơn

            <span className="mt-2 block text-indigo-300">
              cùng JobHub
            </span>
          </h1>

          {/* Mô tả */}
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Bắt đầu miễn phí hoặc nâng cấp PREMIUM để
            đăng tin không giới hạn, chấm điểm CV bằng AI
            và tăng khả năng tiếp cận ứng viên.
          </p>
        </div>
      </section>

      {/* ============================================= */}
      {/* KHU VỰC BẢNG GIÁ                            */}
      {/* Không sử dụng margin âm nên không đè header */}
      {/* ============================================= */}

      <section className="relative bg-slate-50 px-4 pb-16 pt-12 sm:px-6 sm:pt-14">

        <div className="mx-auto w-full max-w-4xl">

          {/* Hai khung nằm cạnh nhau trên desktop */}
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">

            {/* ===================================== */}
            {/* GÓI FREE                              */}
            {/* ===================================== */}

            <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-7">

              {/* Icon */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <BriefcaseBusiness className="h-6 w-6 text-slate-700" />
              </div>

              {/* Tên gói */}
              <h2 className="text-2xl font-bold text-slate-900">
                FREE
              </h2>

              {/* Mô tả */}
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                Phù hợp với doanh nghiệp mới bắt đầu tuyển dụng.
              </p>

              {/* Giá */}
              <div className="mt-5 flex flex-wrap items-baseline gap-2">

                <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                  0đ
                </span>

                <span className="text-sm text-slate-500">
                  / mãi mãi
                </span>
              </div>

              {/* Đường phân cách */}
              <div className="my-6 h-px bg-slate-200" />

              {/* Tiêu đề quyền lợi */}
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Quyền lợi bao gồm
              </h3>

              {/* Danh sách quyền lợi */}
              <ul className="flex-1 space-y-3.5">
                {FREE_FEATURES.map((feature) => (
                  <li
                    key={feature.label}
                    className="flex items-start gap-3"
                  >
                    {feature.enabled ? (
                      <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />
                    ) : (
                      <X className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-300" />
                    )}

                    <span
                      className={
                        feature.enabled
                          ? 'text-sm leading-6 text-slate-700'
                          : 'text-sm leading-6 text-slate-400'
                      }
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Nút trạng thái FREE */}
              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
                Gói miễn phí mặc định
              </div>

            </div>

            {/* ===================================== */}
            {/* GÓI PREMIUM                           */}
            {/* ===================================== */}

            <div className="relative flex h-full flex-col rounded-3xl border-2 border-indigo-500 bg-white p-6 shadow-xl shadow-indigo-100/70 sm:p-7">

              {/* Nhãn PREMIUM nổi bật */}
              <div className="mb-5 flex justify-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  <Crown className="h-3.5 w-3.5" />
                  Nâng cấp tuyển dụng
                </span>
              </div>

              {/* Icon */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
                <Crown className="h-6 w-6 text-indigo-600" />
              </div>

              {/* Tên gói */}
              <h2 className="text-2xl font-bold text-slate-900">
                PREMIUM
              </h2>

              {/* Mô tả */}
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                Dành cho doanh nghiệp muốn đẩy nhanh
                quá trình tuyển dụng.
              </p>

              {/* Giá */}
              <div className="mt-5 flex flex-wrap items-baseline gap-2">

                <span className="text-4xl font-extrabold tracking-tight text-indigo-600">
                  199.000đ
                </span>

                <span className="text-sm text-slate-500">
                  / 1 tháng
                </span>
              </div>

              {/* Đường phân cách */}
              <div className="my-6 h-px bg-slate-200" />

              {/* Tiêu đề quyền lợi */}
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Tất cả quyền lợi PREMIUM
              </h3>

              {/* Danh sách quyền lợi */}
              <ul className="flex-1 space-y-3.5">
                {PREMIUM_FEATURES.map((feature) => (
                  <li
                    key={feature.label}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                      <Check className="h-3.5 w-3.5 text-indigo-600" />
                    </span>

                    <span className="text-sm leading-6 text-slate-700">
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Nút nâng cấp PREMIUM */}
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isCreatingOrder || authLoading}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang tạo đơn thanh toán...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Nâng cấp PREMIUM
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Phương thức thanh toán */}
              <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Thanh toán bằng chuyển khoản VietQR
              </p>

            </div>
          </div>

          {/* ===================================== */}
          {/* THÔNG BÁO LỖI                         */}
          {/* ===================================== */}

          {error && (
            <div
              role="alert"
              className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700"
            >
              <p>{error}</p>

              {!isAuthenticated && !authLoading && (
                <p className="mt-3">
                  Vui lòng đăng nhập bằng tài khoản
                  nhà tuyển dụng rồi quay lại trang này.
                </p>
              )}
            </div>
          )}

          {/* ===================================== */}
          {/* THÔNG TIN THANH TOÁN                  */}
          {/* ===================================== */}

          <div className="mx-auto mt-12 max-w-3xl text-center">

            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
              Thanh toán đơn giản, kích hoạt tự động
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Sau khi tạo đơn, Jobyfy cung cấp mã QR
              chuyển khoản ngân hàng. Khi hệ thống xác
              nhận thanh toán hợp lệ, gói PREMIUM sẽ
              được kích hoạt tự động.
            </p>

            <p className="mt-4 text-xs text-slate-500">
              Mỗi đơn thanh toán có hiệu lực trong
              15 phút. Không cần tải lên ảnh chuyển khoản.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              Quay về trang chủ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
