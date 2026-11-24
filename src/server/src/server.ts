
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { testConnection } from '@/config/database';
import { setupSwagger } from '@/config/swagger';
import { setupSocket } from '@/config/socket';

import {
  errorHandler,
  notFound,
} from '@/middlewares/errorHandler';

import { handleUploadError } from '@/middlewares/upload';
import { ResponseUtil } from '@/utils/response';
import { EmailService } from '@/services/emailService';

// ==========================================
// IMPORT ROUTES
// ==========================================

// Authentication
import authRoutes from '@/routes/authRoutes';
import adminAuthRoutes from '@/routes/adminAuthRoutes';

// Reference
import referenceRoutes from '@/routes/referenceRoutes';

// Users / Companies
import userRoutes from '@/routes/userRoutes';
import companyRoutes from '@/routes/companyRoutes';

// Jobs
import jobRoutes from '@/routes/jobRoutes';
import jobSaveRoutes from '@/routes/jobSaveRoutes';
import followCompanyRoutes from '@/routes/followCompanyRoutes';
import applyJobRoutes from '@/routes/applyJobRoutes';

// Notifications / CV / Messages
import notificationRoutes from '@/routes/notificationRoutes';
import cvScoringRoutes from '@/routes/cvScoringRoutes';
import userCVRoutes from './routes/userCVRoutes';
import messageRoutes from '@/routes/messageRoutes';

// Subscription / Payment
import subscriptionRoutes from '@/routes/subscriptionRoutes';
import paymentRoutes from '@/routes/paymentRoutes';

// ==========================================
// ADMIN ROUTES
// ==========================================

// Admin Dashboard
import adminDashboardRoutes from '@/routes/adminDashboardRoutes';

// Admin User Management
import adminUserRoutes from '@/routes/adminUserRoutes';

// Admin Company Management
import adminCompanyRoutes from '@/routes/adminCompanyRoutes';

// Admin Job Management - Bước 15
import adminJobRoutes from '@/routes/adminJobRoutes';

// Admin Payment Management - Bước 16
import adminPaymentRoutes from '@/routes/adminPaymentRoutes';

// Admin Subscription Management - Bước 17
import adminSubscriptionRoutes from '@/routes/adminSubscriptionRoutes';

// Admin Reports & Statistics - Bước 18
import adminReportRoutes from '@/routes/adminReportRoutes';

// Admin Activity Logs - Bước 19
import adminActivityLogRoutes from '@/routes/adminActivityLogRoutes';

// ==========================================
// ENVIRONMENT VARIABLES
// ==========================================

dotenv.config();

// ==========================================
// SERVER CLASS
// ==========================================

