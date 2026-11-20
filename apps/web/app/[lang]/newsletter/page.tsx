import type { Metadata } from "next";
import Link from "next/link";
import { gpName, gpShortName, LIST_TIMEZONE, noteFor, type RaceSummary } from "@paddock/shared";
import { FormMessage } from "@/components/form-message";
import { Icon, type IconName } from "@/components/icons";
import { NewsletterForm } from "@/components/newsletter-form";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ msg?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).newsletter;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/newsletter`, languages: { es: "/es/newsletter", en: "/en/newsletter", de: "/de/newsletter" } },
  };
}

const ICONS: IconName[] = ["flag", "chart", "book", "calendar"];

/** The Tuesday after a race, which is when the issue goes out (Tuesday cron at 08:00). */
function tuesdayAfter(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const add = (2 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

/**
 * Newsletter (NUC-10, CON-06), shown instead of promised. An inbox with one issue per Grand Prix raced (the
 * subject, with the real winner), the form in the header, the anatomy of an issue made with the last race
 * and the dates of the next mailings. Signing up is a demonstration (D-33).
 */
export default async function NewsletterPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const { msg } = await searchParams;
  const t = dict(lang).newsletter;
  const [schedule, last] = await Promise.all([api.schedule("current").catch(() => null), api.lastRace().catch(() => null)]);
  const races = schedule?.data ?? [];
  const done = races.filter((r): r is RaceSummary & { winner: NonNullable<RaceSummary["winner"]> } => r.status === "completed" && r.winner !== null).reverse();
  const upcoming = races.filter((r) => r.status === "next" || r.status === "upcoming");
  const race = last?.data ?? null;
  const note = race ? noteFor(race.season, race.round) : null;
  const next = upcoming[0] ?? null;

  return (
    <>
      <section className="nlx-hero" data-surface="ink" aria-labelledby="page-title">
        <div className="container nlx-hero-grid">
          <div className="nlx-copy">
            <p className="eyebrow ph-kicker">
              <Icon name="book" /> {t.title} · {t.pageKicker}
            </p>
            <h1 id="page-title" className="nlx-title">
              {t.lede}
            </h1>
            <div className="nlx-form">
              <FormMessage lang={lang} msg={msg} okText={msg === "newsletter:ok" ? t.demo.text : undefined} />
              <NewsletterForm lang={lang} back="newsletter" />
            </div>
          </div>

          {done.length ? (
            <div className="nlx-inbox" aria-labelledby="inbox">
              <div className="nlx-inbox-bar">
                <span className="nlx-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <h2 id="inbox" className="nlx-inbox-title">
                  {t.inbox}
                </h2>
                <span className="nlx-inbox-count">{t.inboxCount(done.length)}</span>
              </div>
              <ol className="nlx-mails">
                {done.slice(0, 7).map((r, i) => (
                  <li key={r.round} className={i === 0 ? "is-unread" : undefined}>
                    <Link href={`/${lang}/races/${r.season}/${r.round}`} className="nlx-mail">
                      <span className="nlx-mail-from">
                        Paddock Notes <span className="nlx-mail-no">· {t.issue(r.round)}</span>
                      </span>
                      <time className="nlx-mail-date tabular" dateTime={tuesdayAfter(r.date)}>
                        {formatDate(lang, tuesdayAfter(r.date))}
                      </time>
                      <span className="nlx-mail-subject">
                        {t.subject(r.winner.familyName, gpName(lang, r.name), gpShortName(lang, r.name))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </section>

      <div className="container stack-xl">
        {race && race.results.length ? (
          <section aria-labelledby="anatomy" className="nlx-anatomy">
            <div className="section-head">
              <h2 id="anatomy" className="section-title">
                {t.anatomy}
              </h2>
              <p>{t.anatomyLede}</p>
            </div>
            <div className="nlx-anatomy-grid">
              <article className="nlx-issue" data-surface="ink" aria-label={t.sample}>
                <header className="nl-issue-head">
                  <span className="nl-issue-brand">Paddock Notes</span>
                  <span className="nl-issue-no">
                    {t.issue(race.round)} · {formatDate(lang, tuesdayAfter(race.date))}
                  </span>
                </header>
                <h3 className="nl-issue-title">{note ? note.title[lang] : gpName(lang, race.name)}</h3>
                <div className="nlx-part" data-n="01">
                  <p className="nl-issue-label">{t.lines}</p>
                  <ol className="nl-lines">
                    {race.results.slice(0, 5).map((r, i) => (
                      <li key={r.driver.id}>
                        <span className="nl-line-pos">{i + 1}</span>
                        <span className="nl-line-name">{r.driver.familyName}</span>
                        <span className="nl-line-team">{r.constructor.name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="nlx-part" data-n="02">
                  <p className="nl-issue-label">{t.chart}</p>
                  <svg className="nlx-bars" viewBox="0 0 240 70" aria-hidden="true" focusable="false">
                    {race.results.slice(0, 10).map((r, i) => {
                      const top = Math.max(1, race.results[0]!.points);
                      const h = Math.max(3, (r.points / top) * 60);
                      return <rect key={r.driver.id} x={i * 24 + 2} y={66 - h} width="18" height={h} className={i === 0 ? "nlx-bar is-first" : "nlx-bar"} />;
                    })}
                  </svg>
                </div>
                <div className="nlx-part" data-n="03">
                  <p className="nl-issue-label">{t.contents[2]}</p>
                </div>
                {next?.startsAt ? (
                  <div className="nlx-part" data-n="04">
                    <p className="nl-next">
                      <Icon name="calendar" />
                      <span>
                        <span className="nl-issue-label">{t.nextUp}</span>
                        <span className="nl-next-text">
                          {gpName(lang, next.name)} · {formatDateTime(lang, next.startsAt, LIST_TIMEZONE[lang])} ({t.zone})
                        </span>
                      </span>
                    </p>
                  </div>
                ) : null}
              </article>
              <ol className="nlx-callouts">
                {t.contents.map((line, i) => (
                  <li key={line}>
                    <span className="nlx-callout-n tabular" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="nlx-callout-icon">
                      <Icon name={ICONS[i] ?? "flag"} />
                    </span>
                    <span className="nlx-callout-text">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {upcoming.length ? (
          <section aria-labelledby="upcoming">
            <div className="section-head">
              <h2 id="upcoming" className="section-title">
                {t.upcoming}
              </h2>
              <p>{t.sendTime}</p>
            </div>
            <ol className="nlx-next">
              {upcoming.map((r, i) => (
                <li key={r.round} className={i === 0 ? "is-next" : undefined}>
                  <time className="nlx-next-date" dateTime={tuesdayAfter(r.date)}>
                    {formatDate(lang, tuesdayAfter(r.date))}
                  </time>
                  <span className="nlx-next-gp">{t.after(gpName(lang, r.name), gpShortName(lang, r.name))}</span>
                  <span className="nlx-next-no tabular">{t.issue(r.round)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <p className="nlx-demo">
          <Icon name="eye" />
          <span>
            {t.demoNote} <Link href={`/${lang}/privacy`}>{dict(lang).footer.privacy}</Link>
          </span>
        </p>
      </div>
    </>
  );
}
