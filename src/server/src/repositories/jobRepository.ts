
import { pool } from '@/config/database';

import {
  Job,
  CreateJobDTO,
  UpdateJobDTO,
  JobQueryParams,
  JobWithDetails,
  PaginatedResponse
} from '@/types';

import { JobModel } from '@/models/Job';

import {
  RowDataPacket,
  ResultSetHeader
} from 'mysql2';

import type { PoolConnection } from 'mysql2/promise';

/**
 * JobRepository - Xử lý truy vấn database cho Job
 */
export class JobRepository {

  /**
   * Tìm job theo ID với thông tin chi tiết.
   * Không lấy job đã ẩn.
   */
  async findById(
    id: number,
    userId?: number
  ): Promise<JobWithDetails | null> {
    let query = `
      SELECT
        j.*,
        c.nameCompany,
        c.avatarPic AS companyAvatar,
        c.scale,
        c.web,
        f.name AS fieldName,
        f.typeField,
        p.name AS provinceName,
        p.nameWithType AS provinceFullName
    `;

    if (userId) {
      query += `,
        CASE WHEN sj.id IS NOT NULL
          THEN TRUE ELSE FALSE END AS isSaved,
        CASE WHEN aj.id IS NOT NULL
          THEN TRUE ELSE FALSE END AS isApplied
      `;
    }

    query += `
      FROM jobs j
      LEFT JOIN companies c
        ON j.idCompany = c.id
      LEFT JOIN fields f
        ON j.idField = f.id
      LEFT JOIN provinces p
        ON j.idProvince = p.id
    `;

    if (userId) {
      query += `
        LEFT JOIN save_job sj
          ON j.id = sj.idJob
          AND sj.idUser = ?
          AND sj.deletedAt IS NULL
        LEFT JOIN apply_job aj
          ON j.id = aj.idJob
          AND aj.idUser = ?
          AND aj.deletedAt IS NULL
      `;
    }

    query += `
      WHERE j.id = ?
        AND j.deletedAt IS NULL
    `;

    const params = userId
      ? [userId, userId, id]
      : [id];

    const [rows] =
      await pool.execute<RowDataPacket[]>(
        query,
        params
      );

    if (rows.length === 0) {
      return null;
    }

    return this.mapJobDetails(rows[0], userId);
  }

  /**
   * Tìm job theo ID, bao gồm cả job đã ẩn.
   */
  async findByIdIncludingDeleted(
    id: number,
    userId?: number
  ): Promise<JobWithDetails | null> {
    let query = `
      SELECT
        j.*,
        c.nameCompany,
        c.avatarPic AS companyAvatar,
        c.scale,
        c.web,
        f.name AS fieldName,
        f.typeField,
        p.name AS provinceName,
        p.nameWithType AS provinceFullName
    `;

    if (userId) {
      query += `,
        CASE WHEN sj.id IS NOT NULL
          THEN TRUE ELSE FALSE END AS isSaved,
        CASE WHEN aj.id IS NOT NULL
          THEN TRUE ELSE FALSE END AS isApplied
      `;
    }

    query += `
      FROM jobs j
      LEFT JOIN companies c
        ON j.idCompany = c.id
      LEFT JOIN fields f
        ON j.idField = f.id
      LEFT JOIN provinces p
        ON j.idProvince = p.id
    `;

    if (userId) {
      query += `
        LEFT JOIN save_job sj
          ON j.id = sj.idJob
          AND sj.idUser = ?
          AND sj.deletedAt IS NULL
        LEFT JOIN apply_job aj
          ON j.id = aj.idJob
          AND aj.idUser = ?
          AND aj.deletedAt IS NULL
      `;
    }

    query += `
      WHERE j.id = ?
    `;

    const params = userId
      ? [userId, userId, id]
      : [id];

    const [rows] =
      await pool.execute<RowDataPacket[]>(
        query,
        params
      );

    if (rows.length === 0) {
      return null;
    }

    return this.mapJobDetails(rows[0], userId);
  }

