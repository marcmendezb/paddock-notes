import { describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { saveLastGood } from "../src/cache";

describe("last-good copy in KV (D-39)", () => {
  it("is written at most once an hour, to stay under the free plan's KV writes", async () => {
    const key = "last-good:test-throttle";
    await saveLastGood(env.CACHE, key, { data: 1 });
    await saveLastGood(env.CACHE, key, { data: 2 });
    // The second save, a moment later, does not rewrite the copy.
    expect(await env.CACHE.get(key, "json")).toEqual({ data: 1 });
  });

  it("is refreshed once the stored copy is older than an hour", async () => {
    const key = "last-good:test-refresh";
    await env.CACHE.put(key, JSON.stringify({ data: "old" }), { metadata: { savedAt: Date.now() - 2 * 3600 * 1000 } });
    await saveLastGood(env.CACHE, key, { data: "new" });
    expect(await env.CACHE.get(key, "json")).toEqual({ data: "new" });
  });
});
