
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';

import pool from '@/config/database';
import { AuthenticatedRequest, JWTPayload } from '@/types';
import { AppError } from './errorHandler';

interface AccountStatusRow extends RowDataPacket {
  status: 'ACTIVE' | 'LOCKED';
}

const getBearerToken = (
  req: AuthenticatedRequest
): string | null => {
  const authorization = req.headers.authorization;

  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : null;
};

const verifyJwt = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError(
      'JWT secret không được cấu hình',
      500
    );
  }

  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof decoded.id !== 'number' ||
    !Number.isSafeInteger(decoded.id) ||
    decoded.id <= 0 ||
    typeof decoded.email !== 'string' ||
    !['user', 'company', 'admin'].includes(
      String(decoded.userType)
    )
  ) {
    throw new AppError(
      'Thông tin trong token không hợp lệ',
      401
    );
  }

  return decoded as JWTPayload;
};

const checkAccountStatus = async (
  decoded: JWTPayload
): Promise<void> => {
  if (
    decoded.userType !== 'user' &&
    decoded.userType !== 'company'
  ) {
    return;
  }

  const tableName =
    decoded.userType === 'user'
      ? 'users'
      : 'companies';

  const [rows] = await pool.query<AccountStatusRow[]>(
    `SELECT status
     FROM ${tableName}
     WHERE id = ?
     LIMIT 1`,
    [decoded.id]
  );

  if (rows.length === 0) {
    throw new AppError(
      'Tài khoản không tồn tại',
      401
    );
  }

  if (rows[0].status !== 'ACTIVE') {
    throw new AppError(
      'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
      403
    );
  }
};

const handleAuthError = (
  error: unknown,
  next: NextFunction
): void => {
  if (error instanceof jwt.TokenExpiredError) {
    next(new AppError('Phiên đăng nhập đã hết hạn', 401));
    return;
  }

  if (error instanceof jwt.JsonWebTokenError) {
    next(new AppError('Token không hợp lệ', 401));
    return;
  }

  next(error);
};

// ==========================================
// AUTHENTICATE
// Chỉ dùng cho route cần đăng nhập
// ==========================================

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new AppError(
        'Token không được cung cấp',
        401
      );
    }

    const decoded = verifyJwt(token);

    await checkAccountStatus(decoded);

    req.user = decoded;
    next();
  } catch (error) {
    handleAuthError(error, next);
  }
};

// ==========================================
// AUTHENTICATE STRICT
// Giữ export cho các route Admin
// ==========================================

export const authenticateStrict = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await authenticate(req, res, next);
};

// ==========================================
// AUTHORIZE
// ==========================================

export const authorize = (
  ...allowedRoles: string[]
) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(
        new AppError(
          'Người dùng chưa được xác thực',
          401
        )
      );
      return;
    }

    if (!allowedRoles.includes(req.user.userType)) {
      next(
        new AppError(
          'Bạn không có quyền truy cập',
          403
        )
      );
      return;
    }

    next();
  };
};

// ==========================================
// OPTIONAL AUTHENTICATE
// Không có token vẫn được truy cập
// ==========================================

export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = getBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyJwt(token);

    await checkAccountStatus(decoded);

    req.user = decoded;
    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      (error instanceof AppError &&
        [401, 403].includes(error.statusCode))
    ) {
      next();
      return;
    }

    next(error);
  }
};
