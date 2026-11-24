
import { Router } from "express";

import { AdminPaymentController } from "@/controllers/adminPaymentController";

import {
  authenticateStrict,
  authorize,
} from "@/middlewares/auth";

const router = Router();
const controller = new AdminPaymentController();

// Chỉ tài khoản Admin có JWT hợp lệ được truy cập.
router.use(
  authenticateStrict,
  authorize("admin")
);

// GET /api/admin/payments/stats
router.get(
  "/stats",
  controller.getStatistics
);

// GET /api/admin/payments
router.get(
  "/",
  controller.getAllPayments
);

// GET /api/admin/payments/:id
router.get(
  "/:id",
  controller.getPaymentById
);

export default router;
