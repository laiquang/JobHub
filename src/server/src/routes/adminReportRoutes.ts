
import { Router } from "express";

import {
  authenticateStrict,
  authorize,
} from "@/middlewares/auth";

import { AdminReportController } from "@/controllers/adminReportController";

const router = Router();

const controller = new AdminReportController();

router.use(
  authenticateStrict,
  authorize("admin")
);

// GET /api/admin/reports
router.get(
  "/",
  controller.getReport
);

// GET /api/admin/reports/export
router.get(
  "/export",
  controller.exportCSV
);

export default router;
