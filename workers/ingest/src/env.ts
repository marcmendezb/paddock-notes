import type { BackfillParams } from "./backfill";
import type { MailingParams } from "./mailing";
import type { PostRaceParams } from "./post-race";
import type { OutboundLimiter } from "./limiter";

export interface Env {
  DB: D1Database;
  OUTBOUND_LIMITER: DurableObjectNamespace<OutboundLimiter>;
  BACKFILL: Workflow<BackfillParams>;
  POST_RACE: Workflow<PostRaceParams>;
  MAILING: Workflow<MailingParams>;
  /** The post-race JSON (D-08), in KV to stay on the free plan (D-39). */
  ANALYSIS: KVNamespace;
  OPENF1_BASE_URL: string;
  OPENF1_MAX_PER_SECOND: string;
  OPENF1_MAX_PER_MINUTE: string;
  SITE_URL: string;
  JOLPICA_BASE_URL: string;
  JOLPICA_MAX_PER_SECOND: string;
  JOLPICA_MAX_PER_HOUR: string;
  /** The history backfill's hourly limit: leaves room for live ingestion (D-10). */
  JOLPICA_BACKFILL_MAX_PER_HOUR: string;
  /**
   * Email Service (D-16): newsletter, notifications (COM-11) and retention notices. Not bound today: the
   * project sends no email (D-38); without it, sending is logged and skipped.
   */
  EMAIL?: {
    send: (message: { from: string; to: string; subject: string; text: string; headers?: Record<string, string> }) => Promise<unknown>;
  };
  EMAIL_FROM: string;
  /** The controller's postal address for the mailings' footer (content.md §5.5). Empty: not shown. */
  MAIL_POSTAL_ADDRESS?: string;
  /** "false" in local development: laps are not loaded (some 14 requests per race). */
  BACKFILL_LAPS?: string;
  /**
   * "false" in production: Jolpica answers 429 to every Worker (they share one Cloudflare address), so its
   * part of ingestion runs from GitHub Actions (runner/, D-40). Locally, wrangler dev reaches it directly.
   */
  JOLPICA_IN_WORKER?: string;
}
