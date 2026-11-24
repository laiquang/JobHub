
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';

import pool from '@/config/database';
import { AuthRepository } from '@/repositories/authRepository';
import { AppError } from '@/middlewares/errorHandler';
import { User, Company, JWTPayload } from '@/types';
import { EmailService } from './emailService';

type AccountStatus = 'ACTIVE' | 'LOCKED';

interface StatusRow extends RowDataPacket {
  status: AccountStatus;
}

export class AuthService {
  private authRepository: AuthRepository;
  private emailService: EmailService;

  constructor() {
    this.authRepository = new AuthRepository();
    this.emailService = new EmailService();
  }

  // ==========================================
  // KIỂM TRA TRẠNG THÁI TÀI KHOẢN
  // ==========================================

  private async ensureAccountActive(
    id: number,
    accountType: 'user' | 'company'
  ): Promise<void> {
    const tableName =
      accountType === 'user' ? 'users' : 'companies';

    const [rows] = await pool.query<StatusRow[]>(
      `SELECT status
       FROM ${tableName}
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Tài khoản không tồn tại',
        404
      );
    }

    if (rows[0].status !== 'ACTIVE') {
      throw new AppError(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
        403
      );
    }
  }

  // ==========================================
  // USER AUTHENTICATION
  // ==========================================

  async loginUser(
    email: string,
    password: string
  ): Promise<{
    user: Omit<User, 'password'>;
    token: string;
  }> {
    const user =
      await this.authRepository.findUserByEmail(email);

    if (!user) {
      throw new AppError('Email không tồn tại', 404);
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new AppError(
        'Mật khẩu không chính xác',
        401
      );
    }

    // Chặn ứng viên bị khóa
    await this.ensureAccountActive(user.id, 'user');

    const token = this.generateToken(
      user.id,
      user.email,
      'user'
    );

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async registerUser(userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    idProvince?: number;
  }): Promise<{
    user: Omit<User, 'password'>;
    token: string;
  }> {
    const existingUser =
      await this.authRepository.findUserByEmail(
        userData.email
      );

    if (existingUser) {
      throw new AppError(
        'Email đã được sử dụng',
        409
      );
    }

    const hashedPassword = await bcrypt.hash(
      userData.password,
      10
    );

    const userId =
      await this.authRepository.createUser({
        ...userData,
        password: hashedPassword,
      });

    const newUser =
      await this.authRepository.findUserById(userId);

    if (!newUser) {
      throw new AppError(
        'Lỗi tạo tài khoản',
        500
      );
    }

    await this.ensureAccountActive(
      newUser.id,
      'user'
    );

    const token = this.generateToken(
      newUser.id,
      newUser.email,
      'user'
    );

    const { password: _, ...userWithoutPassword } =
      newUser;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async changeUserPassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    await this.ensureAccountActive(
      userId,
      'user'
    );

    const user =
      await this.authRepository.findUserById(
        userId
      );

    if (!user) {
      throw new AppError(
        'Người dùng không tồn tại',
        404
      );
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.password
    );

    if (!isOldPasswordValid) {
      throw new AppError(
        'Mật khẩu cũ không chính xác',
        401
      );
    }

    const hashedNewPassword = await bcrypt.hash(
      newPassword,
      10
    );

    const updated =
      await this.authRepository.updateUserPassword(
        userId,
        hashedNewPassword
      );

    if (!updated) {
      throw new AppError(
        'Cập nhật mật khẩu thất bại',
        500
      );
    }
  }

  // ==========================================
  // COMPANY AUTHENTICATION
  // ==========================================

  async loginCompany(
    email: string,
    password: string
  ): Promise<{
    company: Omit<Company, 'password'>;
    token: string;
  }> {
    const company =
      await this.authRepository.findCompanyByEmail(
        email
      );

    if (!company) {
      throw new AppError(
        'Email không tồn tại',
        404
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      company.password
    );

    if (!isPasswordValid) {
      throw new AppError(
        'Mật khẩu không chính xác',
        401
      );
    }

    // Chặn nhà tuyển dụng bị khóa
    await this.ensureAccountActive(
      company.id,
      'company'
    );

    const token = this.generateToken(
      company.id,
      company.email,
      'company'
    );

    const {
      password: _,
      ...companyWithoutPassword
    } = company;

    return {
      company: companyWithoutPassword,
      token,
    };
  }

  async registerCompany(companyData: {
    nameCompany: string;
    nameAdmin: string;
    email: string;
    password: string;
    phone: string;
    idProvince: number;
    scale?: string;
  }): Promise<{
    company: Omit<Company, 'password'>;
    token: string;
  }> {
    const existingCompany =
      await this.authRepository.findCompanyByEmail(
        companyData.email
      );

    if (existingCompany) {
      throw new AppError(
        'Email đã được sử dụng',
        409
      );
    }

    const hashedPassword = await bcrypt.hash(
      companyData.password,
      10
    );

    const companyId =
      await this.authRepository.createCompany({
        ...companyData,
        password: hashedPassword,
      });

    const newCompany =
      await this.authRepository.findCompanyById(
        companyId
      );

    if (!newCompany) {
      throw new AppError(
        'Lỗi tạo tài khoản công ty',
        500
      );
    }

    await this.ensureAccountActive(
      newCompany.id,
      'company'
    );

    const token = this.generateToken(
      newCompany.id,
      newCompany.email,
      'company'
    );

    const {
      password: _,
      ...companyWithoutPassword
    } = newCompany;

    return {
      company: companyWithoutPassword,
      token,
    };
  }

  async changeCompanyPassword(
    companyId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    await this.ensureAccountActive(
      companyId,
      'company'
    );

    const company =
      await this.authRepository.findCompanyById(
        companyId
      );

    if (!company) {
      throw new AppError(
        'Công ty không tồn tại',
        404
      );
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      company.password
    );

    if (!isOldPasswordValid) {
      throw new AppError(
        'Mật khẩu cũ không chính xác',
        401
      );
    }

    const hashedNewPassword = await bcrypt.hash(
      newPassword,
      10
    );

    const updated =
      await this.authRepository.updateCompanyPassword(
        companyId,
        hashedNewPassword
      );

    if (!updated) {
      throw new AppError(
        'Cập nhật mật khẩu thất bại',
        500
      );
    }
  }

  // ==========================================
  // JWT UTILITIES
  // ==========================================

  private generateToken(
    id: number,
    email: string,
    userType: 'user' | 'company'
  ): string {
    const payload: JWTPayload = {
      id,
      email,
      userType,
    };

    const secret = process.env.JWT_SECRET;

    const expiresIn =
      process.env.JWT_EXPIRES_IN || '7d';

    if (!secret) {
      throw new AppError(
        'JWT secret không được cấu hình',
        500
      );
    }

    return jwt.sign(
      payload,
      secret,
      { expiresIn } as jwt.SignOptions
    );
  }

  async verifyToken(
    token: string
  ): Promise<JWTPayload> {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new AppError(
        'JWT secret không được cấu hình',
        500
      );
    }

    let decoded: JWTPayload;

    try {
      decoded = jwt.verify(
        token,
        secret
      ) as JWTPayload;
    } catch {
      throw new AppError(
        'Token không hợp lệ',
        401
      );
    }

    // Không chấp nhận JWT của tài khoản bị khóa
    if (
      decoded.userType === 'user' ||
      decoded.userType === 'company'
    ) {
      await this.ensureAccountActive(
        decoded.id,
        decoded.userType
      );
    }

    return decoded;
  }

  // ==========================================
  // USER PASSWORD RESET
  // ==========================================

  async forgotPassword(
    email: string
  ): Promise<void> {
    const user =
      await this.authRepository.findUserByEmail(
        email
      );

    if (!user) {
      throw new AppError(
        'Email không tồn tại trong hệ thống',
        404
      );
    }

    await this.ensureAccountActive(
      user.id,
      'user'
    );

    const resetToken = this.generateResetToken();

    const resetTokenExpiry = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await this.authRepository.saveResetToken(
      user.id,
      resetToken,
      resetTokenExpiry
    );

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await this.emailService.sendResetPasswordEmail(
        email,
        user.name,
        resetUrl
      );
    } catch (emailError) {
      console.error(
        'Lỗi khi gửi email khôi phục:',
        emailError
      );

      console.log(
        '=== FALLBACK: EMAIL KHÔI PHỤC MẬT KHẨU ==='
      );
      console.log(`Gửi đến: ${email}`);
      console.log(`Tên: ${user.name}`);
      console.log(`Link khôi phục: ${resetUrl}`);
      console.log(
        'Token hết hạn sau: 15 phút'
      );
      console.log(
        '=========================================='
      );

      throw new AppError(
        'Không thể gửi email khôi phục. Vui lòng thử lại sau.',
        500
      );
    }
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    const user =
      await this.authRepository.findUserByResetToken(
        token
      );

    if (!user) {
      throw new AppError(
        'Token khôi phục không hợp lệ hoặc đã hết hạn',
        400
      );
    }

    if (
      user.resetTokenExpiry &&
      new Date() > user.resetTokenExpiry
    ) {
      throw new AppError(
        'Token khôi phục đã hết hạn',
        400
      );
    }

    await this.ensureAccountActive(
      user.id,
      'user'
    );

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await this.authRepository.updatePasswordAndClearToken(
      user.id,
      hashedPassword
    );
  }

  private generateResetToken(): string {
    return require('crypto')
      .randomBytes(32)
      .toString('hex');
  }

  // ==========================================
  // COMPANY PASSWORD RESET
  // ==========================================

  async forgotCompanyPassword(
    email: string
  ): Promise<void> {
    const company =
      await this.authRepository.findCompanyByEmail(
        email
      );

    if (!company) {
      throw new AppError(
        'Email không tồn tại trong hệ thống',
        404
      );
    }

    await this.ensureAccountActive(
      company.id,
      'company'
    );

    const resetToken = this.generateResetToken();

    const resetTokenExpiry = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await this.authRepository.saveCompanyResetToken(
      company.id,
      resetToken,
      resetTokenExpiry
    );

    const resetUrl =
      `${process.env.FRONTEND_URL}/employer/reset-password/${resetToken}`;

    try {
      await this.emailService.sendResetPasswordEmail(
        email,
        company.nameCompany,
        resetUrl
      );
    } catch (emailError) {
      console.error(
        'Lỗi khi gửi email khôi phục cho company:',
        emailError
      );

      console.log(
        '=== FALLBACK: EMAIL KHÔI PHỤC MẬT KHẨU COMPANY ==='
      );
      console.log(`Gửi đến: ${email}`);
      console.log(
        `Tên công ty: ${company.nameCompany}`
      );
      console.log(`Link khôi phục: ${resetUrl}`);
      console.log(
        'Token hết hạn sau: 15 phút'
      );
      console.log(
        '==============================================='
      );

      throw new AppError(
        'Không thể gửi email khôi phục. Vui lòng thử lại sau.',
        500
      );
    }
  }

  async resetCompanyPassword(
    token: string,
    newPassword: string
  ): Promise<void> {
    const company =
      await this.authRepository.findCompanyByResetToken(
        token
      );

    if (!company) {
      throw new AppError(
        'Token khôi phục không hợp lệ hoặc đã hết hạn',
        400
      );
    }

    if (
      company.resetTokenExpiry &&
      new Date() > company.resetTokenExpiry
    ) {
      throw new AppError(
        'Token khôi phục đã hết hạn',
        400
      );
    }

    await this.ensureAccountActive(
      company.id,
      'company'
    );

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await this.authRepository.updateCompanyPasswordAndClearToken(
      company.id,
      hashedPassword
    );
  }
}
