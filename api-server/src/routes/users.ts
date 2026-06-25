import { logger } from "../lib/logger";
import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "./auth";
import { syncUserUpsert } from "../lib/sheetsSync";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "irforge_salt").digest("hex");
}

// PATCH /api/users/profile
router.patch("/users/profile", requireAuth, async (req: any, res) => {
  try {
    const { name, avatar, bio, telegramUsername } = req.body;
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (bio !== undefined) updateData.bio = bio;
    if (telegramUsername !== undefined) updateData.telegramUsername = telegramUsername;
    const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.userId)).returning();
    syncUserUpsert({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, plan: updated.plan, status: updated.status, bio: updated.bio, telegramUsername: updated.telegramUsername, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar,
      role: updated.role,
      plan: updated.plan,
      botCount: 0,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Update profile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/password
router.patch("/users/password", requireAuth, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    const user = users[0];
    if (!user || user.passwordHash !== hashPassword(currentPassword)) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, req.userId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Change password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
