import { Router } from "express";
import { getLatest } from "../controllers/logs.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getLatest);

export default router;
