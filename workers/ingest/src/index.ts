import type { Env } from "./env";
import { advanceBackfill } from "./backfill";
import { scheduleNewsletter, scheduleRaceNotice } from "./mailing";
import { advanceAnalysis } from "./post-race";
import { purgeInactiveAccounts } from "./retention";
import { CRON_TASKS, runTask } from "./tasks";

export { BackfillWorkflow } from "./backfill";
export { PostRaceWorkflow } from "./post-race";
export { MailingWorkflow } from "./mailing";
export { OutboundLimiter } from "./limiter";

const NEWSLETTER_CRON = "0 8 * * 2";

export default {
  // Sin entrada pública (seguridad.md §14): cualquier petición HTTP recibe 404.
  async fetch(): Promise<Response> {
    return new Response(null, { status: 404 });
  },

  async scheduled(controller, env, ctx): Promise<void> {
    const log = (event: string) => (state: string) => console.log(JSON.stringify({ event, state }));
    // Newsletter de los martes (CON-06): no llama a ninguna fuente, solo lee D1.
    if (controller.cron === NEWSLETTER_CRON) {
      ctx.waitUntil(scheduleNewsletter(env, controller.scheduledTime).then(log("newsletter")));
      return;
    }
    const task = CRON_TASKS[controller.cron];
    if (!task) {
      console.error(JSON.stringify({ event: "unknown_cron", cron: controller.cron }));
      return;
    }
    ctx.waitUntil(runTask(env, task, controller.scheduledTime));
    // Retención de cuentas inactivas, una vez por semana (seguridad.md §17).
    if (task === "corrections") ctx.waitUntil(purgeInactiveAccounts(env, controller.scheduledTime));
    // Aviso de GP (COM-11), tras refrescar el calendario.
    if (task === "schedule") ctx.waitUntil(scheduleRaceNotice(env, controller.scheduledTime).then(log("race_notice")));
    // La carga del histórico avanza en cada cron de 15 minutos, de una temporada en una (D-11).
    if (task === "recent") {
      ctx.waitUntil(
        advanceBackfill(env, controller.scheduledTime).then((state) =>
          console.log(JSON.stringify({ event: "backfill", state })),
        ),
      );
      // Análisis de la zona técnica: la carrera más reciente sin analizar, de una en una (D-08).
      ctx.waitUntil(
        advanceAnalysis(env, controller.scheduledTime).then((state) =>
          console.log(JSON.stringify({ event: "analysis", state })),
        ),
      );
    }
  },
} satisfies ExportedHandler<Env>;