class Server {
  private app: Application;
  private server: ReturnType<typeof createServer>;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);

    this.port = parseInt(
      process.env.PORT || '5000',
      10
    );

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocket();
    this.initializeErrorHandling();
  }

  // ==========================================
  // INITIALIZE MIDDLEWARES
  // ==========================================

  private initializeMiddlewares(): void {
    // ==========================================
    // SECURITY MIDDLEWARE
    // ==========================================

    this.app.use(
      helmet({
        crossOriginResourcePolicy: {
          policy: 'cross-origin',
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // ==========================================
    // CORS FOR STATIC FILES
    // ==========================================

    this.app.use('/uploads', (req, res, next) => {
      res.header(
        'Access-Control-Allow-Origin',
        '*'
      );

      res.header(
        'Access-Control-Allow-Methods',
        'GET, HEAD, OPTIONS'
      );

      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );

      res.header(
        'Cross-Origin-Resource-Policy',
        'cross-origin'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // ==========================================
    // STATIC FILES
    // ==========================================

    this.app.use(
      '/uploads',
      express.static('uploads', {
        maxAge: '1d',

        cacheControl: true,

        setHeaders: (res, path) => {
          if (
            path.endsWith('.jpg') ||
            path.endsWith('.jpeg')
          ) {
            res.setHeader(
              'Content-Type',
              'image/jpeg'
            );
          } else if (path.endsWith('.png')) {
            res.setHeader(
              'Content-Type',
              'image/png'
            );
          } else if (path.endsWith('.gif')) {
            res.setHeader(
              'Content-Type',
              'image/gif'
            );
          } else if (path.endsWith('.webp')) {
            res.setHeader(
              'Content-Type',
              'image/webp'
            );
          } else if (path.endsWith('.pdf')) {
            res.setHeader(
              'Content-Type',
              'application/pdf'
            );

            res.setHeader(
              'Content-Disposition',
              'attachment'
            );
          } else if (path.endsWith('.doc')) {
            res.setHeader(
              'Content-Type',
              'application/msword'
            );

            res.setHeader(
              'Content-Disposition',
              'attachment'
            );
          } else if (path.endsWith('.docx')) {
            res.setHeader(
              'Content-Type',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            );

            res.setHeader(
              'Content-Disposition',
              'attachment'
            );
          }
        },
      })
    );

    // ==========================================
    // API CORS
    // ==========================================

    this.app.use(
      cors({
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          process.env.CORS_ORIGIN ||
            'http://localhost:3000',
        ],

        credentials: true,

        methods: [
          'GET',
          'POST',
          'PUT',
          'DELETE',
          'PATCH',
          'OPTIONS',
        ],

        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
        ],
      })
    );

    // ==========================================
    // BODY PARSING
    // ==========================================

    this.app.use(
      express.json({
        limit: '10mb',
      })
    );

    this.app.use(
      express.urlencoded({
        extended: true,
        limit: '10mb',
      })
    );

    // ==========================================
    // REQUEST LOGGING
    // ==========================================

    if (
      process.env.NODE_ENV === 'development'
    ) {
      this.app.use(morgan('dev'));
    }
  }

  // ==========================================
  // INITIALIZE ROUTES
  // ==========================================

  private initializeRoutes(): void {
    // ==========================================
    // TEST STATIC FILES
    // ==========================================

    this.app.get(
      '/test-upload',
      (req, res) => {
        res.json({
          message:
            'Static files server is working',

          uploadPath: '/uploads/',

          testImage:
            '/uploads/logos/test.jpg',
        });
      }
    );

    const apiPrefix =
      process.env.API_PREFIX || '/api';

    // ==========================================
    // SWAGGER
    // ==========================================

    setupSwagger(this.app);

    // ==========================================
    // HEALTH CHECK
    // ==========================================

    this.app.get(
      `${apiPrefix}/health`,
      (req, res) => {
        ResponseUtil.success(
          res,
          {
            status: 'OK',

            timestamp:
              new Date().toISOString(),

            uptime: process.uptime(),

            environment:
              process.env.NODE_ENV ||
              'development',

            database: 'Connected',
          },
          'Server đang hoạt động bình thường'
        );
      }
    );

    // ==========================================
    // 1. USER / COMPANY AUTHENTICATION
    // QUAN TRỌNG: PHẢI ĐỨNG TRƯỚC ADMIN
    // ==========================================

    this.app.use(
      apiPrefix,
      authRoutes
    );

    // ==========================================
    // 2. ADMIN AUTHENTICATION
    // ==========================================

    this.app.use(
      apiPrefix,
      adminAuthRoutes
    );

    // ==========================================
    // 3. ADMIN DASHBOARD
    // ==========================================

    this.app.use(
      apiPrefix,
      adminDashboardRoutes
    );

    // ==========================================
    // 4. ADMIN USER MANAGEMENT
    // ==========================================

    this.app.use(
      `${apiPrefix}/admin/users`,
      adminUserRoutes
    );

    // ==========================================
    // 5. ADMIN COMPANY MANAGEMENT
    // ==========================================

    this.app.use(
      `${apiPrefix}/admin/companies`,
      adminCompanyRoutes
    );

    // ==========================================
    // 6. REFERENCE ROUTES
    // ==========================================

    this.app.use(
      apiPrefix,
      referenceRoutes
    );

    // ==========================================
    // 7. USER ROUTES
    // ==========================================

    this.app.use(
      apiPrefix,
      userRoutes
    );

    // ==========================================
    // 8. COMPANY ROUTES
    // ==========================================

    this.app.use(
      apiPrefix,
      companyRoutes
    );

    // ==========================================
    // 9. ADMIN JOB MANAGEMENT
    // ==========================================

    this.app.use(
      `${apiPrefix}/admin/jobs`,
      adminJobRoutes
    );

    // ==========================================
    // 10. ADMIN PAYMENT MANAGEMENT
    // ==========================================

    this.app.use(
      `${apiPrefix}/admin/payments`,
      adminPaymentRoutes
    );

    // ==========================================
    // 11. ADMIN SUBSCRIPTION MANAGEMENT
    // ==========================================

    this.app.use(
      `${apiPrefix}/admin/subscriptions`,
      adminSubscriptionRoutes
    );

    // ==========================================
    // 12. ADMIN REPORTS & STATISTICS
    // ==========================================

    this.app.use(
      `${apiPrefix}/admin/reports`,
      adminReportRoutes
    );

    // ==========================================
    // 13. ADMIN ACTIVITY LOGS - BƯỚC 19
    // ==========================================
    // Lịch sử hoạt động của quản trị viên
    //
    // GET /api/admin/activity-logs
    // GET /api/admin/activity-logs/stats
    //
    // Router tự kiểm tra:
    // - JWT
    // - Quyền Admin
    // - Trạng thái Admin
    // ==========================================

    this.app.use(
      `${apiPrefix}/admin/activity-logs`,
      adminActivityLogRoutes
    );

    // ==========================================
    // 14. JOB ROUTES
    // ==========================================

    this.app.use(
      apiPrefix,
      jobRoutes
    );

    // ==========================================
    // 15. SAVED JOBS
    // ==========================================

    this.app.use(
      `${apiPrefix}/saved-jobs`,
      jobSaveRoutes
    );

    // ==========================================
    // 16. FOLLOWED COMPANIES
    // ==========================================

    this.app.use(
      `${apiPrefix}/followed-companies`,
      followCompanyRoutes
    );

    // ==========================================
    // 17. JOB APPLICATIONS
    // ==========================================

    this.app.use(
      `${apiPrefix}/apply`,
      applyJobRoutes
    );

    // ==========================================
    // 18. NOTIFICATIONS
    // ==========================================

    this.app.use(
      `${apiPrefix}/notifications`,
      notificationRoutes
    );

    // ==========================================
    // 19. CV SCORING
    // ==========================================

    this.app.use(
      apiPrefix,
      cvScoringRoutes
    );

    // ==========================================
    // 20. USER CV
    // ==========================================

    this.app.use(
      `${apiPrefix}/cvs`,
      userCVRoutes
    );

    // ==========================================
    // 21. MESSAGES
    // ==========================================

    this.app.use(
      `${apiPrefix}/conversations`,
      messageRoutes
    );

    // ==========================================
    // 22. SUBSCRIPTIONS (COMPANY)
    // ==========================================

    this.app.use(
      `${apiPrefix}/subscriptions`,
      subscriptionRoutes
    );

    // ==========================================
    // 23. PAYMENTS (SEPAY)
    // ==========================================

    this.app.use(
      `${apiPrefix}/payments`,
      paymentRoutes
    );

    // ==========================================
    // TEST API
    // ==========================================

    this.app.get(
      `${apiPrefix}/test`,
      (req, res) => {
        ResponseUtil.success(
          res,
          {
            message:
              'API Jobify hoạt động thành công!',

            version: '1.0.0',

            swagger:
              `http://localhost:${this.port}/api-docs`,

            features: [
              'Authentication JWT',
              'Clean Architecture',
              'TypeScript',
              'MySQL Database',
              'Swagger Documentation',
              'Reference Data APIs',
              'Admin User Management',
              'Admin Company Management',
              'Admin Job Management',
              'Admin Payment Management',
              'Admin Subscription Management',
              'Admin Reports & Statistics',
              'Admin Activity Logs',
            ],
          },
          'Test API thành công'
        );
      }
    );
  }

  // ==========================================
  // INITIALIZE SOCKET.IO
  // ==========================================

  private initializeSocket(): void {
    setupSocket(this.server);
  }

  // ==========================================
  // ERROR HANDLING
  // ==========================================

  private initializeErrorHandling(): void {
    // Multer upload errors
    this.app.use(handleUploadError);

    // 404 errors
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  // ==========================================
  // START SERVER
  // ==========================================

  public async start(): Promise<void> {
    try {
      // Database connection
      await testConnection();

      // Email connection
      const emailService =
        new EmailService();

      await emailService.verifyConnection();

      // Start HTTP + Socket.IO server
      this.server.listen(
        this.port,
        () => {
          console.log(
            '🚀================================🚀'
          );

          console.log(
            '🌟 Server JobHub đang chạy!'
          );

          console.log(
            `📍 URL: http://localhost:${this.port}`
          );

          console.log(
            `🌐 API: http://localhost:${this.port}${
              process.env.API_PREFIX || '/api'
            }`
          );

          console.log(
            '🔌 Socket.IO: Enabled'
          );

          console.log(
            `📝 Environment: ${
              process.env.NODE_ENV ||
              'development'
            }`
          );

          console.log(
            '🚀================================🚀'
          );
        }
      );
    } catch (error) {
      console.error(
        '❌ Lỗi khởi động server:',
        error
      );

      process.exit(1);
    }
  }
}

// ==========================================
// RUN SERVER
// ==========================================

const server = new Server();

server.start().catch((error) => {
  console.error(
    '💥 Server startup failed:',
    error
  );

  process.exit(1);
});
