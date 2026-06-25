import { logger } from "../lib/logger";
import { Router } from "express";
import { db, botsTable, usersTable, activityTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

// GET /api/dashboard/stats
router.get("/dashboard/stats", requireAuth, async (req: any, res) => {
  try {
    const bots = await db.select().from(botsTable).where(eq(botsTable.userId, req.userId));
    const activeBots = bots.filter(b => b.status === "active").length;
    const totalUsers = bots.reduce((acc, b) => acc + b.userCount, 0);
    const totalMessages = bots.reduce((acc, b) => acc + b.messageCount, 0);
    res.json({
      totalBots: bots.length,
      activeBots,
      totalUsers,
      totalMessages,
      totalRevenue: 0,
      botsChange: 12.5,
      usersChange: 8.3,
      messagesChange: 23.1,
    });
  } catch (err) {
    logger.error({ err }, "Dashboard stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/activity
router.get("/dashboard/activity", requireAuth, async (req: any, res) => {
  try {
    const items = await db.select().from(activityTable)
      .where(eq(activityTable.userId, req.userId))
      .orderBy(desc(activityTable.createdAt))
      .limit(20);
    res.json(items.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      botName: item.botName,
      createdAt: item.createdAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "Dashboard activity error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
