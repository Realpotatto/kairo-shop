import { Router } from "express";
import { db, usersTable, sessionsTable, botsTable } from "@workspace/db";
import { eq, and, gt, count } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "../lib/logger";
import { syncUserUpsert, syncSessionUpsert, syncSessionDelete } from "../lib/sheetsSync";
import { verifyTelegramAuth, verifyTelegramInitData } from "../lib/telegramAuth";

const router = Router();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(userId: string): string {
  return Buffer.from(
    `${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`
  ).toString("base64");
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)))
    .limit(1);
  return rows[0]?.userId ?? null;
}

export function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  getUserIdFromToken(token)
    .then((userId) => {
      if (!userId) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }
      req.userId = userId;
      next();
    })
    .catch((err) => {
      logger.error({ err }, "requireAuth DB error");
      res.status(500).json({ error: "Internal server error" });
    });
}

export function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, async () => {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);
    // super_admin هم به همه چیزی که admin دسترسی داره دسترسی داره
    if (!user[0] || (user[0].role !== "admin" && user[0].role !== "super_admin")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}

function sessionExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" });
      return;
    }
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({ id, name, email, passwordHash, role: "user", plan: "free", status: "active" })
      .returning();
    const token = generateToken(id);
    const sessionExpiry = sessionExpiresAt();
    await db.insert(sessionsTable).values({ token, userId: id, expiresAt: sessionExpiry });
    syncSessionUpsert({ token, userId: id, expiresAt: sessionExpiry });
    syncUserUpsert({
      id: user.id, name: user.name, email: user.email, role: user.role,
      plan: user.plan, status: user.status, bio: user.bio,
      telegramUsername: user.telegramUsername, createdAt: user.createdAt,
    });
    res.status(201).json({
      user: {
        id: user.id, name: user.name, email: user.email,
        avatar: user.avatar, role: user.role, plan: user.plan,
        bio: user.bio ?? null, telegramUsername: user.telegramUsername ?? null,
        botCount: 0, createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    logger.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    const user = users[0];
    // BUG FIX: guard against null passwordHash — bcrypt.compare throws on null,
    // which causes HTTP 500 instead of 401
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (user.status === "banned" || user.status === "suspended") {
      res.status(403).json({ error: "Account suspended" });
      return;
    }
    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
    const token = generateToken(user.id);
    const loginSessionExpiry = sessionExpiresAt();
    await db.insert(sessionsTable).values({ token, userId: user.id, expiresAt: loginSessionExpiry });
    syncSessionUpsert({ token, userId: user.id, expiresAt: loginSessionExpiry });
    const [{ value: botCount }] = await db
      .select({ value: count() })
      .from(botsTable)
      .where(eq(botsTable.userId, user.id));
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email,
        avatar: user.avatar, role: user.role, plan: user.plan,
        bio: user.bio ?? null, telegramUsername: user.telegramUsername ?? null,
        botCount, createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token)).catch(() => {});
    syncSessionDelete(token);
  }
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req: any, res) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);
    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const [{ value: botCount }] = await db
      .select({ value: count() })
      .from(botsTable)
      .where(eq(botsTable.userId, user.id));
    res.json({
      id: user.id, name: user.name, email: user.email,
      avatar: user.avatar, role: user.role, plan: user.plan,
      bio: user.bio ?? null,
      telegramId: user.telegramId ?? null,
      telegramUsername: user.telegramUsername ?? null,
      telegramFirstName: user.telegramFirstName ?? null,
      telegramLastName: user.telegramLastName ?? null,
      telegramPhotoUrl: user.telegramPhotoUrl ?? null,
      botCount, createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/telegram
// FIX [1.2 backend]: همیشه telegramPhotoUrl رو آپدیت می‌کنه (حتی اگه avatar قبلاً ست شده بود)
router.post("/auth/telegram", requireAuth, async (req: any, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(503).json({ error: "Telegram login is not configured on this server" });
      return;
    }

    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body ?? {};
    if (!id || !first_name || !auth_date || !hash) {
      res.status(400).json({ error: "Missing required Telegram auth fields" });
      return;
    }

    const result = verifyTelegramAuth(
      { id, first_name, last_name, username, photo_url, auth_date, hash },
      botToken
    );
    if (!result.ok) {
      res.status(401).json({ error: result.reason });
      return;
    }

    const telegramId = String(id);
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);
    if (existing[0] && existing[0].id !== req.userId) {
      res.status(409).json({ error: "This Telegram account is already linked to another user" });
      return;
    }

    const updateData: Record<string, any> = {
      telegramId,
      telegramUsername: username ?? null,
      telegramFirstName: first_name,
      telegramLastName: last_name ?? null,
      // FIX [1.2 backend]: همیشه آپدیت می‌کنه، حتی اگه مقدار قبلی داشت
      telegramPhotoUrl: photo_url ?? null,
    };

    // FIX [1.2 backend]: اگه عکس تلگرام داره، avatar اصلی رو هم آپدیت کن
    // (قبلاً فقط وقتی avatar خالی بود آپدیت می‌کرد — الان همیشه از تلگرام می‌خونه)
    if (photo_url) {
      updateData.avatar = photo_url;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.userId))
      .returning();

    syncUserUpsert({
      id: updated.id, name: updated.name, email: updated.email, role: updated.role,
      plan: updated.plan, status: updated.status, bio: updated.bio,
      telegramUsername: updated.telegramUsername,
      createdAt: updated.createdAt, updatedAt: updated.updatedAt,
    });

    res.json({
      id: updated.id, name: updated.name, email: updated.email,
      avatar: updated.avatar, role: updated.role, plan: updated.plan,
      bio: updated.bio ?? null,
      telegramId: updated.telegramId ?? null,
      telegramUsername: updated.telegramUsername ?? null,
      telegramFirstName: updated.telegramFirstName ?? null,
      telegramLastName: updated.telegramLastName ?? null,
      telegramPhotoUrl: updated.telegramPhotoUrl ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Telegram link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/telegram/miniapp
// FIX [1.2 backend]: همین منطق برای miniapp هم
router.post("/auth/telegram/miniapp", requireAuth, async (req: any, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(503).json({ error: "Telegram login is not configured on this server" });
      return;
    }

    const { initData } = req.body ?? {};
    if (!initData) {
      res.status(400).json({ error: "Missing initData" });
      return;
    }

    const result = verifyTelegramInitData(initData, botToken);
    if (!result.ok) {
      res.status(401).json({ error: result.reason });
      return;
    }

    const { user: tgUser } = result;
    const telegramId = String(tgUser.id);

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);
    if (existing[0] && existing[0].id !== req.userId) {
      res.status(409).json({ error: "This Telegram account is already linked to another user" });
      return;
    }

    const updateData: Record<string, any> = {
      telegramId,
      telegramUsername: tgUser.username ?? null,
      telegramFirstName: tgUser.first_name,
      telegramLastName: tgUser.last_name ?? null,
      // FIX [1.2 backend]: همیشه آپدیت
      telegramPhotoUrl: tgUser.photo_url ?? null,
    };

    if (tgUser.photo_url) {
      updateData.avatar = tgUser.photo_url;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.userId))
      .returning();

    syncUserUpsert({
      id: updated.id, name: updated.name, email: updated.email, role: updated.role,
      plan: updated.plan, status: updated.status, bio: updated.bio,
      telegramUsername: updated.telegramUsername,
      createdAt: updated.createdAt, updatedAt: updated.updatedAt,
    });

    res.json({
      id: updated.id, name: updated.name, email: updated.email,
      avatar: updated.avatar, role: updated.role, plan: updated.plan,
      bio: updated.bio ?? null,
      telegramId: updated.telegramId ?? null,
      telegramUsername: updated.telegramUsername ?? null,
      telegramFirstName: updated.telegramFirstName ?? null,
      telegramLastName: updated.telegramLastName ?? null,
      telegramPhotoUrl: updated.telegramPhotoUrl ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Telegram miniapp link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
