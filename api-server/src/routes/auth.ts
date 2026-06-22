import { Router } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "irforge_salt").digest("hex");
}

function generateToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`).toString("base64");
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  return rows[0]?.userId ?? null;
}

export function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  getUserIdFromToken(token).then((userId) => {
    if (!userId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    req.userId = userId;
    next();
  }).catch((err) => {
    logger.error({ err }, "requireAuth DB error");
    res.status(500).json({ error: "Internal server error" });
  });
}

export function requireAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, async () => {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    if (!user[0] || user[0].role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}

// POST /api/auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const id = crypto.randomUUID();
    const [user] = await db.insert(usersTable).values({
      id,
      name,
      email,
      passwordHash: hashPassword(password),
      role: "user",
      plan: "free",
      status: "active",
    }).returning();
    const token = generateToken(id);
    await db.insert(sessionsTable).values({ token, userId: id });
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        botCount: 0,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = users[0];
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (user.status === "banned" || user.status === "suspended") {
      res.status(403).json({ error: "Account suspended" });
      return;
    }
    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
    const token = generateToken(user.id);
    await db.insert(sessionsTable).values({ token, userId: user.id });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        botCount: 0,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token)).catch(() => {});
  }
  res.json({ success: true });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req: any, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      plan: user.plan,
      botCount: 0,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
