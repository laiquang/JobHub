import { Request, Response, NextFunction } from 'express';
import { CVScoringService } from '@/services/cvScoringService';
import { ResponseUtil } from '@/utils/response';
import { AppError } from '@/middlewares/errorHandler';
import { CVScoringRequest } from '@/types';

/**
 * CVScoringController - Xử lý chấm điểm CV với AI
 */
export class CVScoringController {
  private cvScoringService: CVScoringService;

  constructor() {
    this.cvScoringService = new CVScoringService();
  }

  /**
   * @swagger
   * /cv-score:
   *   post:
   *     tags: [CV Scoring]
   *     summary: Chấm điểm CV với AI
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - cvFile
   *               - jobId
   *             properties:
   *               cvFile:
   *                 type: string
   *                 format: binary
   *                 description: File CV (PDF, DOCX, JPG, PNG)
   *               jobId:
   *                 type: integer
   *                 description: ID của công việc để so sánh
   *                 example: 1
   *     responses:
   *       200:
   *         description: Chấm điểm thành công
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Chấm điểm CV thành công"
   *                 data:
   *                   type: object
   *                   properties:
   *                     score:
   *                       type: integer
   *                       example: 85
   *                       description: Điểm số từ 0-100
   *                     summary:
   *                       type: string
   *                       example: "CV có cấu trúc tốt và kinh nghiệm phù hợp với vị trí ứng tuyển."
   *                       description: Tóm tắt đánh giá CV
   *                     suggestions:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ["Thêm kỹ năng JavaScript", "Cải thiện mô tả kinh nghiệm"]
   *                     analysis:
   *                       type: object
   *                       properties:
   *                         strengths:
   *                           type: array
   *                           items:
   *                             type: string
   *                         weaknesses:
   *                           type: array
   *                           items:
   *                             type: string
   *                         matchingSkills:
   *                           type: array
   *                           items:
   *                             type: string
   *                         missingSkills:
   *                           type: array
   *                           items:
   *                             type: string
   *                     jobMatch:
   *                       type: object
   *                       properties:
   *                         jobTitle:
   *                           type: string
   *                         companyName:
   *                           type: string
   *                         requirements:
   *                           type: array
   *                           items:
   *                             type: string
   *       400:
   *         description: Dữ liệu không hợp lệ
   *       404:
   *         description: Không tìm thấy công việc
   *       500:
   *         description: Lỗi server
   */
  scoreCV = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobId = req.body.jobId
        ? parseInt(req.body.jobId)
        : undefined;

      const customJobDescription =
        req.body.customJobDescription?.trim();
      console.log('📝 CV Scoring Request:', {
      hasFile: !!req.file,
      jobId,
      hasCustomJobDescription: !!customJobDescription,
      fileInfo: req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : null,
    });

      // Validate input
      if (!req.file) {
        console.log('❌ No file uploaded');
        throw new AppError('Vui lòng tải lên file CV', 400);
      }


      if (
        !jobId &&
        !customJobDescription
      ) {
        throw new AppError(
          'Vui lòng chọn công việc hoặc nhập Job Description',
          400
        );
      }
      // Validate file type (already done by multer, but double check)
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg', 
        'image/png'
      ];

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        console.log('❌ Invalid file type:', req.file.mimetype);
        throw new AppError('Chỉ hỗ trợ file PDF, DOCX, JPG, PNG', 400);
      }

      // Validate file size (10MB)
      if (req.file.size > 10 * 1024 * 1024) {
        console.log('❌ File too large:', req.file.size);
        throw new AppError('File không được vượt quá 10MB', 400);
      }

      console.log('✅ Validation passed, processing CV...');

      const scoringRequest: CVScoringRequest = {
        cvFile: req.file,
        jobId,
        customJobDescription,
      };

      const result = await this.cvScoringService.scoreCV(scoringRequest);

      console.log('✅ CV scoring completed successfully');

      ResponseUtil.success(
        res,
        result,
        'Chấm điểm CV thành công'
      );

    } catch (error) {
      console.error('❌ CV Scoring Error:', error);
      next(error);
    }
  };

  /**
   * @swagger
   * /cv-score/demo:
   *   post:
   *     tags: [CV Scoring]
   *     summary: Demo chấm điểm CV (không cần file)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - jobId
   *             properties:
   *               jobId:
   *                 type: integer
   *                 description: ID của công việc để so sánh
   *                 example: 1
   *     responses:
   *       200:
   *         description: Demo chấm điểm thành công
   */
  demoScoreCV = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🎮 Demo CV Scoring Request:', req.body);
      
      const jobId = parseInt(req.body.jobId);
      if (!jobId || isNaN(jobId)) {
        throw new AppError('Job ID không hợp lệ', 400);
      }

      console.log('🔄 Processing demo CV scoring for job ID:', jobId);
      const result = await this.cvScoringService.demoScoreCV(jobId);

      console.log('✅ Demo CV scoring completed successfully');
      ResponseUtil.success(
        res,
        result,
        'Demo chấm điểm CV thành công với Modern Gemini AI'
      );

    } catch (error) {
      console.error('❌ Demo CV scoring error:', error);
      next(error);
    }
  };

  /**
   * Test Gemini AI connection
   */
  testGemini = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { GeminiService } = require('../services/geminiService');
      const geminiService = new GeminiService();
      
      const isConnected = await geminiService.testConnection();
      
      ResponseUtil.success(
        res,
        { connected: isConnected, model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' },
        isConnected ? 'Gemini AI kết nối thành công' : 'Gemini AI kết nối thất bại'
      );

    } catch (error) {
      next(error);
    }
  };
}



