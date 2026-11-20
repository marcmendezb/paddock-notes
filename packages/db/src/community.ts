/**
 * Community data (phase 4). The only thing the API may write (D-14): community tables only, never F1
 * data. Every query for a user resource filters by the session's user inside the SQL itself
 * (security.md §10).
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { rankUsers, scorePrediction, type PredictionPicks } from "@paddock/shared";
import * as schema from "./schema";

const { users, predictions, leagues, leagueMembers, quizAnswers, reports } = schema;

export const LEAGUE_MAX_MEMBERS = 50;

function randomToken(bytes = 24): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return [...data].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createCommunity(d1: D1Database) {
  const db = drizzle(d1, { schema });

  async function profile(userId: string) {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u) return null;
    return { id: u.id, name: u.name, email: u.email, lang: u.lang, favorites: JSON.parse(u.favorites) as string[] };
  }

  async function updateProfile(userId: string, data: { name?: string; lang?: string; favorites?: string[] }) {
    await db
      .update(users)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.lang !== undefined ? { lang: data.lang } : {}),
        ...(data.favorites !== undefined ? { favorites: JSON.stringify(data.favorites.slice(0, 20)) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /** Export of all the user's data as JSON (COM-03). */
  async function exportUser(userId: string) {
    const [p, preds, own, member, quiz] = await Promise.all([
      profile(userId),
      db.select().from(predictions).where(eq(predictions.userId, userId)),
      db.select().from(leagues).where(eq(leagues.ownerId, userId)),
      db.select().from(leagueMembers).where(eq(leagueMembers.userId, userId)),
      db.select().from(quizAnswers).where(eq(quizAnswers.userId, userId)),
    ]);
    return { profile: p, predictions: preds, leaguesOwned: own, leagueMemberships: member, quiz };
  }

  /** Effective and immediate deletion (COM-03): foreign keys cascade-delete everything else. */
  async function deleteUser(userId: string) {
    await db.delete(users).where(eq(users.id, userId));
  }

  async function savePrediction(userId: string, season: number, round: number, picks: PredictionPicks) {
    const updatedAt = new Date().toISOString();
    await db
      .insert(predictions)
      .values({ userId, season, round, ...picks, updatedAt })
      .onConflictDoUpdate({
        target: [predictions.userId, predictions.season, predictions.round],
        set: { ...picks, updatedAt },
      });
  }

  async function myPredictions(userId: string, season: number) {
    return db
      .select()
      .from(predictions)
      .where(and(eq(predictions.userId, userId), eq(predictions.season, season)));
  }

  /** Official podium and pole for each round of the season: pole from qualifying or, failing that, from the grid. */
  async function officialResults(season: number) {
    const rows = await db.all<{ round: number; kind: string; driver_id: string; position: number }>(sql`
      select round, 'podium' as kind, driver_id, position from results
        where season = ${season} and kind = 'race' and position <= 3
      union all
      select round, 'pole' as kind, driver_id, 1 from qualifying where season = ${season} and position = 1
      union all
      select round, 'grid' as kind, driver_id, 1 from results where season = ${season} and kind = 'race' and grid = 1`);
    const byRound = new Map<number, { podium: string[]; pole: string | null }>();
    for (const r of rows) {
      const entry = byRound.get(r.round) ?? { podium: [], pole: null };
      if (r.kind === "podium") entry.podium[r.position - 1] = r.driver_id;
      if (r.kind === "pole") entry.pole = r.driver_id;
      if (r.kind === "grid" && entry.pole === null) entry.pole = r.driver_id;
      byRound.set(r.round, entry);
    }
    return byRound;
  }

  /** A season's prediction standings; with `members`, only those users (leagues). */
  async function ranking(season: number, members?: string[]) {
    const [preds, official] = await Promise.all([
      db
        .select({ p: predictions, name: users.name })
        .from(predictions)
        .innerJoin(users, eq(users.id, predictions.userId))
        .where(eq(predictions.season, season)),
      officialResults(season),
    ]);
    const totals = new Map<string, { userId: string; name: string; points: number; exact: number; poles: number; races: number }>();
    for (const { p, name } of preds) {
      if (members && !members.includes(p.userId)) continue;
      const result = official.get(p.round);
      if (!result || result.podium.length < 3) continue;
      const s = scorePrediction(p, result.podium, result.pole);
      const t = totals.get(p.userId) ?? { userId: p.userId, name, points: 0, exact: 0, poles: 0, races: 0 };
      t.points += s.points;
      t.exact += s.exact;
      t.poles += s.pole ? 1 : 0;
      t.races += 1;
      totals.set(p.userId, t);
    }
    if (members) {
      for (const id of members) {
        if (!totals.has(id)) {
          const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, id));
          if (u) totals.set(id, { userId: id, name: u.name, points: 0, exact: 0, poles: 0, races: 0 });
        }
      }
    }
    return rankUsers([...totals.values()]);
  }

  /**
   * Summary of the last Grand Prix with a result (COM-07): what each member scored in that race. Anyone who
   * did not predict appears without points (null), so it shows who skipped it.
   */
  async function lastRoundSummary(season: number, members: string[]) {
    const official = await officialResults(season);
    const round = Math.max(0, ...[...official].filter(([, r]) => r.podium.length >= 3).map(([n]) => n));
    if (round === 0) return null;
    const result = official.get(round)!;
    const [race] = await db.all<{ name: string }>(sql`select name from races where season = ${season} and round = ${round}`);
    const rows = await db
      .select({ userId: users.id, name: users.name, p: predictions })
      .from(users)
      .leftJoin(predictions, and(eq(predictions.userId, users.id), eq(predictions.season, season), eq(predictions.round, round)))
      .where(inArray(users.id, members));
    return {
      round,
      gp: race?.name ?? "",
      rows: rows
        .map((r) => {
          const s = r.p ? scorePrediction(r.p, result.podium, result.pole) : null;
          return { name: r.name, points: s?.points ?? null, exact: s?.exact ?? 0, pole: s?.pole ?? false };
        })
        .sort((a, b) => (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name)),
    };
  }

  async function createLeague(ownerId: string, name: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.batch([
      db.insert(leagues).values({ id, name, ownerId, inviteToken: randomToken(), createdAt: now }),
      db.insert(leagueMembers).values({ leagueId: id, userId: ownerId, joinedAt: now }),
    ]);
    return id;
  }

  /** Join with the invitation token. At most 50 members (COM-07). */
  async function joinLeague(userId: string, token: string): Promise<{ ok: true; id: string } | { ok: false; reason: "not_found" | "full" }> {
    const [league] = await db.select().from(leagues).where(eq(leagues.inviteToken, token));
    if (!league) return { ok: false, reason: "not_found" };
    const [count] = await db
      .select({ n: sql<number>`count(*)` })
      .from(leagueMembers)
      .where(eq(leagueMembers.leagueId, league.id));
    if ((count?.n ?? 0) >= LEAGUE_MAX_MEMBERS) return { ok: false, reason: "full" };
    await db
      .insert(leagueMembers)
      .values({ leagueId: league.id, userId, joinedAt: new Date().toISOString() })
      .onConflictDoNothing();
    return { ok: true, id: league.id };
  }

  /** A league is only visible to its members: otherwise it is as if it did not exist (404, security.md §10). */
  async function league(userId: string, leagueId: string, season: number) {
    const [row] = await db
      .select({ league: leagues })
      .from(leagues)
      .innerJoin(leagueMembers, and(eq(leagueMembers.leagueId, leagues.id), eq(leagueMembers.userId, userId)))
      .where(eq(leagues.id, leagueId));
    if (!row) return null;
    const members = await db.select({ userId: leagueMembers.userId }).from(leagueMembers).where(eq(leagueMembers.leagueId, leagueId));
    const isOwner = row.league.ownerId === userId;
    return {
      id: row.league.id,
      name: row.league.name,
      isOwner,
      // Only the owner, who is the one inviting, sees the token.
      inviteToken: isOwner ? row.league.inviteToken : null,
      ranking: await ranking(season, members.map((m) => m.userId)),
      lastRound: await lastRoundSummary(season, members.map((m) => m.userId)),
    };
  }

  async function myLeagues(userId: string) {
    return db
      .select({ id: leagues.id, name: leagues.name })
      .from(leagues)
      .innerJoin(leagueMembers, and(eq(leagueMembers.leagueId, leagues.id), eq(leagueMembers.userId, userId)));
  }

  /** The owner can revoke the invitation: the previous link stops working. */
  async function rotateInvite(userId: string, leagueId: string) {
    await db
      .update(leagues)
      .set({ inviteToken: randomToken() })
      .where(and(eq(leagues.id, leagueId), eq(leagues.ownerId, userId)));
  }

  async function leaveLeague(userId: string, leagueId: string) {
    await db.delete(leagueMembers).where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)));
  }

  async function saveQuiz(userId: string, week: string, score: number, total: number) {
    await db.insert(quizAnswers).values({ userId, week, score, total }).onConflictDoNothing();
  }

  /** Consecutive weeks played up to the latest (COM-08). */
  async function quizStreak(userId: string): Promise<number> {
    const rows = await db.select({ week: quizAnswers.week }).from(quizAnswers).where(eq(quizAnswers.userId, userId));
    const weeks = new Set(rows.map((r) => r.week));
    const sorted = [...weeks].sort().reverse();
    if (sorted.length === 0) return 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (previousWeek(sorted[i - 1]!) === sorted[i]) streak++;
      else break;
    }
    return streak;
  }

  /**
   * Accounts without activity since `cutoff` (no renewed session or profile change), with the date of the
   * warning if it was already sent (security.md §17).
   */
  async function inactiveUsers(cutoff: Date) {
    return db.all<{ id: string; email: string; lang: string; warned_at: number | null; last_active: number }>(sql`
      select * from (
        select u.id, u.email, u.lang, u.inactive_warned_at as warned_at,
               max(u.updated_at, coalesce((select max(s.updated_at) from auth_sessions s where s.user_id = u.id), 0)) as last_active
        from users u
      ) where last_active < ${cutoff.getTime()}
      limit 200`);
  }

  async function markInactiveWarned(userId: string, at: Date) {
    await db.update(users).set({ inactiveWarnedAt: at }).where(eq(users.id, userId));
  }

  async function report(reporterId: string, kind: "alias" | "league", targetId: string) {
    await db.insert(reports).values({ id: crypto.randomUUID(), kind, targetId, reporterId, createdAt: new Date().toISOString() });
  }

  return {
    profile,
    updateProfile,
    exportUser,
    deleteUser,
    savePrediction,
    myPredictions,
    officialResults,
    ranking,
    createLeague,
    joinLeague,
    league,
    myLeagues,
    rotateInvite,
    leaveLeague,
    saveQuiz,
    quizStreak,
    report,
    inactiveUsers,
    markInactiveWarned,
  };
}

export type Community = ReturnType<typeof createCommunity>;

/** "2026-W01" → "2025-W52" (or W53): the previous ISO week. */
export function previousWeek(week: string): string {
  const [y, w] = week.split("-W").map(Number) as [number, number];
  if (w > 1) return `${y}-W${String(w - 1).padStart(2, "0")}`;
  // The last ISO week of a year is the one that contains 28 December.
  const dec28 = new Date(Date.UTC(y - 1, 11, 28));
  const day = dec28.getUTCDay() || 7;
  dec28.setUTCDate(dec28.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(dec28.getUTCFullYear(), 0, 1));
  const last = Math.ceil(((dec28.getTime() - start.getTime()) / 86_400_000 + 1) / 7);
  return `${y - 1}-W${String(last).padStart(2, "0")}`;
}
