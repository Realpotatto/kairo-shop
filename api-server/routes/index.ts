import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import botsRouter from "./bots";
import marketplaceRouter from "./marketplace";
import plansRouter from "./plans";
import themesRouter from "./themes";
import adminRouter from "./admin";

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

export default router;
