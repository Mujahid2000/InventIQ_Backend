import { Router } from "express";
import * as controller from "../controllers/product.controller";
import authMiddleware, { requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", requireRole("admin"), controller.remove);

export default router;
