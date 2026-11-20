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
  // No public entry point (security.md §14): any HTTP request gets a 404.
  async fetch(): Promise<Response> {
    return new Response(null, { status: 404 });
  },

  async scheduled(controller, env, ctx): Promise<void> {
    const log = (event: string) => (state: string) => console.log(JSON.stringify({ event, state }));
    // The Tuesday newsletter (CON-06): it calls no source, it only reads D1.
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
    // Retention of inactive accounts, once a week (security.md §17).
    if (task === "corrections") ctx.waitUntil(purgeInactiveAccounts(env, controller.scheduledTime));
    // Grand Prix notice (COM-11), after refreshing the calendar.
    if (task === "schedule") ctx.waitUntil(scheduleRaceNotice(env, controller.scheduledTime).then(log("race_notice")));
    // The history backfill advances on every 15-minute cron, one season at a time (D-11).
    if (task === "recent") {
      ctx.waitUntil(
        advanceBackfill(env, controller.scheduledTime).then((state) =>
          console.log(JSON.stringify({ event: "backfill", state })),
        ),
      );
      // Technical zone analysis: the most recent race without one, one at a time (D-08).
      ctx.waitUntil(
        advanceAnalysis(env, controller.scheduledTime).then((state) =>
          console.log(JSON.stringify({ event: "analysis", state })),
        ),
      );
    }
  },
} satisfies ExportedHandler<Env>;
