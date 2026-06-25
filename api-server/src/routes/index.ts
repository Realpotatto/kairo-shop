import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import dashboardRouter from "./dashboard.js";
import botsRouter from "./bots.js";
import marketplaceRouter from "./marketplace.js";
import plansRouter from "./plans.js";
import themesRouter from "./themes.js";
import adminRouter from "./admin.js";
import sheetsRouter from "./sheets.js";
// FIX [Group 4]: Super Admin Code routes
import superAdminRouter from "./superAdmin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(dashboardRouter);
router.use(botsRouter);
router.use(marketplaceRouter);
router.use(plansRouter);
router.use(themesRouter);
router.use(adminRouter);
router.use(sheetsRouter);
// FIX [Group 4]
router.use(superAdminRouter);

export default router;
