import { Router } from "express";
import { create, getAll, remove, update } from "../controllers/category.controller";
import authMiddleware, { requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getAll);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", requireRole("admin"), remove);

export default router;
