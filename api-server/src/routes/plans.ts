import { Router } from "express";
import { db, plansTable, userPlansTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "./auth";

const router = Router();

// GET /api/plans
router.get("/plans", requireAuth, async (req: any, res) => {
  try {
    const plans = await db.select().from(plansTable);
    res.json(plans.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      interval: p.interval,
      features: p.features,
      maxBots: p.maxBots,
      maxPlugins: p.maxPlugins,
      maxUsers: p.maxUsers,
      popular: p.popular,
    })));
  } catch (err) {
    req.log.error({ err }, "List plans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/plans/current
router.get("/plans/current", requireAuth, async (req: any, res) => {
  try {
    const userPlans = await db.select().from(userPlansTable).where(eq(userPlansTable.userId, req.userId)).limit(1);
    if (!userPlans[0]) {
      res.json({
        planId: "free",
        planName: "Free",
        status: "active",
        expiresAt: null,
        renewsAt: null,
      });
      return;
    }
    const up = userPlans[0];
    res.json({
      planId: up.planId,
      planName: up.planName,
      status: up.status,
      expiresAt: up.expiresAt?.toISOString() ?? null,
      renewsAt: up.renewsAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Get current plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/plans/subscribe
router.post("/plans/subscribe", requireAuth, async (req: any, res) => {
  try {
    const { planId } = req.body;
    const plans = await db.select().from(plansTable).where(eq(plansTable.id, planId)).limit(1);
    if (!plans[0]) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    const plan = plans[0];
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (plan.interval === "yearly" ? 12 : 1));
    const renewsAt = new Date(expiresAt);

    // Update or insert user plan
    const existing = await db.select().from(userPlansTable).where(eq(userPlansTable.userId, req.userId)).limit(1);
    let userPlan;
    if (existing[0]) {
      [userPlan] = await db.update(userPlansTable)
        .set({ planId, planName: plan.name, status: "active", expiresAt, renewsAt })
        .where(eq(userPlansTable.userId, req.userId))
        .returning();
    } else {
      [userPlan] = await db.insert(userPlansTable).values({
        id: crypto.randomUUID(),
        userId: req.userId,
        planId,
        planName: plan.name,
        status: "active",
        expiresAt,
        renewsAt,
      }).returning();
    }
    // Update user's plan field
    await db.update(usersTable).set({ plan: planId }).where(eq(usersTable.id, req.userId));

    res.json({
      planId: userPlan.planId,
      planName: userPlan.planName,
      status: userPlan.status,
      expiresAt: userPlan.expiresAt?.toISOString() ?? null,
      renewsAt: userPlan.renewsAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Subscribe to plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
