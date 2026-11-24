
import {
  Router,
  Response,
  NextFunction,
} from 'express';

import {
  randomBytes,
  timingSafeEqual,
} from 'crypto';

import {
  RowDataPacket,
  ResultSetHeader,
} from 'mysql2';

import type {
  PoolConnection,
} from 'mysql2/promise';

import pool from '@/config/database';

import {
  authenticate,
  authorize,
} from '@/middlewares/auth';

import {
  AuthenticatedRequest,
} from '@/types';

const router = Router();

// ===========================================
// TYPES
// ===========================================

interface PaymentRow extends RowDataPacket {
  id: number;
  company_id: number;
  plan_id: number;
  amount: number;
  status: string;
  sepay_transaction_id: string | null;
  created_at_text: string;
  expires_at_text: string | null;
}

interface SepayWebhookBody {
  id?: unknown;
  gateway?: unknown;
  transactionDate?: unknown;
  accountNumber?: unknown;
  code?: unknown;
  content?: unknown;
  transferType?: unknown;
  transferAmount?: unknown;
}

// ===========================================
// HELPERS
// ===========================================

function verifySepayApiKey(
  authHeader?: string
): boolean {
  const expectedKey = process.env.SEPAY_API_KEY;

  if (!expectedKey || !authHeader) {
    return false;
  }

  const match =
    /^Apikey\s+(.+)$/i.exec(authHeader);

  if (!match) {
    return false;
  }

  const received = Buffer.from(
    match[1].trim()
  );

  const expected = Buffer.from(
    expectedKey
  );

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

function normalizeAccount(
  value: unknown
): string {
  return String(value ?? '').replace(
    /\s/g,
    ''
  );
}

function extractOrderCode(
  content: string
): string | null {
  const matches = content
    .toUpperCase()
    .match(/PREM[A-F0-9]{20}/g);

  if (!matches || matches.length !== 1) {
    return null;
  }

  return matches[0];
}

// SePay gửi thời gian theo dạng:
// YYYY-MM-DD HH:mm:ss
//
// So sánh trực tiếp với DATETIME MySQL
// theo cùng múi giờ Việt Nam.
//
// Không dùng new Date(string) để tránh
// lệch múi giờ khi parse chuỗi thời gian.
function parseSepayTransactionDate(
  value: unknown
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(
      text
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (
    year < 2000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  // Kiểm tra ngày thực tế, bao gồm
  // tháng 2 và năm nhuận.
  const checked = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    )
  );

  if (
    checked.getUTCFullYear() !== year ||
    checked.getUTCMonth() !== month - 1 ||
    checked.getUTCDate() !== day ||
    checked.getUTCHours() !== hour ||
    checked.getUTCMinutes() !== minute ||
    checked.getUTCSeconds() !== second
  ) {
    return null;
  }

  return text;
}

function ignoreWebhook(
  reason: string,
  orderCode?: string
) {
  console.warn(
    '[SePay] Bỏ qua webhook:',
    {
      reason,
      orderCode: orderCode ?? null,
    }
  );

  return {
    success: true,
    processed: false,
    message: reason,
  };
}

// ===========================================
// 1. TẠO ĐƠN THANH TOÁN PREMIUM
// POST /api/payments/orders
// ===========================================

router.post(
  '/orders',
  authenticate,
  authorize('company'),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const companyId = req.user!.id;

      const [plans] =
        await pool.query<RowDataPacket[]>(
          `
          SELECT
            id,
            code,
            price,
            duration_days
          FROM subscription_plans
          WHERE code = 'PREMIUM'
            AND is_active = 1
          LIMIT 1
          `
        );

      if (plans.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            'Không tìm thấy gói Premium',
        });
      }

      const plan = plans[0];
      const amount = Number(plan.price);

      if (
        !Number.isSafeInteger(amount) ||
        amount <= 0
      ) {
        return res.status(500).json({
          success: false,
          message:
            'Giá gói Premium không hợp lệ',
        });
      }

      const bankCode =
        process.env.PAYMENT_BANK_CODE;

      const accountNo =
        process.env.PAYMENT_BANK_ACCOUNT;

      const accountName =
        process.env.PAYMENT_ACCOUNT_NAME;

      if (
        !bankCode ||
        !accountNo ||
        !accountName
      ) {
        return res.status(500).json({
          success: false,
          message:
            'Chưa cấu hình tài khoản thanh toán',
        });
      }

      const expireMinutes = Number(
        process.env.PAYMENT_EXPIRE_MINUTES ||
          15
      );

      if (
        !Number.isInteger(expireMinutes) ||
        expireMinutes < 1 ||
        expireMinutes > 1440
      ) {
        throw new Error(
          'PAYMENT_EXPIRE_MINUTES không hợp lệ'
        );
      }

      const orderCode =
        'PREM' +
        randomBytes(10)
          .toString('hex')
          .toUpperCase();

      await pool.execute<ResultSetHeader>(
        `
        INSERT INTO payments (
          company_id,
          plan_id,
          order_code,
          amount,
          payment_method,
          status,
          transfer_content,
          expires_at
        )
        VALUES (
          ?, ?, ?, ?,
          'SEPAY',
          'PENDING',
          ?,
          DATE_ADD(
            NOW(),
            INTERVAL ? MINUTE
          )
        )
        `,
        [
          companyId,
          plan.id,
          orderCode,
          amount,
          orderCode,
          expireMinutes,
        ]
      );

      const qrUrl = new URL(
        'https://img.vietqr.io/image/' +
          `${encodeURIComponent(bankCode)}-` +
          `${encodeURIComponent(accountNo)}-compact2.png`
      );

      qrUrl.searchParams.set(
        'amount',
        String(amount)
      );

      qrUrl.searchParams.set(
        'addInfo',
        orderCode
      );

      qrUrl.searchParams.set(
        'accountName',
        accountName
      );

      res.setHeader(
        'Cache-Control',
        'no-store'
      );

      return res.status(201).json({
        success: true,
        message:
          'Tạo đơn thanh toán thành công',
        data: {
          orderCode,
          planCode: 'PREMIUM',
          amount,
          durationDays: Number(
            plan.duration_days
          ),
          bankCode,
          accountNo,
          accountName,
          transferContent: orderCode,
          qrUrl: qrUrl.toString(),
          status: 'PENDING',
          expiresInMinutes:
            expireMinutes,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// 2. KIỂM TRA TRẠNG THÁI ĐƠN
// GET /api/payments/orders/:orderCode
// ===========================================

router.get(
  '/orders/:orderCode',
  authenticate,
  authorize('company'),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Không cho trình duyệt cache
      // trạng thái thanh toán.
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate'
      );

      res.setHeader(
        'Pragma',
        'no-cache'
      );

      res.setHeader(
        'Expires',
        '0'
      );

      const companyId = req.user!.id;
      const { orderCode } = req.params;

      const [rows] =
        await pool.query<RowDataPacket[]>(
          `
          SELECT
            order_code,
            amount,
            status,
            created_at,
            paid_at,
            expires_at
          FROM payments
          WHERE order_code = ?
            AND company_id = ?
          LIMIT 1
          `,
          [orderCode, companyId]
        );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            'Không tìm thấy đơn hàng',
        });
      }

      const order = rows[0];

      return res.status(200).json({
        success: true,
        data: {
          ...order,
          isExpired:
            order.status === 'PENDING' &&
            order.expires_at !== null &&
            new Date(
              order.expires_at
            ).getTime() <= Date.now(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// 3. NHẬN WEBHOOK SEPAY
// POST /api/payments/sepay/webhook
// ===========================================

router.post(
  '/sepay/webhook',
  async (req, res) => {
    // =======================================
    // VERIFY API KEY
    // =======================================

    if (
      !verifySepayApiKey(
        req.header('authorization')
      )
    ) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const data =
      req.body as SepayWebhookBody;

    // =======================================
    // IGNORE DEFAULT TEST PAYLOAD
    // =======================================

    if (
      data &&
      data.id === 0 &&
      data.gateway === 'SePay' &&
      data.code === 'SEPAYTEST' &&
      data.content ===
        'SEPAY TEST WEBHOOK' &&
      data.accountNumber ===
        '0000000000' &&
      data.transferType === 'in' &&
      data.transferAmount === 10000
    ) {
      return res.status(200).json({
        success: true,
        processed: false,
        message:
          'Webhook thử nghiệm',
      });
    }

    // =======================================
    // VALIDATE PAYLOAD
    // =======================================

    if (
      !data ||
      typeof data !== 'object' ||
      !Number.isSafeInteger(
        Number(data.id)
      ) ||
      Number(data.id) <= 0 ||
      data.transferType !== 'in' ||
      !Number.isSafeInteger(
        Number(data.transferAmount)
      ) ||
      Number(data.transferAmount) <= 0 ||
      typeof data.content !== 'string' ||
      !data.accountNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Dữ liệu webhook không hợp lệ',
      });
    }

    const transactionDate =
      parseSepayTransactionDate(
        data.transactionDate
      );

    if (!transactionDate) {
      return res.status(400).json({
        success: false,
        message:
          'Thời gian giao dịch không hợp lệ',
      });
    }

    // =======================================
    // VERIFY BANK ACCOUNT
    // =======================================

    const expectedAccount =
      normalizeAccount(
        process.env.PAYMENT_BANK_ACCOUNT
      );

    const receivedAccount =
      normalizeAccount(
        data.accountNumber
      );

    if (
      !expectedAccount ||
      receivedAccount !== expectedAccount
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Tài khoản nhận tiền không hợp lệ',
      });
    }

    // =======================================
    // EXTRACT ORDER CODE
    // =======================================

    const orderCode =
      extractOrderCode(
        data.content
      );

    if (!orderCode) {
      return res.status(200).json(
        ignoreWebhook(
          'Không tìm thấy mã đơn Jobyfy'
        )
      );
    }

    const transactionId =
      String(data.id);

    const transferAmount =
      Number(data.transferAmount);

    let connection:
      PoolConnection | undefined;

    try {
      connection =
        await pool.getConnection();

      await connection.beginTransaction();

      // =====================================
      // LOOKUP ORDER
      // =====================================

      const [orderLookup] =
        await connection.query<RowDataPacket[]>(
          `
          SELECT
            id,
            company_id
          FROM payments
          WHERE order_code = ?
          LIMIT 1
          `,
          [orderCode]
        );

      if (orderLookup.length === 0) {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            'Không tìm thấy đơn hàng',
            orderCode
          )
        );
      }

      const companyId =
        Number(
          orderLookup[0].company_id
        );

      // =====================================
      // LOCK COMPANY
      // =====================================

      const [companies] =
        await connection.query<RowDataPacket[]>(
          `
          SELECT id
          FROM companies
          WHERE id = ?
          FOR UPDATE
          `,
          [companyId]
        );

      if (companies.length === 0) {
        throw new Error(
          'Không tìm thấy công ty'
        );
      }

      // =====================================
      // LOCK PAYMENT
      // =====================================

      const [orders] =
        await connection.query<PaymentRow[]>(
          `
          SELECT
            id,
            company_id,
            plan_id,
            amount,
            status,
            sepay_transaction_id,

            DATE_FORMAT(
              created_at,
              '%Y-%m-%d %H:%i:%s'
            ) AS created_at_text,

            DATE_FORMAT(
              expires_at,
              '%Y-%m-%d %H:%i:%s'
            ) AS expires_at_text

          FROM payments
          WHERE order_code = ?
          FOR UPDATE
          `,
          [orderCode]
        );

      if (orders.length === 0) {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            'Đơn hàng không còn tồn tại',
            orderCode
          )
        );
      }

      const order = orders[0];

      if (
        Number(order.company_id) !==
        companyId
      ) {
        throw new Error(
          'Dữ liệu đơn hàng thay đổi'
        );
      }

      // =====================================
      // IDEMPOTENCY
      // =====================================

      if (order.status === 'PAID') {
        await connection.rollback();

        return res.status(200).json({
          success: true,
          processed: false,
          message:
            'Đơn hàng đã thanh toán trước đó',
        });
      }

      if (order.status !== 'PENDING') {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            `Đơn hàng đang ở trạng thái ${order.status}`,
            orderCode
          )
        );
      }

      // =====================================
      // VERIFY AMOUNT
      // =====================================

      if (
        Number(order.amount) !==
        transferAmount
      ) {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            'Số tiền chuyển khoản không khớp',
            orderCode
          )
        );
      }

      // =====================================
      // VERIFY TRANSACTION TIME
      // =====================================

      // QUAN TRỌNG:
      // So sánh thời điểm ngân hàng nhận tiền
      // thay vì thời điểm webhook được gọi lại.
      //
      // Yêu cầu:
      // created_at <= transactionDate <= expires_at
      //
      // Các giá trị DATETIME phải sử dụng
      // cùng múi giờ Việt Nam.

      if (
        !order.created_at_text ||
        !order.expires_at_text
      ) {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            'Thiếu thời gian đơn hàng',
            orderCode
          )
        );
      }

      if (
        transactionDate <
        order.created_at_text
      ) {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            'Giao dịch xảy ra trước khi tạo đơn',
            orderCode
          )
        );
      }

      if (
        transactionDate >
        order.expires_at_text
      ) {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            'Giao dịch thực tế xảy ra sau khi đơn hết hạn',
            orderCode
          )
        );
      }

      // =====================================
      // PREVENT DUPLICATE TRANSACTION
      // =====================================

      const [usedTransactions] =
        await connection.query<RowDataPacket[]>(
          `
          SELECT id
          FROM payments
          WHERE sepay_transaction_id = ?
          LIMIT 1
          `,
          [transactionId]
        );

      if (
        usedTransactions.length > 0
      ) {
        await connection.rollback();

        return res.status(200).json(
          ignoreWebhook(
            'Giao dịch SePay đã được sử dụng',
            orderCode
          )
        );
      }

      // =====================================
      // GET PREMIUM PLAN
      // =====================================

      const [plans] =
        await connection.query<RowDataPacket[]>(
          `
          SELECT
            id,
            duration_days
          FROM subscription_plans
          WHERE id = ?
            AND code = 'PREMIUM'
          LIMIT 1
          `,
          [order.plan_id]
        );

      if (plans.length === 0) {
        throw new Error(
          'Không tìm thấy gói Premium'
        );
      }

      const durationDays =
        Number(
          plans[0].duration_days
        );

      if (
        !Number.isInteger(
          durationDays
        ) ||
        durationDays <= 0
      ) {
        throw new Error(
          'Thời hạn Premium không hợp lệ'
        );
      }

      // =====================================
      // FIND ACTIVE PREMIUM
      // =====================================

      const [currentPremium] =
        await connection.query<RowDataPacket[]>(
          `
          SELECT
            cs.id,
            cs.end_date
          FROM company_subscriptions cs
          JOIN subscription_plans p
            ON p.id = cs.plan_id
          WHERE cs.company_id = ?
            AND cs.status = 'ACTIVE'
            AND p.code = 'PREMIUM'
            AND cs.end_date > NOW()
          ORDER BY cs.end_date DESC
          LIMIT 1
          FOR UPDATE
          `,
          [companyId]
        );

      let subscriptionId: number;

      // =====================================
      // EXTEND EXISTING PREMIUM
      // =====================================

      if (
        currentPremium.length > 0
      ) {
        subscriptionId =
          Number(
            currentPremium[0].id
          );

        await connection.execute(
          `
          UPDATE company_subscriptions
          SET end_date = DATE_ADD(
            end_date,
            INTERVAL ? DAY
          )
          WHERE id = ?
          `,
          [
            durationDays,
            subscriptionId,
          ]
        );

        // Đóng các subscription ACTIVE khác.
        await connection.execute(
          `
          UPDATE company_subscriptions
          SET status = 'EXPIRED'
          WHERE company_id = ?
            AND status = 'ACTIVE'
            AND id <> ?
          `,
          [
            companyId,
            subscriptionId,
          ]
        );
      } else {
        // ===================================
        // CREATE NEW PREMIUM
        // ===================================

        await connection.execute(
          `
          UPDATE company_subscriptions
          SET status = 'EXPIRED'
          WHERE company_id = ?
            AND status = 'ACTIVE'
          `,
          [companyId]
        );

        const [insertSubscription] =
          await connection.execute<ResultSetHeader>(
            `
            INSERT INTO company_subscriptions (
              company_id,
              plan_id,
              start_date,
              end_date,
              status
            )
            VALUES (
              ?,
              ?,
              NOW(),
              DATE_ADD(
                NOW(),
                INTERVAL ? DAY
              ),
              'ACTIVE'
            )
            `,
            [
              companyId,
              order.plan_id,
              durationDays,
            ]
          );

        subscriptionId =
          insertSubscription.insertId;
      }

      // =====================================
      // UPDATE PAYMENT
      // =====================================

      const [paymentResult] =
        await connection.execute<ResultSetHeader>(
          `
          UPDATE payments
          SET
            status = 'PAID',
            subscription_id = ?,
            sepay_transaction_id = ?,
            paid_at = ?
          WHERE id = ?
            AND status = 'PENDING'
          `,
          [
            subscriptionId,
            transactionId,
            transactionDate,
            order.id,
          ]
        );

      if (
        paymentResult.affectedRows !== 1
      ) {
        throw new Error(
          'Không thể xác nhận đơn thanh toán'
        );
      }

      // =====================================
      // SAVE WEBHOOK EVENT
      // =====================================

      await connection.execute(
        `
        INSERT INTO sepay_webhook_events (
          sepay_transaction_id,
          order_code,
          payload,
          result
        )
        VALUES (
          ?, ?, ?, 'PAID'
        )
        `,
        [
          transactionId,
          orderCode,
          JSON.stringify(data),
        ]
      );

      // =====================================
      // COMMIT
      // =====================================

      await connection.commit();

      console.log(
        '[SePay] Thanh toán thành công:',
        {
          orderCode,
          transactionId,
          companyId,
          subscriptionId,
          amount: transferAmount,
          transactionDate,
        }
      );

      return res.status(200).json({
        success: true,
        processed: true,
        message:
          'Xác nhận thanh toán thành công',
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error(
            'Rollback webhook thất bại:',
            rollbackError
          );
        }
      }

      console.error(
        'Lỗi xử lý SePay webhook:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Không thể xử lý webhook',
      });
    } finally {
      connection?.release();
    }
  }
);

export default router;
