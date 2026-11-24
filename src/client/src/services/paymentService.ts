
import { apiClient } from './api';

/**
 * Các trạng thái thanh toán.
 */
export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'FAILED';

/**
 * Dữ liệu API trả về khi tạo đơn PREMIUM.
 *
 * POST /api/payments/orders
 */
export interface PaymentOrder {
  orderCode: string;
  planCode: string;
  amount: number;
  durationDays: number;

  bankCode: string;
  accountNo: string;
  accountName: string;

  transferContent: string;
  qrUrl: string;

  status: PaymentStatus;
  expiresInMinutes: number;
}

/**
 * Dữ liệu sau khi chuẩn hóa response
 * từ API kiểm tra trạng thái đơn.
 *
 * GET /api/payments/orders/:orderCode
 */
export interface PaymentOrderStatus {
  orderCode?: string;
  status: PaymentStatus;
  amount?: number;
  createdAt?: string;
  expiresAt?: string;
  paidAt?: string;
  isExpired?: boolean;
}

/**
 * Cấu trúc response chung của backend.
 */
export interface PaymentApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Cấu trúc JSON thực tế của backend
 * khi kiểm tra đơn thanh toán.
 *
 * Backend dùng snake_case:
 * order_code, created_at, paid_at, expires_at.
 */
interface PaymentOrderStatusApiData {
  order_code: string;
  amount: string | number;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
  expires_at: string;
  isExpired: boolean;
}

/**
 * Lấy thông báo lỗi từ API hoặc Axios.
 */
export function getPaymentErrorMessage(
  error: unknown
): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          success?: boolean;
          message?: string;
          error?: string;
        };
      };
    };

    const response = axiosError.response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.error) {
      return response.data.error;
    }

    if (response?.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }

    if (response?.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }

    if (response?.status === 404) {
      return 'Không tìm thấy đơn thanh toán.';
    }

    if (response?.status === 500) {
      return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

/**
 * Dịch vụ xử lý thanh toán PREMIUM.
 *
 * Sử dụng apiClient có sẵn trong dự án.
 * apiClient tự động thêm JWT Bearer Token.
 */
class PaymentService {
  /**
   * Tạo đơn thanh toán PREMIUM.
   *
   * POST /api/payments/orders
   *
   * Backend tự xác định companyId từ JWT,
   * không truyền companyId từ frontend.
   */
  async createOrder(): Promise<PaymentOrder> {
    const response = await apiClient.post<
      PaymentApiResponse<PaymentOrder>
    >('/payments/orders');

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          'Tạo đơn thanh toán thất bại.'
      );
    }

    const data = response.data.data;

    if (!data) {
      throw new Error(
        'Backend không trả về dữ liệu đơn thanh toán.'
      );
    }

    if (!data.orderCode) {
      throw new Error(
        'Đơn thanh toán không có mã orderCode.'
      );
    }

    if (!data.qrUrl) {
      throw new Error(
        'Đơn thanh toán không có mã QR.'
      );
    }

    return {
      orderCode: data.orderCode,
      planCode: data.planCode,
      amount: Number(data.amount),
      durationDays: Number(data.durationDays),

      bankCode: data.bankCode,
      accountNo: data.accountNo,
      accountName: data.accountName,

      transferContent: data.transferContent,
      qrUrl: data.qrUrl,

      status: data.status,
      expiresInMinutes: Number(
        data.expiresInMinutes
      )
    };
  }

  /**
   * Kiểm tra trạng thái đơn thanh toán.
   *
   * GET /api/payments/orders/:orderCode
   *
   * Ví dụ response thực tế:
   *
   * {
   *   "success": true,
   *   "data": {
   *     "order_code": "PREM...",
   *     "amount": "199000",
   *     "status": "PENDING",
   *     "created_at": "...",
   *     "paid_at": null,
   *     "expires_at": "...",
   *     "isExpired": false
   *   }
   * }
   */
  async getOrderStatus(
    orderCode: string
  ): Promise<PaymentOrderStatus> {
    if (!orderCode || !orderCode.trim()) {
      throw new Error(
        'Mã đơn thanh toán không hợp lệ.'
      );
    }

    const response = await apiClient.get<
      PaymentApiResponse<PaymentOrderStatusApiData>
    >(
      `/payments/orders/${encodeURIComponent(
        orderCode.trim()
      )}`
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
          'Không thể kiểm tra trạng thái thanh toán.'
      );
    }

    const data = response.data.data;

    if (!data) {
      throw new Error(
        'Backend không trả về trạng thái đơn thanh toán.'
      );
    }

    if (!data.status) {
      throw new Error(
        'Backend không trả về trường status.'
      );
    }

    /**
     * Chuyển snake_case của backend
     * thành camelCase cho frontend.
     */
    return {
      orderCode: data.order_code,
      amount: Number(data.amount),
      status: data.status,

      createdAt: data.created_at,
      paidAt: data.paid_at || undefined,
      expiresAt: data.expires_at,

      isExpired: data.isExpired
    };
  }

  /**
   * Định dạng số tiền theo tiền Việt Nam.
   *
   * Ví dụ:
   * 199000 -> 199.000 ₫
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  }
}

export const paymentService = new PaymentService();

export default paymentService;
