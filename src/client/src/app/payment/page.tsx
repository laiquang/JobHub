
'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wallet
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

import {
  paymentService,
  getPaymentErrorMessage,
  type PaymentOrder,
  type PaymentStatus
} from '@/services/paymentService';

const STORAGE_KEY = 'jobyfy_pending_payment';

const POLLING_INTERVAL_MS = 4000;

type StoredPaymentOrder = PaymentOrder & {
  createdAtClient: number;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds
  ).padStart(2, '0')}`;
}

function getRemainingSeconds(
  order: StoredPaymentOrder
): number {
  const durationMs =
    (order.expiresInMinutes || 15) * 60 * 1000;

  const expiresAt =
    order.createdAtClient + durationMs;

  return Math.max(
    0,
    Math.ceil((expiresAt - Date.now()) / 1000)
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isAuthenticated, isLoading, userType } =
    useAuth();

  const orderCodeFromUrl =
    searchParams.get('orderCode') || '';

  const [order, setOrder] =
    useState<StoredPaymentOrder | null>(null);

  const [status, setStatus] =
    useState<PaymentStatus>('PENDING');

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [initializing, setInitializing] =
    useState(true);

  const [checking, setChecking] =
    useState(false);

  const [error, setError] =
    useState('');

  const [copiedField, setCopiedField] =
    useState('');

  const [qrFailed, setQrFailed] =
    useState(false);

  const requestInProgress = useRef(false);

  /**
   * Đọc đơn đã được tạo tại trang pricing.
   *
   * Không lấy mã QR từ URL do người dùng tự nhập.
   * Chỉ sử dụng thông tin đã nhận từ API tạo đơn.
   */
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || userType !== 'company') {
      setInitializing(false);
      return;
    }

    try {
      const stored = sessionStorage.getItem(
        STORAGE_KEY
      );

      if (!stored) {
        setError(
          'Không tìm thấy đơn thanh toán trong phiên hiện tại. Vui lòng tạo đơn mới.'
        );
        setInitializing(false);
        return;
      }

      const parsed = JSON.parse(
        stored
      ) as StoredPaymentOrder;

      if (
        !parsed.orderCode ||
        !parsed.qrUrl ||
        !parsed.createdAtClient ||
        parsed.orderCode !== orderCodeFromUrl
      ) {
        setError(
          'Thông tin đơn thanh toán không hợp lệ hoặc không khớp.'
        );
        setInitializing(false);
        return;
      }

      setOrder(parsed);
      setStatus('PENDING');
      setRemainingSeconds(
        getRemainingSeconds(parsed)
      );
    } catch {
      setError(
        'Không thể đọc thông tin đơn thanh toán.'
      );
    } finally {
      setInitializing(false);
    }
  }, [
    isAuthenticated,
    isLoading,
    userType,
    orderCodeFromUrl
  ]);

  /**
   * Sao chép nội dung chuyển khoản.
   */
  const copyText = async (
    value: string,
    field: string
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);

      window.setTimeout(() => {
        setCopiedField('');
      }, 2000);
    } catch {
      setError(
        'Không thể sao chép tự động. Vui lòng sao chép thủ công.'
      );
    }
  };

  /**
   * Kiểm tra trạng thái thanh toán từ backend.
   *
   * Không dựa vào QR hoặc thời gian đếm ngược
   * để tự đánh dấu đơn PAID.
   */
  const checkPaymentStatus = useCallback(
    async (showLoading = false) => {
      if (!order || requestInProgress.current) {
        return;
      }

      requestInProgress.current = true;

      if (showLoading) {
        setChecking(true);
      }

      try {
        const result =
          await paymentService.getOrderStatus(
            order.orderCode
          );

        if (result.status === 'PAID') {
          setStatus('PAID');
          setError('');

          sessionStorage.removeItem(
            STORAGE_KEY
          );

          return;
        }

        if (result.isExpired || result.status === 'EXPIRED') {
            setStatus('EXPIRED');
            return;
        }

        if (result.status === 'FAILED') {
            setStatus('FAILED');
            return;
        }

        setStatus('PENDING');

        if (showLoading) {
          setError('');
        }
      } catch (err) {
        if (showLoading) {
          setError(
            getPaymentErrorMessage(err)
          );
        }
      } finally {
        requestInProgress.current = false;
        setChecking(false);
      }
    },
    [order]
  );

  /**
   * Kiểm tra ngay khi mở trang và
   * tự động kiểm tra mỗi 4 giây.
   */
  useEffect(() => {
    if (
      !order ||
      !isAuthenticated ||
      userType !== 'company' ||
      status !== 'PENDING'
    ) {
      return;
    }

    void checkPaymentStatus();

    const intervalId = window.setInterval(() => {
      void checkPaymentStatus();
    }, POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    order,
    isAuthenticated,
    userType,
    status,
    checkPaymentStatus
  ]);

  /**
   * Đồng hồ đếm ngược phía frontend.
   *
   * Thời gian này chỉ dùng để hiển thị.
   * Backend vẫn là nơi quyết định đơn hết hạn.
   */
  useEffect(() => {
    if (!order || status !== 'PENDING') {
      return;
    }

    const updateCountdown = () => {
      setRemainingSeconds(
        getRemainingSeconds(order)
      );
    };

    updateCountdown();

    const intervalId = window.setInterval(
      updateCountdown,
      1000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [order, status]);

  /**
   * Tạo đơn mới bằng cách quay về pricing.
   */
  const handleCreateNewOrder = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push('/pricing');
  };

  // Đang tải trạng thái đăng nhập hoặc đơn.
  if (isLoading || initializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
          <p className="mt-4 text-sm text-slate-600">
            Đang tải thông tin thanh toán...
          </p>
        </div>
      </main>
    );
  }

  // Chưa đăng nhập bằng tài khoản công ty.
  if (!isAuthenticated || userType !== 'company') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <TriangleAlert className="mx-auto h-12 w-12 text-amber-500" />

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Yêu cầu đăng nhập
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Vui lòng đăng nhập bằng tài khoản nhà
            tuyển dụng để xem đơn thanh toán.
          </p>

          <Link
            href="/pricing"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Quay về bảng giá
          </Link>
        </div>
      </main>
    );
  }

  // Không tìm thấy đơn trong phiên.
  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <TriangleAlert className="mx-auto h-12 w-12 text-amber-500" />

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Không tìm thấy đơn thanh toán
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {error ||
              'Vui lòng quay lại bảng giá và tạo đơn thanh toán mới.'}
          </p>

          <button
            type="button"
            onClick={handleCreateNewOrder}
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Tạo đơn thanh toán
          </button>
        </div>
      </main>
    );
  }

  // Backend xác nhận đã thanh toán.
  if (status === 'PAID') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4">
        <div className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-2xl md:p-12">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          </div>

          <h1 className="mt-7 text-3xl font-extrabold text-slate-900">
            Thanh toán thành công!
          </h1>

          <p className="mt-4 text-slate-600">
            Hệ thống đã xác nhận thanh toán và
            kích hoạt gói PREMIUM cho công ty của bạn.
          </p>

          <div className="mt-8 rounded-2xl bg-indigo-50 p-6">
            <Crown className="mx-auto h-9 w-9 text-indigo-600" />

            <p className="mt-3 text-xl font-bold text-indigo-900">
              JOBYFY PREMIUM
            </p>

            <p className="mt-2 text-sm text-indigo-700">
              Đăng tin không giới hạn trong thời hạn gói
            </p>

            <p className="mt-4 text-2xl font-extrabold text-slate-900">
              {paymentService.formatCurrency(
                order.amount
              )}
            </p>
          </div>

          <p className="mt-6 break-all text-xs text-slate-500">
            Mã đơn: {order.orderCode}
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white hover:bg-indigo-700"
          >
            Về trang chủ Jobyfy
          </Link>
        </div>
      </main>
    );
  }

  // Backend xác nhận đơn hết hạn hoặc thất bại.
  if (
    status === 'EXPIRED' ||
    status === 'FAILED'
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <TriangleAlert className="mx-auto h-14 w-14 text-amber-500" />

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            {status === 'EXPIRED'
              ? 'Đơn thanh toán đã hết hạn'
              : 'Đơn thanh toán thất bại'}
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Vui lòng tạo đơn mới để tiếp tục nâng cấp
            PREMIUM. Không sử dụng lại mã chuyển khoản
            của đơn này.
          </p>

          <button
            type="button"
            onClick={handleCreateNewOrder}
            className="mt-7 w-full rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white hover:bg-indigo-700"
          >
            Tạo đơn mới
          </button>
        </div>
      </main>
    );
  }

  const isCountdownFinished =
    remainingSeconds <= 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50 px-4 py-10 md:py-16">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/pricing"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại bảng giá
        </Link>

        {/* Heading */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700">
            <ShieldCheck className="h-4 w-4" />
            Thanh toán chuyển khoản VietQR
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
            Hoàn tất nâng cấp PREMIUM
          </h1>

          <p className="mt-3 text-slate-600">
            Quét mã QR bằng ứng dụng ngân hàng
            và giữ nguyên nội dung chuyển khoản.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">

          {/* QR card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl lg:col-span-2 md:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                <Wallet className="h-7 w-7 text-indigo-600" />
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Quét mã QR thanh toán
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Mở ứng dụng ngân hàng và quét mã bên dưới
              </p>
            </div>

            <div className="mx-auto mt-7 max-w-xs rounded-2xl border-2 border-indigo-100 bg-white p-3">
              {qrFailed ? (
                <div className="flex aspect-square flex-col items-center justify-center gap-3 bg-slate-50 p-5 text-center">
                  <TriangleAlert className="h-9 w-9 text-amber-500" />
                  <p className="text-sm text-slate-600">
                    Không tải được ảnh QR.
                    Bạn có thể chuyển khoản thủ công
                    bằng thông tin bên cạnh.
                  </p>
                </div>
              ) : (
                <img
                  src={order.qrUrl}
                  alt={`VietQR thanh toán đơn ${order.orderCode}`}
                  className="h-auto w-full"
                  onError={() => setQrFailed(true)}
                />
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3">
              <Clock3 className="h-5 w-5 text-amber-600" />

              <span className="text-sm text-amber-800">
                Thời gian còn lại:
              </span>

              <span className="font-mono text-xl font-extrabold text-amber-700">
                {formatTime(remainingSeconds)}
              </span>
            </div>

            {isCountdownFinished && (
              <p className="mt-3 text-center text-sm font-medium text-amber-700">
                Đồng hồ đã về 0. Vui lòng kiểm tra
                trạng thái đơn với hệ thống trước khi
                thực hiện chuyển khoản.
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-indigo-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang chờ xác nhận thanh toán...
            </div>

            <button
              type="button"
              onClick={() => {
                void checkPaymentStatus(true);
              }}
              disabled={checking}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              Kiểm tra thanh toán ngay
            </button>
          </section>

          {/* Transfer information */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl lg:col-span-3 md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                <Crown className="h-6 w-6 text-indigo-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Thông tin chuyển khoản
                </h2>

                <p className="text-sm text-slate-500">
                  Gói JOBYFY PREMIUM — 30 ngày
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-5">

              {/* Bank */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Ngân hàng thụ hưởng
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {order.bankCode}
                </p>
              </div>

              {/* Account name */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Tên chủ tài khoản
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {order.accountName}
                </p>
              </div>

              {/* Account number */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Số tài khoản
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="break-all text-lg font-bold text-slate-900">
                    {order.accountNo}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        order.accountNo,
                        'account'
                      )
                    }
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50"
                  >
                    {copiedField === 'account' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}

                    Sao chép
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs text-indigo-700">
                  Số tiền cần chuyển
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-2xl font-extrabold text-indigo-700">
                    {paymentService.formatCurrency(
                      order.amount
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        String(order.amount),
                        'amount'
                      )
                    }
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-100"
                  >
                    {copiedField === 'amount' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}

                    Sao chép
                  </button>
                </div>
              </div>

              {/* Transfer content */}
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-800">
                  Nội dung chuyển khoản (bắt buộc)
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="break-all font-mono text-base font-extrabold text-slate-900">
                    {order.transferContent}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        order.transferContent,
                        'content'
                      )
                    }
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100"
                  >
                    {copiedField === 'content' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}

                    Sao chép
                  </button>
                </div>

                <p className="mt-3 text-xs leading-5 text-amber-800">
                  Không thay đổi nội dung chuyển khoản.
                  Hệ thống sử dụng mã này để đối chiếu
                  và kích hoạt PREMIUM tự động.
                </p>
              </div>
            </div>

            {/* Order info */}
            <div className="mt-7 border-t border-slate-200 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">
                  Mã đơn thanh toán
                </span>

                <span className="break-all font-mono font-semibold text-slate-900">
                  {order.orderCode}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">
                  Trạng thái
                </span>

                <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                  Chờ thanh toán
                </span>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="mt-7 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>
                  <p className="font-semibold text-blue-900">
                    Xác nhận tự động qua SePay
                  </p>

                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    Sau khi ngân hàng ghi nhận giao dịch,
                    SePay gửi thông báo đến backend Jobyfy.
                    Hệ thống kiểm tra số tiền, tài khoản
                    và mã đơn trước khi kích hoạt PREMIUM.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <ExternalLink className="h-4 w-4" />
              Bạn không cần gửi ảnh biên lai hoặc
              bấm nút xác nhận đã chuyển tiền.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
