/**
 * routes/bots.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FIX [Group 3+4]:
 *   - POST /api/bots: فلوی کامل با فیش پرداخت → pending_payment
 *   - POST /api/bots/activate-admin-code: وارد کردن admin code → فعال‌سازی پنل
 *   - POST /api/bots/:botId/approve-payment: سوپرادمین تأیید می‌کنه
 *   - POST /api/bots/:botId/reject-payment: سوپرادمین رد می‌کنه
 *   - GET  /api/bots/pending-payments: لیست فیش‌های منتظر (سوپرادمین)
 *   - POST /api/sheet-pool: اضافه کردن شیت به pool (سوپرادمین)
 */

import { logger } from "../lib/logger";
import { Router } from "express";
import {
  db,
  botsTable,
  commandsTable,
  installedPluginsTable,
  activityTable,
  marketplaceItemsTable,
  paymentsTable,
  sheetPoolTable,
  usersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "./auth";
import { encryptToken, decryptToken } from "../lib/tokenCrypto";
import {
  syncBotUpsert,
  syncBotDelete,
  syncPaymentUpsert,
  syncSheetPoolUpsert,
  syncTenantUpsert,
} from "../lib/sheetsSync";

const router = Router();

const VALID_BOT_STATUSES = ["active", "inactive", "error", "pending_payment", "payment_rejected"] as const;
type BotStatus = typeof VALID_BOT_STATUSES[number];

// ─── requireSuperAdmin ───────────────────────────────────────────────────────

function requireSuperAdmin(req: any, res: any, next: any) {
  requireAuth(req, res, async () => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);
    if (!user || user.role !== "super_admin") {
      res.status(403).json({ error: "Super admin only" });
      return;
    }
    next();
  });
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBot(bot: any) {
  return {
    id: bot.id,
    name: bot.name,
    description: bot.description,
    status: bot.status,
    token: decryptToken(bot.token),
    userId: bot.userId,
    username: bot.username,
    avatar: bot.avatar,
    commandCount: bot.commandCount,
    pluginCount: bot.pluginCount,
    userCount: bot.userCount,
    messageCount: bot.messageCount,
    sheetId: bot.sheetId ?? null,
    adminCode: bot.adminCode ?? null,
    paymentStatus: bot.paymentStatus,
    createdAt: bot.createdAt.toISOString(),
    updatedAt: bot.updatedAt.toISOString(),
  };
}

