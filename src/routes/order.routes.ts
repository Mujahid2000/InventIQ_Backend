import { Router } from "express";
import * as controller from "../controllers/order.controller";
import authMiddleware, { requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.put("/:id/status", controller.updateStatus);
router.put("/:id/cancel", controller.cancel);
router.delete("/:id", requireRole("admin"), controller.remove);

export default router;
