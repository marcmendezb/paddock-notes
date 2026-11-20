import type { Metadata } from "next";
import { gpName } from "@paddock/shared";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { HeroStats, PageHero } from "@/components/page-hero";
import { parseLang } from "@/lib/params";
import { field, parsePosition, simulate, type Choices } from "@/lib/simulator";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Choices> };

/** Contenders that can be moved in the simulator. */
const CONTENDERS = 6;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).simulator;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/simulator`, languages: { es: "/es/simulator", en: "/en/simulator", de: "/de/simulator" } },
  };
}

/** The "what if...?" simulator (COM-09): no account, in the browser or without JS, with a shareable URL. */
export default async function SimulatorPage({ params, searchParams }: Props) {
  const lang = parseLang((await params).lang);
  const choices = await searchParams;
  const t = dict(lang);
  const [standings, schedule] = await Promise.all([api.driverStandings("current"), api.schedule("current")]);
  const season = standings?.data.season ?? new Date().getUTCFullYear();
  const drivers = (standings?.data.rows ?? [])
    .slice(0, CONTENDERS)
    .map((r) => ({ id: r.driver.id, name: fullName(r.driver), points: r.points }));
  const rounds = (schedule?.data ?? [])
    .filter((r) => r.status === "next" || r.status === "upcoming")
    .map((r) => ({ round: r.round, name: gpName(lang, r.name), isSprintWeekend: r.isSprintWeekend }));
  const hasChoices = Object.keys(choices).length > 0;
  const { projected, conflicts } = simulate(season, drivers, rounds, choices);
  const champion = projected[0];
  const positions = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <>
      <PageHero
        icon="gauge"
        kicker={t.standings2.kicker(season)}
        title={t.simulator.title}
        lede={<p>{t.simulator.lede}</p>}
        aside={
          drivers.length ? (
            <HeroStats
              items={drivers.slice(0, 3).map((d, i) => ({
                label: d.name,
                value: formatPoints(lang, d.points),
                sub: "pts",
                accent: i === 0,
              }))}
            />
          ) : undefined
        }
      />
      <div className="container stack-xl">

      {rounds.length === 0 || drivers.length === 0 ? (
        <p className="muted">{t.simulator.noRounds}</p>
      ) : (
        <>
          {hasChoices && champion ? (
            <section aria-labelledby="result" className="sim-result" data-surface="ink">
              <h2 id="result" className="sim-result-title">
                {t.simulator.result}
              </h2>
              {conflicts.length > 0 ? (
                <ul className="notice" role="alert">
                  {[...new Set(conflicts.map((c) => c.round))].map((round) => (
                    <li key={round}>{t.simulator.conflict(round)}</li>
                  ))}
                </ul>
              ) : (
                <p className="sim-champion">
                  <Icon name="trophy" /> {t.simulator.champion(champion.name, formatPoints(lang, champion.total))}
                </p>
              )}
              <div className="table-wrap" tabIndex={0} role="region" aria-label={t.simulator.result}>
                <table className="timing-table">
                  <thead>
                    <tr>
                      <th scope="col" className="num">{t.standings.columns.pos}</th>
                      <th scope="col">{t.standings.columns.driver}</th>
                      <th scope="col" className="num">{t.standings.columns.points}</th>
                      <th scope="col" className="num">{t.simulator.gained}</th>
                      <th scope="col" className="num">{t.simulator.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projected.map((d, i) => (
                      <tr key={d.id} className={i === 0 ? "is-p1" : undefined}>
                        <td className="num timing-pos">{i + 1}</td>
                        <th scope="row" className="timing-driver">{d.name}</th>
                        <td className="num">{formatPoints(lang, d.points)}</td>
                        <td className="num">+{formatPoints(lang, d.gained)}</td>
                        <td className="num">{formatPoints(lang, d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="source">{t.simulator.share}</p>
            </section>
          ) : null}

          <form action={`/${lang}/simulator#result`} method="get" className="sim-form">
            <p className="muted">{t.simulator.help}</p>
            <div className="sim-rounds">
            {rounds.map((r) => (
              <fieldset key={r.round} className="sim-round">
                <legend className="sim-legend">
                  <span className="sim-round-n tabular">{String(r.round).padStart(2, "0")}</span>
                  <span className="sim-round-name">{r.name}</span>
                  {r.isSprintWeekend ? <span className="tag">{t.simulator.sprint}</span> : null}
                </legend>
                <div className="table-wrap" tabIndex={0} role="region" aria-label={r.name}>
                  <table className="sim-table">
                    <thead>
                      <tr>
                        <th scope="col">{t.standings.columns.driver}</th>
                        <th scope="col">{t.simulator.race}</th>
                        {r.isSprintWeekend ? <th scope="col">{t.simulator.sprint}</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((d) => (
                        <tr key={d.id}>
                          <th scope="row">{d.name}</th>
                          {(r.isSprintWeekend ? (["r", "s"] as const) : (["r"] as const)).map((kind) => {
                            const name = field(kind, r.round, d.id);
                            const label = `${d.name}, ${kind === "r" ? t.simulator.race : t.simulator.sprint}, ${r.name}`;
                            return (
                              <td key={kind}>
                                <select name={name} aria-label={label} defaultValue={parsePosition(choices[name]) ?? ""}>
                                  <option value="">{t.simulator.none}</option>
                                  {positions.map((p) => (
                                    <option key={p} value={p}>
                                      P{p}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </fieldset>
            ))}
            </div>
            <div className="sim-submit">
              <button type="submit" className="cmp-go">
                {t.simulator.calculate}
              </button>
            </div>
          </form>
        </>
      )}
      </div>
    </>
  );
}
