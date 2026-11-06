import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Tablas de comunidad (fase 4). Las cuatro primeras son las de Better Auth (D-17), con nombres propios
 * para no chocar con `sessions` (las sesiones de F1). Solo los datos imprescindibles (COM-02):
 * sin IP, sin contraseñas.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  /** Alias público (COM-02). */
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  lang: text("lang").notNull().default("es"),
  /** JSON con los ID de pilotos y equipos favoritos (COM-10). */
  favorites: text("favorites").notNull().default("[]"),
  /** Aviso de borrado por inactividad enviado (seguridad.md §17). Deja de valer con cualquier actividad posterior. */
  inactiveWarnedAt: integer("inactive_warned_at", { mode: "timestamp_ms" }),
  /** Avisos por email (COM-11), desactivados por defecto: antes de cada GP y al publicar el análisis. */
  notifyRace: integer("notify_race", { mode: "boolean" }).notNull().default(false),
  notifyAnalysis: integer("notify_analysis", { mode: "boolean" }).notNull().default(false),
  /** Token de baja en un clic de los avisos (List-Unsubscribe). Se crea al activar alguno. */
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

/** Predicción de un usuario para una ronda (COM-04). Se puntúa al leer, con el resultado oficial (COM-05). */
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

/** Ligas privadas con enlace de invitación (COM-07). IDs y tokens aleatorios, nunca secuenciales. */
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

/** Puntuación del quiz semanal con cuenta: guarda la racha (COM-08). */
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

/** Denuncias de alias y nombres de liga (COM-13). */
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
 * Newsletter (CON-06, D-16): solo email e idioma. Doble confirmación: la fila queda `pending` hasta que se
 * abre el enlace; el token de confirmación se guarda como hash y caduca. La baja borra la fila.
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
    /** Token de baja en un clic (List-Unsubscribe), aleatorio y propio de cada suscriptor. */
    unsubscribeToken: text("unsubscribe_token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("newsletter_status_idx").on(t.status, t.lang)],
);
