
import { Router } from "express";

import { AdminSubscriptionController } from "@/controllers/adminSubscriptionController";

import {
  authenticateStrict,
  authorize,
} from "@/middlewares/auth";

const router = Router();

const controller = new AdminSubscriptionController();

// Chỉ Admin có JWT hợp lệ được truy cập.
router.use(
  authenticateStrict,
  authorize("admin")
);

// GET /api/admin/subscriptions/stats
router.get(
  "/stats",
  controller.getStatistics
);

// GET /api/admin/subscriptions/plans
router.get(
  "/plans",
  controller.getPlans
);

// GET /api/admin/subscriptions/plans/:id
router.get(
  "/plans/:id",
  controller.getPlanById
);

// PATCH /api/admin/subscriptions/plans/:id
router.patch(
  "/plans/:id",
  controller.updatePlan
);

// GET /api/admin/subscriptions
router.get(
  "/",
  controller.getSubscriptions
);

export default router;