/** تولید admin code — ۸ کاراکتر hex */
function generateAdminCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/**
 * ارسال پیام از طریق بات تلگرام به کاربر.
 * بله، از توکن همون بات استفاده می‌کنیم — قبل از فعال‌سازی کامل هم کار می‌کنه.
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    logger.warn({ err }, "sendTelegramMessage failed (non-fatal)");
  }
}

// ─── GET /api/bots ───────────────────────────────────────────────────────────

router.get("/bots", requireAuth, async (req: any, res) => {
  try {
    const bots = await db
      .select()
      .from(botsTable)
      .where(eq(botsTable.userId, req.userId));
    res.json(bots.map(formatBot));
  } catch (err) {
    logger.error({ err }, "List bots error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/bots ──────────────────────────────────────────────────────────
// FIX [Group 3]: فلوی کامل — فیش پرداخت + pending_payment

router.post("/bots", requireAuth, async (req: any, res) => {
  try {
    const { name, description, token, paymentDescription, receiptUrl } = req.body;

    if (!name || !token) {
      res.status(400).json({ error: "Name and token are required" });
      return;
    }
    if (!receiptUrl) {
      res.status(400).json({ error: "Receipt (receiptUrl) is required" });
      return;
    }

    // چک پروفایل کامل — تلگرام باید وصل باشه
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!user.telegramId) {
      res.status(400).json({ error: "Please link your Telegram account first" });
      return;
    }

    const botId = crypto.randomUUID();
    const paymentId = crypto.randomUUID();

    // ساخت بات با وضعیت pending_payment
    const [bot] = await db
      .insert(botsTable)
      .values({
        id: botId,
        name,
        description: description ?? null,
        token: encryptToken(token),
        userId: req.userId,
        status: "pending_payment",
        paymentStatus: "pending",
      })
      .returning();

    // ذخیره فیش پرداخت
    const [payment] = await db
      .insert(paymentsTable)
      .values({
        id: paymentId,
        userId: req.userId,
        botId: botId,
        receiptUrl,
        description: paymentDescription ?? null,
        status: "pending",
      })
      .returning();

    // ثبت activity
    await db.insert(activityTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      type: "bot_created",
      title: "Bot submitted",
      description: `Bot "${name}" submitted for review`,
      botName: name,
    });

    // Sync
    syncBotUpsert({
      id: bot.id, userId: bot.userId, name: bot.name, username: bot.username,
      status: bot.status, commandCount: bot.commandCount, pluginCount: bot.pluginCount,
      userCount: bot.userCount, messageCount: bot.messageCount,
      createdAt: bot.createdAt, updatedAt: bot.updatedAt,
    });
    syncPaymentUpsert({
      id: payment.id, userId: payment.userId, amount: 0,
      status: payment.status, planId: null, createdAt: payment.createdAt,
    });

    res.status(201).json(formatBot(bot));
  } catch (err) {
    logger.error({ err }, "Create bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/bots/pending-payments ─────────────────────────────────────────
// سوپرادمین — لیست فیش‌های منتظر بررسی

router.get("/bots/pending-payments", requireSuperAdmin, async (req: any, res) => {
  try {
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "pending"));

    // اطلاعات بات و کاربر رو هم attach کن
    const enriched = await Promise.all(
      payments.map(async (p) => {
        const [bot] = p.botId
          ? await db.select().from(botsTable).where(eq(botsTable.id, p.botId)).limit(1)
          : [null];
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, p.userId))
          .limit(1);
        return {
          payment: {
            id: p.id,
            receiptUrl: p.receiptUrl,
            description: p.description,
            status: p.status,
            createdAt: p.createdAt.toISOString(),
          },
          bot: bot ? formatBot(bot) : null,
          user: user
            ? { id: user.id, name: user.name, email: user.email, telegramId: user.telegramId }
            : null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    logger.error({ err }, "Pending payments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/bots/:botId/approve-payment ───────────────────────────────────
// FIX [Group 3]: سوپرادمین تأیید می‌کنه → شیت assign + adminCode + پیام تلگرام

router.post("/bots/:botId/approve-payment", requireSuperAdmin, async (req: any, res) => {
  try {
    const { reviewNote } = req.body;
    const { botId } = req.params;

    const [bot] = await db
      .select()
      .from(botsTable)
      .where(eq(botsTable.id, botId))
      .limit(1);

    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    if (bot.paymentStatus === "approved") {
      res.status(400).json({ error: "Already approved" });
      return;
    }

    // ۱. یک شیت آزاد از Pool بگیر
    const [freeSheet] = await db
      .select()
      .from(sheetPoolTable)
      .where(eq(sheetPoolTable.status, "available"))
      .limit(1);

    if (!freeSheet) {
      res.status(503).json({
        error: "No available sheets in pool. Add more sheets via /api/sheet-pool",
      });
      return;
    }

    // ۲. شیت رو به این بات assign کن
    await db
      .update(sheetPoolTable)
      .set({ status: "assigned", assignedBotId: botId })
      .where(eq(sheetPoolTable.id, freeSheet.id));

    syncSheetPoolUpsert({
      sheet_id: freeSheet.sheetId,
      assigned_to: botId,
      status: "assigned",
    });

    // ۳. admin code بساز
    const adminCode = generateAdminCode();

    // ۴. بات رو آپدیت کن
    const [updatedBot] = await db
      .update(botsTable)
      .set({
        status: "inactive",
        paymentStatus: "approved",
        sheetId: freeSheet.sheetId,
        adminCode,
      })
      .where(eq(botsTable.id, botId))
      .returning();

    // ۵. فیش رو هم آپدیت کن
    await db
      .update(paymentsTable)
      .set({ status: "approved", reviewedBy: req.userId, reviewNote: reviewNote ?? null })
      .where(eq(paymentsTable.botId, botId));

    // ۶. Sync tenant (ربط توکن بات به شیت)
    syncTenantUpsert({
      bot_token: decryptToken(updatedBot.token),
      bot_name: updatedBot.name,
      bot_username: updatedBot.username,
      owner_user_id: updatedBot.userId,
      sheet_id: freeSheet.sheetId,
      created_at: updatedBot.createdAt,
    });

    syncBotUpsert({
      id: updatedBot.id, userId: updatedBot.userId, name: updatedBot.name,
      username: updatedBot.username, status: updatedBot.status,
      commandCount: updatedBot.commandCount, pluginCount: updatedBot.pluginCount,
      userCount: updatedBot.userCount, messageCount: updatedBot.messageCount,
      createdAt: updatedBot.createdAt, updatedAt: updatedBot.updatedAt,
    });

    // ۷. ارسال پیام از طریق خود بات به کاربر
    const [owner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updatedBot.userId))
      .limit(1);

    if (owner?.telegramId) {
      const plainToken = decryptToken(updatedBot.token);
      await sendTelegramMessage(
        plainToken,
        owner.telegramId,
        `✅ <b>بات شما تأیید شد!</b>\n\n` +
          `🤖 نام بات: ${updatedBot.name}\n` +
          `🔑 کد ادمین: <code>${adminCode}</code>\n\n` +
          `برای فعال‌سازی پنل بات، این کد را در پروفایل خود وارد کنید.`
      );
    }

    res.json({ success: true, bot: formatBot(updatedBot), adminCode });
  } catch (err) {
    logger.error({ err }, "Approve payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/bots/:botId/reject-payment ────────────────────────────────────

router.post("/bots/:botId/reject-payment", requireSuperAdmin, async (req: any, res) => {
  try {
    const { reviewNote } = req.body;
    const { botId } = req.params;

    // BUG FIX: check existence before updating
    const [existingBot] = await db
      .select()
      .from(botsTable)
      .where(eq(botsTable.id, botId))
      .limit(1);

    if (!existingBot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const [updatedBot] = await db
      .update(botsTable)
      .set({ status: "payment_rejected", paymentStatus: "rejected" })
      .where(eq(botsTable.id, botId))
      .returning();

    await db
      .update(paymentsTable)
      .set({ status: "rejected", reviewedBy: req.userId, reviewNote: reviewNote ?? null })
      .where(eq(paymentsTable.botId, botId));

    syncBotUpsert({
      id: updatedBot.id, userId: updatedBot.userId, name: updatedBot.name,
      username: updatedBot.username, status: updatedBot.status,
      commandCount: updatedBot.commandCount, pluginCount: updatedBot.pluginCount,
      userCount: updatedBot.userCount, messageCount: updatedBot.messageCount,
      createdAt: updatedBot.createdAt, updatedAt: updatedBot.updatedAt,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Reject payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/bots/activate-admin-code ──────────────────────────────────────
// FIX [Group 4]: کاربر admin code رو وارد می‌کنه → پنل بات فعال می‌شه
// Admin Code re-usable است (هر زمان می‌شه دوباره وارد کرد)

router.post("/bots/activate-admin-code", requireAuth, async (req: any, res) => {
  try {
    const { adminCode } = req.body;
    if (!adminCode) {
      res.status(400).json({ error: "Admin code is required" });
      return;
    }

    // پیدا کردن بات با این adminCode که متعلق به این کاربر باشه
    const [bot] = await db
      .select()
      .from(botsTable)
      .where(
        and(
          eq(botsTable.userId, req.userId),
          eq(botsTable.adminCode, adminCode.trim().toUpperCase()),
          eq(botsTable.paymentStatus, "approved")
        )
      )
      .limit(1);

    if (!bot) {
      res.status(404).json({ error: "Invalid admin code or bot not found" });
      return;
    }

    // Admin code معتبره → بات رو active کن (پنل فعال می‌شه)
    const [updatedBot] = await db
      .update(botsTable)
      .set({ status: "active" })
      .where(eq(botsTable.id, bot.id))
      .returning();

    syncBotUpsert({
      id: updatedBot.id, userId: updatedBot.userId, name: updatedBot.name,
      username: updatedBot.username, status: updatedBot.status,
      commandCount: updatedBot.commandCount, pluginCount: updatedBot.pluginCount,
      userCount: updatedBot.userCount, messageCount: updatedBot.messageCount,
      createdAt: updatedBot.createdAt, updatedAt: updatedBot.updatedAt,
    });

    res.json({ success: true, bot: formatBot(updatedBot) });
  } catch (err) {
    logger.error({ err }, "Activate admin code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/sheet-pool ────────────────────────────────────────────────────
// FIX [Group 4]: سوپرادمین شیت‌های جدید به pool اضافه می‌کنه

router.post("/sheet-pool", requireSuperAdmin, async (req: any, res) => {
  try {
    const { sheetId } = req.body;
    if (!sheetId) {
      res.status(400).json({ error: "sheetId is required" });
      return;
    }

    const [entry] = await db
      .insert(sheetPoolTable)
      .values({
        id: crypto.randomUUID(),
        sheetId,
        status: "available",
        addedBy: req.userId,
      })
      .returning();

    syncSheetPoolUpsert({
      sheet_id: entry.sheetId,
      status: "available",
      assigned_to: null,
      created_at: entry.createdAt,
    });

    res.status(201).json({
      id: entry.id,
      sheetId: entry.sheetId,
      status: entry.status,
      createdAt: entry.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "This sheet ID already exists in the pool" });
      return;
    }
    logger.error({ err }, "Add sheet pool error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/sheet-pool ─────────────────────────────────────────────────────

router.get("/sheet-pool", requireSuperAdmin, async (req: any, res) => {
  try {
    const entries = await db.select().from(sheetPoolTable);
    res.json(
      entries.map((e) => ({
        id: e.id,
        sheetId: e.sheetId,
        status: e.status,
        assignedBotId: e.assignedBotId,
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    logger.error({ err }, "List sheet pool error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/bots/:botId ────────────────────────────────────────────────────

router.get("/bots/:botId", requireAuth, async (req: any, res) => {
  try {
    const [bot] = await db
      .select()
      .from(botsTable)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .limit(1);
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    res.json(formatBot(bot));
  } catch (err) {
    logger.error({ err }, "Get bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/bots/:botId ──────────────────────────────────────────────────

router.patch("/bots/:botId", requireAuth, async (req: any, res) => {
  try {
    const { name, description, token } = req.body;
    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (token !== undefined) update.token = encryptToken(token);
    // BUG FIX: Drizzle crashes if SET has no fields
    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [bot] = await db
      .update(botsTable)
      .set(update)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .returning();
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    syncBotUpsert({
      id: bot.id, userId: bot.userId, name: bot.name, username: bot.username,
      status: bot.status, commandCount: bot.commandCount, pluginCount: bot.pluginCount,
      userCount: bot.userCount, messageCount: bot.messageCount,
      createdAt: bot.createdAt, updatedAt: bot.updatedAt,
    });
    res.json(formatBot(bot));
  } catch (err) {
    logger.error({ err }, "Update bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/bots/:botId ─────────────────────────────────────────────────

router.delete("/bots/:botId", requireAuth, async (req: any, res) => {
  try {
    // BUG FIX: verify ownership BEFORE deleting sub-records
    const [botToDelete] = await db
      .select()
      .from(botsTable)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .limit(1);

    if (!botToDelete) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    await db.delete(commandsTable).where(eq(commandsTable.botId, req.params.botId));
    await db.delete(installedPluginsTable).where(eq(installedPluginsTable.botId, req.params.botId));
    await db.delete(botsTable).where(eq(botsTable.id, req.params.botId));
    syncBotDelete(req.params.botId);
    res.status(204).end();
  } catch (err) {
    logger.error({ err }, "Delete bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/bots/:botId/status ──────────────────────────────────────────

router.patch("/bots/:botId/status", requireAuth, async (req: any, res) => {
  try {
    const { status } = req.body;
    if (!VALID_BOT_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_BOT_STATUSES.join(", ")}` });
      return;
    }
    const [bot] = await db
      .update(botsTable)
      .set({ status })
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .returning();
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    await db.insert(activityTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      type: "bot_deployed",
      title: status === "active" ? "Bot activated" : "Bot deactivated",
      description: `Bot "${bot.name}" is now ${status}`,
      botName: bot.name,
    });
    syncBotUpsert({
      id: bot.id, userId: bot.userId, name: bot.name, username: bot.username,
      status: bot.status, commandCount: bot.commandCount, pluginCount: bot.pluginCount,
      userCount: bot.userCount, messageCount: bot.messageCount,
      createdAt: bot.createdAt, updatedAt: bot.updatedAt,
    });
    res.json(formatBot(bot));
  } catch (err) {
    logger.error({ err }, "Toggle bot status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── باقی routeها (stats, commands, plugins) بدون تغییر ─────────────────────

router.get("/bots/:botId/stats", requireAuth, async (req: any, res) => {
  try {
    const [bot] = await db
      .select()
      .from(botsTable)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .limit(1);
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    const commands = await db.select().from(commandsTable).where(eq(commandsTable.botId, bot.id));
    const plugins = await db.select().from(installedPluginsTable).where(eq(installedPluginsTable.botId, bot.id));
    const totalMessages = bot.messageCount;
    const basePerDay = Math.floor(totalMessages / 7);
    const messagesPerDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return { date: date.toISOString().split("T")[0], count: i === 6 ? totalMessages - basePerDay * 6 : basePerDay };
    });
    res.json({ botId: bot.id, messages: bot.messageCount, users: bot.userCount, commands: commands.length, plugins: plugins.length, uptime: bot.status === "active" ? 99.5 : 0, messagesPerDay });
  } catch (err) { logger.error({ err }, "Get bot stats error"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/bots/:botId/commands", requireAuth, async (req: any, res) => {
  try {
    const cmds = await db.select().from(commandsTable).where(eq(commandsTable.botId, req.params.botId));
    res.json(cmds.map(c => ({ id: c.id, botId: c.botId, name: c.name, description: c.description, permission: c.permission, arguments: c.arguments, workflow: c.workflow, enabled: c.enabled, createdAt: c.createdAt.toISOString() })));
  } catch (err) { logger.error({ err }, "List commands error"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/bots/:botId/commands", requireAuth, async (req: any, res) => {
  try {
    const { name, description, permission, arguments: args, workflow } = req.body;
    const id = crypto.randomUUID();
    const [cmd] = await db.insert(commandsTable).values({ id, botId: req.params.botId, name, description: description ?? "", permission: permission ?? "all", arguments: args ?? [], workflow: workflow ?? null, enabled: true }).returning();
    await db.update(botsTable).set({ commandCount: sql`(SELECT COUNT(*) FROM commands WHERE bot_id = ${req.params.botId})` }).where(eq(botsTable.id, req.params.botId));
    res.status(201).json({ id: cmd.id, botId: cmd.botId, name: cmd.name, description: cmd.description, permission: cmd.permission, arguments: cmd.arguments, workflow: cmd.workflow, enabled: cmd.enabled, createdAt: cmd.createdAt.toISOString() });
  } catch (err) { logger.error({ err }, "Create command error"); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/bots/:botId/commands/:commandId", requireAuth, async (req: any, res) => {
  try {
    const update: Record<string, any> = {};
    const { name, description, permission, arguments: args, workflow, enabled } = req.body;
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (permission !== undefined) update.permission = permission;
    if (args !== undefined) update.arguments = args;
    if (workflow !== undefined) update.workflow = workflow;
    if (enabled !== undefined) update.enabled = enabled;
    const [cmd] = await db.update(commandsTable).set(update).where(and(eq(commandsTable.id, req.params.commandId), eq(commandsTable.botId, req.params.botId))).returning();
    if (!cmd) { res.status(404).json({ error: "Command not found" }); return; }
    res.json({ id: cmd.id, botId: cmd.botId, name: cmd.name, description: cmd.description, permission: cmd.permission, arguments: cmd.arguments, workflow: cmd.workflow, enabled: cmd.enabled, createdAt: cmd.createdAt.toISOString() });
  } catch (err) { logger.error({ err }, "Update command error"); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/bots/:botId/commands/:commandId", requireAuth, async (req: any, res) => {
  try {
    await db.delete(commandsTable).where(and(eq(commandsTable.id, req.params.commandId), eq(commandsTable.botId, req.params.botId)));
    await db.update(botsTable).set({ commandCount: sql`(SELECT COUNT(*) FROM commands WHERE bot_id = ${req.params.botId})` }).where(eq(botsTable.id, req.params.botId));
    res.status(204).end();
  } catch (err) { logger.error({ err }, "Delete command error"); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/bots/:botId/plugins", requireAuth, async (req: any, res) => {
  try {
    const plugins = await db.select().from(installedPluginsTable).where(eq(installedPluginsTable.botId, req.params.botId));
    res.json(plugins.map(p => ({ id: p.id, botId: p.botId, marketplaceItemId: p.marketplaceItemId, name: p.name, version: p.version, enabled: p.enabled, installedAt: p.installedAt.toISOString() })));
  } catch (err) { logger.error({ err }, "List plugins error"); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/bots/:botId/plugins", requireAuth, async (req: any, res) => {
  try {
    const { marketplaceItemId } = req.body;
    if (!marketplaceItemId) { res.status(400).json({ error: "marketplaceItemId is required" }); return; }
    const [item] = await db.select().from(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, marketplaceItemId)).limit(1);
    if (!item) { res.status(404).json({ error: "Marketplace item not found" }); return; }
    const id = crypto.randomUUID();
    const [plugin] = await db.insert(installedPluginsTable).values({ id, botId: req.params.botId, marketplaceItemId, name: item.name, version: item.version, enabled: true }).returning();
    res.status(201).json({ id: plugin.id, botId: plugin.botId, marketplaceItemId: plugin.marketplaceItemId, name: plugin.name, version: plugin.version, enabled: plugin.enabled, installedAt: plugin.installedAt.toISOString() });
  } catch (err) { logger.error({ err }, "Install plugin error"); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/bots/:botId/plugins/:pluginId", requireAuth, async (req: any, res) => {
  try {
    await db.delete(installedPluginsTable).where(and(eq(installedPluginsTable.id, req.params.pluginId), eq(installedPluginsTable.botId, req.params.botId)));
    res.status(204).end();
  } catch (err) { logger.error({ err }, "Uninstall plugin error"); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
