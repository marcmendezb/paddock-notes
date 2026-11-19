/**
 * Escritura de datos de F1. Solo puede importarlo `paddock-ingest` (D-14):
 * la regla `no-restricted-imports` y el test de arquitectura lo hacen cumplir.
 * Todas las escrituras son idempotentes (INSERT ... ON CONFLICT DO UPDATE).
 */
import { drizzle } from "drizzle-orm/d1";
import { and, eq, getTableColumns, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type {
  CircuitRow,
  ConstructorRow,
  ConstructorStandingRow,
  DriverRow,
  DriverStandingRow,
  LapRow,
  PitStopRow,
  QualifyingRow,
  RaceRow,
  ResultRow,
  SessionRow,
} from "@paddock/shared/jolpica";
import * as schema from "./schema";

/** D1 admite como máximo 100 parámetros por consulta. */
const MAX_PARAMS = 100;

type Db = ReturnType<typeof drizzle<typeof schema>>;

function excludedSet(table: SQLiteTable, keys: string[]): Record<string, SQL> {
  const set: Record<string, SQL> = {};
  for (const [prop, column] of Object.entries(getTableColumns(table)) as [string, SQLiteColumn][]) {
    if (!keys.includes(prop)) set[prop] = sql.raw(`excluded."${column.name}"`);
  }
  return set;
}

function upserts<T extends SQLiteTable>(
  db: Db,
  table: T,
  keys: (keyof T["$inferInsert"] & string)[],
  rows: T["$inferInsert"][],
) {
  if (rows.length === 0) return [];
  const columns = Object.keys(getTableColumns(table)).length;
  const perQuery = Math.max(1, Math.floor(MAX_PARAMS / columns));
  const columnsByProp = getTableColumns(table) as Record<string, SQLiteColumn>;
  const target = keys.map((k) => columnsByProp[k]!);
  const set = excludedSet(table, keys);
  const queries = [];
  for (let i = 0; i < rows.length; i += perQuery) {
    queries.push(
      db
        .insert(table)
        .values(rows.slice(i, i + perQuery))
        .onConflictDoUpdate({ target, set }),
    );
  }
  return queries;
}

export interface WriteBatch {
  circuits?: CircuitRow[];
  drivers?: DriverRow[];
  constructors?: ConstructorRow[];
  races?: RaceRow[];
  sessions?: SessionRow[];
  results?: ResultRow[];
  driverStandings?: DriverStandingRow[];
  constructorStandings?: ConstructorStandingRow[];
  qualifying?: QualifyingRow[];
  pitStops?: PitStopRow[];
  laps?: LapRow[];
  /** Recursos que esta escritura deja actualizados (`ingest_state`). */
  resources?: string[];
}

export function createF1Writer(d1: D1Database) {
  const db = drizzle(d1, { schema });

  return {
    /** Escribe todo en una sola transacción de D1 (db.batch) y devuelve las filas escritas. */
    async write(batch: WriteBatch, now = new Date()): Promise<number> {
      const updatedAt = now.toISOString();
      const queries = [
        ...upserts(db, schema.circuits, ["id"], batch.circuits ?? []),
        ...upserts(db, schema.drivers, ["id"], batch.drivers ?? []),
        ...upserts(db, schema.constructors, ["id"], batch.constructors ?? []),
        ...upserts(db, schema.races, ["season", "round"], batch.races ?? []),
        ...upserts(db, schema.sessions, ["season", "round", "kind"], batch.sessions ?? []),
        ...upserts(
          db,
          schema.results,
          ["season", "round", "kind", "driverId", "constructorId", "carNumber"],
          (batch.results ?? []).map((r) => ({ ...r, carNumber: r.carNumber ?? 0 })),
        ),
        ...upserts(db, schema.standingsDrivers, ["season", "round", "driverId"], batch.driverStandings ?? []),
        ...upserts(
          db,
          schema.standingsConstructors,
          ["season", "round", "constructorId"],
          batch.constructorStandings ?? [],
        ),
        ...upserts(db, schema.qualifying, ["season", "round", "driverId"], batch.qualifying ?? []),
        ...upserts(db, schema.pitStops, ["season", "round", "driverId", "stop"], batch.pitStops ?? []),
        ...upserts(db, schema.laps, ["season", "round", "driverId", "lap"], batch.laps ?? []),
        ...upserts(
          db,
          schema.ingestState,
          ["resource"],
          (batch.resources ?? []).map((resource) => ({ resource, updatedAt })),
        ),
      ];
      if (queries.length === 0) return 0;
      const [first, ...rest] = queries;
      await db.batch([first!, ...rest]);
      return (
        (batch.circuits?.length ?? 0) +
        (batch.drivers?.length ?? 0) +
        (batch.constructors?.length ?? 0) +
        (batch.races?.length ?? 0) +
        (batch.sessions?.length ?? 0) +
        (batch.results?.length ?? 0) +
        (batch.driverStandings?.length ?? 0) +
        (batch.constructorStandings?.length ?? 0) +
        (batch.qualifying?.length ?? 0) +
        (batch.pitStops?.length ?? 0) +
        (batch.laps?.length ?? 0)
      );
    },

    /**
     * Sustituye el resultado provisional de una carrera (D-31): borra el anterior y escribe el nuevo en la
     * misma transacción. Sin filas, solo borra (por ejemplo, cuando ya está el oficial).
     */
    async replaceProvisional(season: number, round: number, rows: Omit<typeof schema.provisionalResults.$inferInsert, "season" | "round">[]) {
      const where = and(eq(schema.provisionalResults.season, season), eq(schema.provisionalResults.round, round));
      const del = db.delete(schema.provisionalResults).where(where);
      if (rows.length === 0) {
        await del;
        return 0;
      }
      const inserts = upserts(db, schema.provisionalResults, ["season", "round", "driverId"], rows.map((r) => ({ ...r, season, round })));
      await db.batch([del, ...inserts]);
      return rows.length;
    },

    /** Resultados ya guardados de una carrera, para la cuarentena (seguridad.md §8). */
    async existingResults(season: number, round: number) {
      return db.query.results.findMany({
        where: (r, { and, eq }) => and(eq(r.season, season), eq(r.round, round)),
      });
    },

    async saveAnalysis(row: typeof schema.analysisArtifacts.$inferInsert): Promise<void> {
      await db
        .insert(schema.analysisArtifacts)
        .values(row)
        .onConflictDoUpdate({
          target: [schema.analysisArtifacts.season, schema.analysisArtifacts.round],
          set: excludedSet(schema.analysisArtifacts, ["season", "round"]),
        });
    },

    /** Estado guardado en `ingest_state` (por ejemplo, el avance de la carga del histórico). */
    async getState(resource: string): Promise<string | null> {
      const row = await db.query.ingestState.findFirst({ where: (s, { eq }) => eq(s.resource, resource) });
      return row?.updatedAt ?? null;
    },

    async setState(resource: string, value: string): Promise<void> {
      await db
        .insert(schema.ingestState)
        .values({ resource, updatedAt: value })
        .onConflictDoUpdate({ target: schema.ingestState.resource, set: { updatedAt: value } });
    },

    async startRun(id: string, task: string, now = new Date()): Promise<void> {
      await db.insert(schema.ingestRuns).values({ id, task, startedAt: now.toISOString(), status: "running" });
    },

    async finishRun(
      id: string,
      outcome: { status: "ok" | "error" | "quarantined"; requests: number; rowsWritten: number; detail?: string },
      now = new Date(),
    ): Promise<void> {
      await db
        .update(schema.ingestRuns)
        .set({ ...outcome, detail: outcome.detail?.slice(0, 2000) ?? null, finishedAt: now.toISOString() })
        .where(sql`${schema.ingestRuns.id} = ${id}`);
    },
  };
}

export type F1Writer = ReturnType<typeof createF1Writer>;

/**
 * Cuenta las filas de un resultado consolidado que cambiarían. Si superan el umbral,
 * la ingesta se detiene en lugar de sobrescribir (cuarentena, seguridad.md §8).
 */
export function changedResultRows(
  existing: { driverId: string; kind: string; position: number | null; points: number; status: string }[],
  incoming: ResultRow[],
): number {
  const byKey = new Map(existing.map((r) => [`${r.kind}/${r.driverId}`, r]));
  let changed = Math.abs(existing.length - incoming.length);
  for (const r of incoming) {
    const old = byKey.get(`${r.kind}/${r.driverId}`);
    if (!old || old.position !== r.position || old.points !== r.points || old.status !== r.status) changed++;
  }
  return changed;
}
