
import {
  Response,
  NextFunction,
} from "express";

import { AuthenticatedRequest } from "@/types";
import { AppError } from "@/middlewares/errorHandler";

import {
  AdminSubscriptionService,
  UpdatePlanInput,
} from "@/services/adminSubscriptionService";

export class AdminSubscriptionController {
  private service = new AdminSubscriptionService();

  private parseId(value: unknown): number {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new AppError("ID không hợp lệ", 400);
    }

    return id;
  }

  getPlans = async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.getAllPlans();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getPlanById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = this.parseId(req.params.id);

      const data = await this.service.getPlanById(id);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  updatePlan = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = this.parseId(req.params.id);

      const allowedKeys = [
        "name",
        "description",
        "price",
        "duration_days",
        "max_active_jobs",
        "ai_cv_scoring",
        "priority_jobs",
        "is_active",
      ];

      const body = req.body;

      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
      ) {
        throw new AppError(
          "Dữ liệu cập nhật không hợp lệ",
          400
        );
      }

      const keys = Object.keys(body);

      if (
        keys.length === 0 ||
        keys.some((key) => !allowedKeys.includes(key))
      ) {
        throw new AppError(
          "Trường cập nhật không hợp lệ",
          400
        );
      }

      if (
        body.name !== undefined &&
        typeof body.name !== "string"
      ) {
        throw new AppError(
          "Tên gói không hợp lệ",
          400
        );
      }

      if (
        body.description !== undefined &&
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        throw new AppError(
          "Mô tả gói không hợp lệ",
          400
        );
      }

      for (const field of [
        "price",
        "duration_days",
        "max_active_jobs",
      ]) {
        if (
          body[field] !== undefined &&
          body[field] !== null &&
          (
            typeof body[field] !== "number" ||
            !Number.isSafeInteger(body[field])
          )
        ) {
          throw new AppError(
            `${field} không hợp lệ`,
            400
          );
        }
      }

      for (const field of [
        "ai_cv_scoring",
        "priority_jobs",
        "is_active",
      ]) {
        if (
          body[field] !== undefined &&
          typeof body[field] !== "boolean"
        ) {
          throw new AppError(
            `${field} phải là true hoặc false`,
            400
          );
        }
      }

      const data = await this.service.updatePlan(
        id,
        body as UpdatePlanInput
      );

      res.json({
        success: true,
        message: "Cập nhật gói dịch vụ thành công",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getSubscriptions = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);
      const search = String(req.query.search ?? "");
      const status = String(
        req.query.status ?? "ALL"
      ).toUpperCase();

      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        throw new AppError(
          "Phân trang không hợp lệ",
          400
        );
      }

      if (
        ![
          "ALL",
          "ACTIVE",
          "EXPIRED",
          "CANCELLED",
        ].includes(status)
      ) {
        throw new AppError(
          "Trạng thái không hợp lệ",
          400
        );
      }

      let planId: number | undefined;

      if (req.query.planId !== undefined) {
        planId = this.parseId(req.query.planId);
      }

      const result =
        await this.service.getSubscriptions(
          page,
          limit,
          search,
          status,
          planId
        );

      res.json({
        success: true,
        data: result.subscriptions,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getStatistics = async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await this.service.getStatistics();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
