/**
 * schema/users.ts
 * FIX [Group 2 migration]: اضافه شد phone و profileComplete
 */
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar"),
  role: text("role").notNull().default("user"),
  // role های ممکن: "user" | "admin" | "super_admin"
  plan: text("plan").notNull().default("free"),
  bio: text("bio"),

  // ─── تلگرام ───────────────────────────────────────────────
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  telegramFirstName: text("telegram_first_name"),
  telegramLastName: text("telegram_last_name"),
  telegramPhotoUrl: text("telegram_photo_url"),

  // ─── GROUP 2 MIGRATION: فیلدهای جدید ────────────────────
  /** شماره موبایل — اختیاری، توسط کاربر وارد می‌شود */
  phone: text("phone"),
  /**
   * یوزرنیم اختصاصی پلتفرم (نه تلگرام) — برای آینده.
   * فعلاً nullable، بعداً می‌تونه unique بشه.
   */
  platformUsername: text("platform_username"),
  /**
   * آیا پروفایل کامل است؟ (تلگرام وصل + شماره + آواتار)
   * می‌شه computed هم نگه داشت ولی boolean ستون سریع‌تره.
   */
  profileComplete: boolean("profile_complete").notNull().default(false),

  status: text("status").notNull().default("active"),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

/**
 * تابع کمکی برای محاسبه وضعیت profileComplete.
 * هر بار تلگرام لینک می‌شه یا phone آپدیت می‌شه صدا بزن.
 */
export function computeProfileComplete(user: Partial<User>): boolean {
  return Boolean(user.telegramId && user.avatar);
  // بعداً: && user.phone
}