  /**
   * Chuyển dữ liệu SQL thành JobWithDetails.
   */
  private mapJobDetails(
    row: RowDataPacket,
    userId?: number
  ): JobWithDetails {
    const job = JobModel.fromRow(row);

    return {
      ...job,
      company: {
        id: row.idCompany,
        nameCompany: row.nameCompany,
        avatarPic: row.companyAvatar,
        scale: row.scale,
        web: row.web
      },
      field: {
        id: row.idField,
        name: row.fieldName,
        typeField: row.typeField
      },
      province: {
        id: row.idProvince,
        name: row.provinceName,
        nameWithType: row.provinceFullName
      },
      isSaved: userId
        ? Boolean(row.isSaved)
        : false,
      isApplied: userId
        ? Boolean(row.isApplied)
        : false
    } as JobWithDetails;
  }

  /**
   * Tạo job mới.
   *
   * Khi có connection:
   * - INSERT bằng connection của transaction.
   * - SELECT job mới cũng bằng connection đó.
   *
   * Khi không có connection:
   * - Sử dụng pool như trước.
   */
  async create(
    jobData: CreateJobDTO,
    connection?: PoolConnection
  ): Promise<Job> {
    const jobRow = JobModel.toRow(jobData);

    const db = connection ?? pool;

    const [result] =
      await db.execute<ResultSetHeader>(
        `INSERT INTO jobs (
          idCompany,
          idField,
          idProvince,
          nameJob,
          request,
          \`desc\`,
          other,
          salaryMin,
          salaryMax,
          sex,
          typeWork,
          education,
          experience,
          createdAt
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        )`,
        [
          jobRow.idCompany,
          jobRow.idField,
          jobRow.idProvince,
          jobRow.nameJob,
          jobRow.request,
          jobRow.desc,
          jobRow.other,
          jobRow.salaryMin,
          jobRow.salaryMax,
          jobRow.sex,
          jobRow.typeWork,
          jobRow.education,
          jobRow.experience
        ]
      );

    const [rows] =
      await db.execute<RowDataPacket[]>(
        `SELECT *
         FROM jobs
         WHERE id = ?`,
        [result.insertId]
      );

    if (rows.length === 0) {
      throw new Error(
        'Không thể tạo job mới'
      );
    }

    return JobModel.fromRow(rows[0]);
  }

