import { Router } from "express";
import { getAll, remove, update } from "../controllers/restock.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getAll);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
