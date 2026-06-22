import { Router } from "express";
import { db, botsTable, commandsTable, installedPluginsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "./auth";

const router = Router();

function formatBot(bot: any) {
  return {
    id: bot.id,
    name: bot.name,
    description: bot.description,
    status: bot.status,
    token: bot.token,
    userId: bot.userId,
    username: bot.username,
    avatar: bot.avatar,
    commandCount: bot.commandCount,
    pluginCount: bot.pluginCount,
    userCount: bot.userCount,
    messageCount: bot.messageCount,
    createdAt: bot.createdAt.toISOString(),
    updatedAt: bot.updatedAt.toISOString(),
  };
}

// GET /api/bots
router.get("/bots", requireAuth, async (req: any, res) => {
  try {
    const bots = await db.select().from(botsTable).where(eq(botsTable.userId, req.userId));
    res.json(bots.map(formatBot));
  } catch (err) {
    req.log.error({ err }, "List bots error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bots
router.post("/bots", requireAuth, async (req: any, res) => {
  try {
    const { name, description, token } = req.body;
    if (!name || !token) {
      res.status(400).json({ error: "Name and token are required" });
      return;
    }
    const id = crypto.randomUUID();
    const [bot] = await db.insert(botsTable).values({
      id,
      name,
      description: description ?? null,
      token,
      userId: req.userId,
      status: "inactive",
    }).returning();

    // Log activity
    await db.insert(activityTable).values({
      id: crypto.randomUUID(),
      userId: req.userId,
      type: "bot_created",
      title: "Bot created",
      description: `Created bot "${name}"`,
      botName: name,
    });

    res.status(201).json(formatBot(bot));
  } catch (err) {
    req.log.error({ err }, "Create bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/bots/:botId
router.get("/bots/:botId", requireAuth, async (req: any, res) => {
  try {
    const bots = await db.select().from(botsTable)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .limit(1);
    if (!bots[0]) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    res.json(formatBot(bots[0]));
  } catch (err) {
    req.log.error({ err }, "Get bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/bots/:botId
router.patch("/bots/:botId", requireAuth, async (req: any, res) => {
  try {
    const { name, description, token } = req.body;
    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (token !== undefined) update.token = token;
    const [bot] = await db.update(botsTable).set(update)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .returning();
    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    res.json(formatBot(bot));
  } catch (err) {
    req.log.error({ err }, "Update bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/bots/:botId
router.delete("/bots/:botId", requireAuth, async (req: any, res) => {
  try {
    await db.delete(botsTable)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Delete bot error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/bots/:botId/status
router.patch("/bots/:botId/status", requireAuth, async (req: any, res) => {
  try {
    const { status } = req.body;
    const [bot] = await db.update(botsTable).set({ status })
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
    res.json(formatBot(bot));
  } catch (err) {
    req.log.error({ err }, "Toggle bot status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/bots/:botId/stats
router.get("/bots/:botId/stats", requireAuth, async (req: any, res) => {
  try {
    const bots = await db.select().from(botsTable)
      .where(and(eq(botsTable.id, req.params.botId), eq(botsTable.userId, req.userId)))
      .limit(1);
    if (!bots[0]) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    const bot = bots[0];
    const commands = await db.select().from(commandsTable).where(eq(commandsTable.botId, bot.id));
    const plugins = await db.select().from(installedPluginsTable).where(eq(installedPluginsTable.botId, bot.id));

    // Generate sample daily messages data for last 7 days
    const messagesPerDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split("T")[0],
        count: Math.floor(Math.random() * 500) + 100,
      };
    });

    res.json({
      botId: bot.id,
      messages: bot.messageCount,
      users: bot.userCount,
      commands: commands.length,
      plugins: plugins.length,
      uptime: bot.status === "active" ? 99.5 : 0,
      messagesPerDay,
    });
  } catch (err) {
    req.log.error({ err }, "Get bot stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/bots/:botId/commands
router.get("/bots/:botId/commands", requireAuth, async (req: any, res) => {
  try {
    const cmds = await db.select().from(commandsTable).where(eq(commandsTable.botId, req.params.botId));
    res.json(cmds.map(c => ({
      id: c.id,
      botId: c.botId,
      name: c.name,
      description: c.description,
      permission: c.permission,
      arguments: c.arguments,
      workflow: c.workflow,
      enabled: c.enabled,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "List commands error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bots/:botId/commands
router.post("/bots/:botId/commands", requireAuth, async (req: any, res) => {
  try {
    const { name, description, permission, arguments: args, workflow } = req.body;
    const id = crypto.randomUUID();
    const [cmd] = await db.insert(commandsTable).values({
      id,
      botId: req.params.botId,
      name,
      description: description ?? "",
      permission: permission ?? "all",
      arguments: args ?? [],
      workflow: workflow ?? null,
      enabled: true,
    }).returning();
    // Update command count
    await db.update(botsTable)
      .set({ commandCount: (await db.select().from(commandsTable).where(eq(commandsTable.botId, req.params.botId))).length })
      .where(eq(botsTable.id, req.params.botId));
    res.status(201).json({
      id: cmd.id,
      botId: cmd.botId,
      name: cmd.name,
      description: cmd.description,
      permission: cmd.permission,
      arguments: cmd.arguments,
      workflow: cmd.workflow,
      enabled: cmd.enabled,
      createdAt: cmd.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create command error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/bots/:botId/commands/:commandId
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
    const [cmd] = await db.update(commandsTable).set(update)
      .where(and(eq(commandsTable.id, req.params.commandId), eq(commandsTable.botId, req.params.botId)))
      .returning();
    if (!cmd) {
      res.status(404).json({ error: "Command not found" });
      return;
    }
    res.json({
      id: cmd.id,
      botId: cmd.botId,
      name: cmd.name,
      description: cmd.description,
      permission: cmd.permission,
      arguments: cmd.arguments,
      workflow: cmd.workflow,
      enabled: cmd.enabled,
      createdAt: cmd.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Update command error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/bots/:botId/commands/:commandId
router.delete("/bots/:botId/commands/:commandId", requireAuth, async (req: any, res) => {
  try {
    await db.delete(commandsTable)
      .where(and(eq(commandsTable.id, req.params.commandId), eq(commandsTable.botId, req.params.botId)));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Delete command error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/bots/:botId/plugins
router.get("/bots/:botId/plugins", requireAuth, async (req: any, res) => {
  try {
    const plugins = await db.select().from(installedPluginsTable).where(eq(installedPluginsTable.botId, req.params.botId));
    res.json(plugins.map(p => ({
      id: p.id,
      botId: p.botId,
      marketplaceItemId: p.marketplaceItemId,
      name: p.name,
      version: p.version,
      enabled: p.enabled,
      installedAt: p.installedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "List plugins error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bots/:botId/plugins
router.post("/bots/:botId/plugins", requireAuth, async (req: any, res) => {
  try {
    const { marketplaceItemId } = req.body;
    const id = crypto.randomUUID();
    const [plugin] = await db.insert(installedPluginsTable).values({
      id,
      botId: req.params.botId,
      marketplaceItemId,
      name: "Plugin",
      version: "1.0.0",
      enabled: true,
    }).returning();
    res.status(201).json({
      id: plugin.id,
      botId: plugin.botId,
      marketplaceItemId: plugin.marketplaceItemId,
      name: plugin.name,
      version: plugin.version,
      enabled: plugin.enabled,
      installedAt: plugin.installedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Install plugin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/bots/:botId/plugins/:pluginId
router.delete("/bots/:botId/plugins/:pluginId", requireAuth, async (req: any, res) => {
  try {
    await db.delete(installedPluginsTable)
      .where(and(eq(installedPluginsTable.id, req.params.pluginId), eq(installedPluginsTable.botId, req.params.botId)));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Uninstall plugin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
