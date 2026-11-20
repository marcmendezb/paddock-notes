/**
 * A D1Database over Cloudflare's REST API, for the part of ingestion that runs outside Workers (D-40).
 * It implements only what Drizzle's D1 driver uses: prepare → bind → all / run / raw / first, and batch
 * (atomic, like the binding's).
 */
interface Bound {
  sql: string;
  params: unknown[];
}

interface Options {
  accountId: string;
  databaseId: string;
  token: string;
}

interface QueryResult {
  results: Record<string, unknown>[];
  meta: Record<string, unknown>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function d1OverHttp({ accountId, databaseId, token }: Options): D1Database {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;

  async function call<T>(path: "query" | "raw", body: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${base}/${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; result?: T; errors?: unknown } | null;
      if (res.ok && json?.success) return json.result as T;
      // Cloudflare's API rate limit or a transient error: back off and try again, at most three times.
      if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw new Error(`D1 ${path} ${res.status}: ${JSON.stringify(json?.errors ?? null)}`);
    }
  }

  // D1 binds undefined as null; the REST API wants JSON values.
  const clean = (params: unknown[]) => params.map((p) => (p === undefined ? null : p));

  const statement = (bound: Bound) => {
    const all = async () => {
      const [r] = await call<QueryResult[]>("query", { sql: bound.sql, params: clean(bound.params) });
      return { results: r?.results ?? [], success: true, meta: r?.meta ?? {} };
    };
    return {
      bound,
      bind: (...params: unknown[]) => statement({ sql: bound.sql, params }),
      all,
      run: all,
      first: async (column?: string) => {
        const row = (await all()).results[0] ?? null;
        return column && row ? (row[column] ?? null) : row;
      },
      raw: async () => {
        const [r] = await call<{ results: { rows: unknown[][] } }[]>("raw", { sql: bound.sql, params: clean(bound.params) });
        return r?.results.rows ?? [];
      },
    };
  };

  return {
    prepare: (sql: string) => statement({ sql, params: [] }),
    batch: async (statements: ReturnType<typeof statement>[]) => {
      const results = await call<QueryResult[]>("query", {
        batch: statements.map((s) => ({ sql: s.bound.sql, params: clean(s.bound.params) })),
      });
      return results.map((r) => ({ results: r.results, success: true, meta: r.meta }));
    },
    exec: () => Promise.reject(new Error("exec is not supported over the REST API")),
    dump: () => Promise.reject(new Error("dump is not supported over the REST API")),
  } as unknown as D1Database;
}
