
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/types";
import { AppError } from "@/middlewares/errorHandler";
import { AdminPaymentService } from "@/services/adminPaymentService";

export class AdminPaymentController {
  private service = new AdminPaymentService();

  getAllPayments = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
          "Tham số phân trang không hợp lệ",
          400
        );
      }

      if (
        ![
          "ALL",
          "PENDING",
          "PAID",
          "FAILED",
          "EXPIRED",
        ].includes(status)
      ) {
        throw new AppError(
          "Trạng thái thanh toán không hợp lệ",
          400
        );
      }

      const result = await this.service.getAllPayments(
        page,
        limit,
        search,
        status
      );

      res.status(200).json({
        success: true,
        data: result.payments,
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
  ): Promise<void> => {
    try {
      const data = await this.service.getStatistics();

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AppError(
          "ID giao dịch không hợp lệ",
          400
        );
      }

      const data = await this.service.getPaymentById(id);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
