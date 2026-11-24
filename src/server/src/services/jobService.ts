
import { JobRepository } from '@/repositories/jobRepository';
import { AppError } from '@/middlewares/errorHandler';
import { pool } from '@/config/database';

import { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

import {
  Job,
  CreateJobDTO,
  UpdateJobDTO,
  JobQueryParams,
  JobWithDetails,
  PaginatedResponse
} from '@/types';

import { JobModel } from '@/models/Job';

/**
 * JobService - Business logic cho Job operations
 *
 * FREE:
 * - Tối đa 2 tin tuyển dụng đang hoạt động.
 *
 * PREMIUM:
 * - Không giới hạn tin khi gói còn hạn.
 *
 * Premium hết hạn:
 * - Áp dụng quyền FREE.
 * - Không tự động xóa hoặc ẩn tin cũ.
 */
export class JobService {
  private jobRepository: JobRepository;

  constructor() {
    this.jobRepository = new JobRepository();
  }

  /**
   * Kiểm tra giới hạn đăng tin trong transaction.
   *
   * Khóa dòng companies để tuần tự hóa các thao tác
   * tạo và khôi phục tin của cùng một công ty.
   */
  private async checkPostingLimit(
    connection: PoolConnection,
    companyId: number
  ): Promise<void> {
    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      throw new AppError(
        'ID công ty không hợp lệ',
        400
      );
    }

    // Khóa công ty để chống hai request cùng đăng vượt giới hạn.
    const [companies] =
      await connection.query<RowDataPacket[]>(
        `SELECT id
         FROM companies
         WHERE id = ?
         FOR UPDATE`,
        [companyId]
      );

    if (companies.length === 0) {
      throw new AppError(
        'Không tìm thấy công ty',
        404
      );
    }

    // Chỉ Premium ACTIVE và còn hạn mới được không giới hạn.
    const [premium] =
      await connection.query<RowDataPacket[]>(
        `SELECT cs.id
         FROM company_subscriptions cs
         INNER JOIN subscription_plans sp
           ON sp.id = cs.plan_id
         WHERE cs.company_id = ?
           AND cs.status = 'ACTIVE'
           AND sp.code = 'PREMIUM'
           AND cs.start_date <= NOW()
           AND cs.end_date > NOW()
         LIMIT 1`,
        [companyId]
      );

    if (premium.length > 0) {
      return;
    }

    // Không có Premium hợp lệ => áp dụng giới hạn FREE.
    const [rows] =
      await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM jobs
         WHERE idCompany = ?
           AND deletedAt IS NULL`,
        [companyId]
      );

    const activeJobs = Number(rows[0]?.total ?? 0);
    const FREE_LIMIT = 2;

    if (activeJobs >= FREE_LIMIT) {
      throw new AppError(
        'Gói FREE chỉ được có tối đa 2 tin tuyển dụng đang hoạt động. Vui lòng nâng cấp Premium để đăng không giới hạn.',
        403
      );
    }
  }

  /**
   * Lấy danh sách tất cả công việc.
   */
  async getAllJobs(
    params: JobQueryParams,
    userId?: number
  ): Promise<PaginatedResponse<JobWithDetails>> {
    return await this.jobRepository.findAll(
      params,
      userId
    );
  }

  /**
   * Lấy chi tiết công việc.
   */
  async getJobById(
    id: number,
    userId?: number
  ): Promise<JobWithDetails | null> {
    const job =
      await this.jobRepository.findById(id, userId);

    if (!job) {
      throw new AppError(
        'Không tìm thấy công việc',
        404
      );
    }

    return job;
  }

  /**
   * Tạo công việc mới.
   *
   * Validate dữ liệu, kiểm tra giới hạn gói
   * và tạo job trong cùng transaction.
   */
  async createJob(
    jobData: CreateJobDTO
  ): Promise<Job> {
    const errors =
      JobModel.validateCreateJob(jobData);

    if (errors.length > 0) {
      throw new AppError(
        `Dữ liệu không hợp lệ: ${errors.join(', ')}`,
        400
      );
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await this.checkPostingLimit(
        connection,
        jobData.idCompany
      );

      const newJob =
        await this.jobRepository.create(
          jobData,
          connection
        );

      await connection.commit();

      return newJob;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Cập nhật thông tin công việc.
   */
  async updateJob(
    id: number,
    jobData: UpdateJobDTO,
    companyId: number
  ): Promise<JobWithDetails | null> {
    const existingJob =
      await this.jobRepository.findById(id);

    if (!existingJob) {
      throw new AppError(
        'Không tìm thấy công việc',
        404
      );
    }

    if (existingJob.idCompany !== companyId) {
      throw new AppError(
        'Bạn không có quyền cập nhật công việc này',
        403
      );
    }

    const errors =
      JobModel.validateUpdateJob(jobData);

    if (errors.length > 0) {
      throw new AppError(
        `Dữ liệu không hợp lệ: ${errors.join(', ')}`,
        400
      );
    }

    return await this.jobRepository.update(
      id,
      jobData
    );
  }

  /**
   * Xóa cứng công việc.
   */
  async deleteJob(
    id: number,
    companyId: number
  ): Promise<void> {
    const existingJob =
      await this.jobRepository.findById(id);

    if (!existingJob) {
      throw new AppError(
        'Không tìm thấy công việc',
        404
      );
    }

    if (existingJob.idCompany !== companyId) {
      throw new AppError(
        'Bạn không có quyền xóa công việc này',
        403
      );
    }

    const deleted =
      await this.jobRepository.delete(id);

    if (!deleted) {
      throw new AppError(
        'Xóa công việc thất bại',
        500
      );
    }
  }

  /**
   * Ẩn công việc.
   *
   * Tin đã ẩn sẽ không tính vào giới hạn FREE.
   */
  async hideJob(
    id: number,
    companyId: number
  ): Promise<void> {
    const existingJob =
      await this.jobRepository.findById(id);

    if (!existingJob) {
      throw new AppError(
        'Không tìm thấy công việc',
        404
      );
    }

    if (existingJob.idCompany !== companyId) {
      throw new AppError(
        'Bạn không có quyền ẩn công việc này',
        403
      );
    }

    if (existingJob.deletedAt) {
      throw new AppError(
        'Công việc đã được ẩn trước đó',
        400
      );
    }

    const hidden =
      await this.jobRepository.hide(id);

    if (!hidden) {
      throw new AppError(
        'Ẩn công việc thất bại',
        500
      );
    }
  }

  /**
   * Khôi phục công việc đã ẩn.
   *
   * Kiểm tra quyền sở hữu và giới hạn gói
   * trước khi khôi phục, trong cùng transaction.
   */
  async unhideJob(
    id: number,
    companyId: number
  ): Promise<void> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Khóa công ty trước, cùng thứ tự với createJob.
      const [companies] =
        await connection.query<RowDataPacket[]>(
          `SELECT id
           FROM companies
           WHERE id = ?
           FOR UPDATE`,
          [companyId]
        );

      if (companies.length === 0) {
        throw new AppError(
          'Không tìm thấy công ty',
          404
        );
      }

      // Khóa job cần khôi phục.
      const [jobs] =
        await connection.query<RowDataPacket[]>(
          `SELECT id, idCompany, deletedAt
           FROM jobs
           WHERE id = ?
           FOR UPDATE`,
          [id]
        );

      if (jobs.length === 0) {
        throw new AppError(
          'Không tìm thấy công việc',
          404
        );
      }

      if (
        Number(jobs[0].idCompany) !== companyId
      ) {
        throw new AppError(
          'Bạn không có quyền khôi phục công việc này',
          403
        );
      }

      if (!jobs[0].deletedAt) {
        throw new AppError(
          'Công việc không ở trạng thái ẩn',
          400
        );
      }

      await this.checkPostingLimit(
        connection,
        companyId
      );

      const unhidden =
        await this.jobRepository.unhide(
          id,
          connection
        );

      if (!unhidden) {
        throw new AppError(
          'Khôi phục công việc thất bại',
          500
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Lấy danh sách công việc của công ty.
   */
  async getJobsByCompany(
    companyId: number,
    params: JobQueryParams
  ): Promise<PaginatedResponse<JobWithDetails>> {
    return await this.jobRepository.findByCompany(
      companyId,
      params
    );
  }

  /**
   * Lấy thống kê công việc.
   */
  async getJobStats(): Promise<{
    totalJobs: number;
    activeJobs: number;
    newJobsThisMonth: number;
    jobsByField: {
      fieldName: string;
      count: number;
    }[];
    jobsByProvince: {
      provinceName: string;
      count: number;
    }[];
  }> {
    return await this.jobRepository.getStats();
  }

  /**
   * Kiểm tra công việc có tồn tại và hoạt động không.
   */
  async checkJobExists(
    id: number
  ): Promise<boolean> {
    const job =
      await this.jobRepository.findById(id);

    return !!job && JobModel.isActive(job);
  }

  /**
   * Kiểm tra công ty có sở hữu job không.
   */
  async checkCompanyOwnsJob(
    jobId: number,
    companyId: number
  ): Promise<boolean> {
    const job =
      await this.jobRepository.findById(jobId);

    return !!job && job.idCompany === companyId;
  }
}
