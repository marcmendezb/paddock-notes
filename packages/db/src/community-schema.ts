import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Community tables (phase 4). The first four are Better Auth's (D-17), with their own names so they do not
 * clash with `sessions` (the F1 sessions). Only the essential data (COM-02):
 * no IP, no passwords.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  /** Public display name (COM-02). */
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  lang: text("lang").notNull().default("es"),
  /** JSON with the IDs of favourite drivers and teams (COM-10). */
  favorites: text("favorites").notNull().default("[]"),
  /** Inactivity deletion warning sent (security.md §17). It no longer counts after any later activity. */
  inactiveWarnedAt: integer("inactive_warned_at", { mode: "timestamp_ms" }),
  /** Email notifications (COM-11), off by default: before each Grand Prix and when the analysis is published. */
  notifyRace: integer("notify_race", { mode: "boolean" }).notNull().default(false),
  notifyAnalysis: integer("notify_analysis", { mode: "boolean" }).notNull().default(false),
  /** One-click unsubscribe token for notifications (List-Unsubscribe). Created when one is turned on. */
  emailToken: text("email_token").unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

/** A user's prediction for a round (COM-04). Scored on read, with the official result (COM-05). */
export const predictions = sqliteTable(
  "predictions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    season: integer("season").notNull(),
    round: integer("round").notNull(),
    p1: text("p1").notNull(),
    p2: text("p2").notNull(),
    p3: text("p3").notNull(),
    pole: text("pole").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.season, t.round] }), index("predictions_race_idx").on(t.season, t.round)],
);

/** Private leagues with an invitation link (COM-07). Random IDs and tokens, never sequential. */
export const leagues = sqliteTable("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteToken: text("invite_token").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const leagueMembers = sqliteTable(
  "league_members",
  {
    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: text("joined_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.userId] })],
);

/** Weekly quiz score with an account: keeps the streak (COM-08). */
export const quizAnswers = sqliteTable(
  "quiz_answers",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    week: text("week").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.week] })],
);

/** Reports of display names and league names (COM-13). */
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["alias", "league"] }).notNull(),
  targetId: text("target_id").notNull(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
});

/**
 * Newsletter (CON-06, D-16): email and language only. Double opt-in: the row stays `pending` until the link
 * is opened; the confirmation token is stored as a hash and expires. Unsubscribing deletes the row.
 */
export const newsletterSubscribers = sqliteTable(
  "newsletter_subscribers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    lang: text("lang").notNull(),
    status: text("status", { enum: ["pending", "active"] }).notNull(),
    confirmHash: text("confirm_hash"),
    confirmExpiresAt: integer("confirm_expires_at", { mode: "timestamp_ms" }),
    /** One-click unsubscribe token (List-Unsubscribe), random and unique to each subscriber. */
    unsubscribeToken: text("unsubscribe_token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("newsletter_status_idx").on(t.status, t.lang)],
);