  /**
   * Cập nhật job.
   */
  async update(
    id: number,
    jobData: UpdateJobDTO
  ): Promise<JobWithDetails | null> {
    const jobRow = JobModel.toRow(jobData);

    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(jobRow).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          key !== 'id' &&
          key !== 'createdAt'
        ) {
          if (key === 'desc') {
            fields.push('`desc` = ?');
          } else {
            fields.push(`${key} = ?`);
          }

          values.push(value);
        }
      }
    );

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const [result] =
      await pool.execute<ResultSetHeader>(
        `UPDATE jobs
         SET ${fields.join(', ')}
         WHERE id = ?
           AND deletedAt IS NULL`,
        values
      );

    return result.affectedRows > 0
      ? this.findById(id)
      : null;
  }

  /**
   * Xóa cứng job.
   */
  async delete(id: number): Promise<boolean> {
    const [result] =
      await pool.execute<ResultSetHeader>(
        `DELETE FROM jobs
         WHERE id = ?`,
        [id]
      );

    return result.affectedRows > 0;
  }

  /**
   * Ẩn job.
   */
  async hide(id: number): Promise<boolean> {
    const [result] =
      await pool.execute<ResultSetHeader>(
        `UPDATE jobs
         SET deletedAt = NOW()
         WHERE id = ?
           AND deletedAt IS NULL`,
        [id]
      );

    return result.affectedRows > 0;
  }

  /**
   * Khôi phục job đã ẩn.
   *
   * Hỗ trợ connection để chạy trong transaction
   * của JobService.
   */
  async unhide(
    id: number,
    connection?: PoolConnection
  ): Promise<boolean> {
    const db = connection ?? pool;

    const [result] =
      await db.execute<ResultSetHeader>(
        `UPDATE jobs
         SET deletedAt = NULL
         WHERE id = ?
           AND deletedAt IS NOT NULL`,
        [id]
      );

    return result.affectedRows > 0;
  }

  /**
   * Tìm jobs với filter và pagination.
   */
  async findAll(
    params: JobQueryParams,
    userId?: number
  ): Promise<PaginatedResponse<JobWithDetails>> {
    let whereClause =
      'WHERE j.deletedAt IS NULL';

    const queryParams: Array<string | number> = [];

    if (params.idField) {
      whereClause += ' AND j.idField = ?';
      queryParams.push(params.idField);
    }

    if (params.idProvince) {
      whereClause += ' AND j.idProvince = ?';
      queryParams.push(params.idProvince);
    }

    if (params.negotiable) {
      whereClause += `
        AND j.salaryMin IS NULL
        AND j.salaryMax IS NULL
      `;
    } else if (
      params.salaryMin ||
      params.salaryMax
    ) {
      whereClause += `
        AND j.salaryMin IS NOT NULL
        AND j.salaryMax IS NOT NULL
      `;

      if (params.salaryMin) {
        whereClause += ' AND j.salaryMin >= ?';
        queryParams.push(params.salaryMin);
      }

      if (params.salaryMax) {
        whereClause += ' AND j.salaryMax <= ?';
        queryParams.push(params.salaryMax);
      }
    }

    if (params.typeWork) {
      whereClause += ' AND j.typeWork = ?';
      queryParams.push(params.typeWork);
    }

    if (params.education) {
      whereClause += ' AND j.education = ?';
      queryParams.push(params.education);
    }

    if (params.experience) {
      whereClause += ' AND j.experience = ?';
      queryParams.push(params.experience);
    }

    if (params.search) {
      whereClause += `
        AND (
          j.nameJob LIKE ?
          OR j.request LIKE ?
          OR j.\`desc\` LIKE ?
          OR c.nameCompany LIKE ?
        )
      `;

      const searchTerm = `%${params.search}%`;

      queryParams.push(
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm
      );
    }

    // Đếm tổng số bản ghi.
    const [countRows] =
      await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM jobs j
         LEFT JOIN companies c
           ON j.idCompany = c.id
         ${whereClause}`,
        queryParams
      );

    const total = Number(
      countRows[0]?.total ?? 0
    );

    // Sắp xếp.
    let orderColumn = 'j.createdAt';

    switch (params.sortBy) {
      case 'salary':
        orderColumn = 'j.salaryMax';
        break;

      case 'company':
        orderColumn = 'c.nameCompany';
        break;

      default:
        orderColumn = 'j.createdAt';
        break;
    }

    const orderDirection =
      params.sortOrder === 'ASC'
        ? 'ASC'
        : 'DESC';

    let query = `
      SELECT
        j.*,
        c.nameCompany,
        c.avatarPic AS companyAvatar,
        c.scale,
        c.web,
        f.name AS fieldName,
        f.typeField,
        p.name AS provinceName,
        p.nameWithType AS provinceFullName,
        (
          SELECT COUNT(*)
          FROM apply_job
          WHERE idJob = j.id
            AND deletedAt IS NULL
        ) AS appliedCount
    `;

    if (userId) {
      query += `,
        CASE WHEN sj.id IS NOT NULL
          THEN TRUE ELSE FALSE END AS isSaved,
        CASE WHEN aj.id IS NOT NULL
          THEN TRUE ELSE FALSE END AS isApplied
      `;
    }

    query += `
      FROM jobs j
      LEFT JOIN companies c
        ON j.idCompany = c.id
      LEFT JOIN fields f
        ON j.idField = f.id
      LEFT JOIN provinces p
        ON j.idProvince = p.id
    `;

    const selectParams: Array<string | number> = [];

    if (userId) {
      query += `
        LEFT JOIN save_job sj
          ON j.id = sj.idJob
          AND sj.idUser = ?
          AND sj.deletedAt IS NULL
        LEFT JOIN apply_job aj
          ON j.id = aj.idJob
          AND aj.idUser = ?
          AND aj.deletedAt IS NULL
      `;

      selectParams.push(userId, userId);
    }

    query += `
      ${whereClause}
      ORDER BY ${orderColumn} ${orderDirection}
    `;

    const page = Math.max(
      1,
      Number(params.page) || 1
    );

    const limit = Math.max(
      1,
      Number(params.limit) || 20
    );

    const offset = (page - 1) * limit;

    query += ' LIMIT ? OFFSET ?';

    const [rows] =
      await pool.query<RowDataPacket[]>(
        query,
        [
          ...selectParams,
          ...queryParams,
          limit,
          offset
        ]
      );

    const jobs = rows.map((row) => {
      const job = this.mapJobDetails(
        row,
        userId
      );

      return {
        ...job,
        appliedCount: Number(
          row.appliedCount ?? 0
        )
      } as JobWithDetails;
    });

    return {
      data: jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Tìm jobs của một công ty.
   * Bao gồm cả job đã ẩn.
   */
  async findByCompany(
    companyId: number,
    params: JobQueryParams
  ): Promise<PaginatedResponse<JobWithDetails>> {
    const [countRows] =
      await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM jobs
         WHERE idCompany = ?`,
        [companyId]
      );

    const total = Number(
      countRows[0]?.total ?? 0
    );

    const page = Math.max(
      1,
      Number(params.page) || 1
    );

    const limit = Math.max(
      1,
      Number(params.limit) || 20
    );

    const offset = (page - 1) * limit;

    const [rows] =
      await pool.query<RowDataPacket[]>(
        `SELECT
          j.*,
          c.nameCompany,
          c.avatarPic AS companyAvatar,
          c.scale,
          c.web,
          f.name AS fieldName,
          f.typeField,
          p.name AS provinceName,
          p.nameWithType AS provinceFullName,
          (
            SELECT COUNT(*)
            FROM apply_job
            WHERE idJob = j.id
              AND deletedAt IS NULL
          ) AS appliedCount
         FROM jobs j
         LEFT JOIN companies c
           ON j.idCompany = c.id
         LEFT JOIN fields f
           ON j.idField = f.id
         LEFT JOIN provinces p
           ON j.idProvince = p.id
         WHERE j.idCompany = ?
         ORDER BY j.createdAt DESC
         LIMIT ? OFFSET ?`,
        [companyId, limit, offset]
      );

    const jobs = rows.map((row) => {
      const job = this.mapJobDetails(row);

      return {
        ...job,
        appliedCount: Number(
          row.appliedCount ?? 0
        )
      } as JobWithDetails;
    });

    return {
      data: jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Lấy thống kê jobs.
   */
  async getStats(): Promise<{
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
    // Tổng số jobs và số jobs chưa bị ẩn.
    const [jobRows] =
      await pool.execute<RowDataPacket[]>(
        `SELECT
          COUNT(*) AS totalJobs,
          SUM(
            CASE
              WHEN deletedAt IS NULL
              THEN 1
              ELSE 0
            END
          ) AS activeJobs
         FROM jobs`
      );

    const totalJobs = Number(
      jobRows[0]?.totalJobs ?? 0
    );

    const activeJobs = Number(
      jobRows[0]?.activeJobs ?? 0
    );

    // Jobs mới trong tháng.
    const [newRows] =
      await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM jobs
         WHERE YEAR(createdAt) = YEAR(CURDATE())
           AND MONTH(createdAt) = MONTH(CURDATE())
           AND deletedAt IS NULL`
      );

    const newJobsThisMonth = Number(
      newRows[0]?.total ?? 0
    );

    // Thống kê theo lĩnh vực.
    const [fieldRows] =
      await pool.execute<RowDataPacket[]>(
        `SELECT
          f.name AS fieldName,
          COUNT(j.id) AS count
         FROM fields f
         LEFT JOIN jobs j
           ON f.id = j.idField
           AND j.deletedAt IS NULL
         GROUP BY f.id, f.name
         ORDER BY count DESC
         LIMIT 10`
      );

    const jobsByField = fieldRows.map(
      (row) => ({
        fieldName: row.fieldName,
        count: Number(row.count ?? 0)
      })
    );

    // Thống kê theo tỉnh/thành phố.
    const [provinceRows] =
      await pool.execute<RowDataPacket[]>(
        `SELECT
          p.name AS provinceName,
          COUNT(j.id) AS count
         FROM provinces p
         LEFT JOIN jobs j
           ON p.id = j.idProvince
           AND j.deletedAt IS NULL
         GROUP BY p.id, p.name
         ORDER BY count DESC
         LIMIT 10`
      );

    const jobsByProvince = provinceRows.map(
      (row) => ({
        provinceName: row.provinceName,
        count: Number(row.count ?? 0)
      })
    );

    return {
      totalJobs,
      activeJobs,
      newJobsThisMonth,
      jobsByField,
      jobsByProvince
    };
  }
}

export const jobRepository = new JobRepository();
