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
  ANALYSIS: R2Bucket;
  OPENF1_BASE_URL: string;
  OPENF1_MAX_PER_SECOND: string;
  OPENF1_MAX_PER_MINUTE: string;
  SITE_URL: string;
  JOLPICA_BASE_URL: string;
  JOLPICA_MAX_PER_SECOND: string;
  JOLPICA_MAX_PER_HOUR: string;
  /** Límite por hora de la carga del histórico: deja margen a la ingesta en directo (D-10). */
  JOLPICA_BACKFILL_MAX_PER_HOUR: string;
  /** Email Service (D-16): newsletter, avisos (COM-11) y avisos de retención. */
  EMAIL: {
    send: (message: { from: string; to: string; subject: string; text: string; headers?: Record<string, string> }) => Promise<unknown>;
  };
  EMAIL_FROM: string;
  /** Dirección postal del responsable para el pie de los envíos (contenido.md §5.5). Vacía: no se muestra. */
  MAIL_POSTAL_ADDRESS?: string;
  /** "false" en desarrollo local: no carga las vueltas (unas 14 peticiones por carrera). */
  BACKFILL_LAPS?: string;
}
