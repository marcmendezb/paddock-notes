import type { Metadata } from "next";
import { gpName } from "@paddock/shared";
import { api } from "@/lib/api";
import { formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { field, parsePosition, simulate, type Choices } from "@/lib/simulator";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Choices> };

/** Aspirantes que se pueden mover en el simulador. */
const CONTENDERS = 6;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).simulator;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/simulator`, languages: { es: "/es/simulator", en: "/en/simulator" } },
  };
}

/** Simulador "¿y si...?" (COM-09): sin cuenta, en el navegador o sin JS, con URL compartible. */
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
    <div className="container stack-xl">
      <div className="stack-s">
        <h1>{t.simulator.title}</h1>
        <p className="lede">{t.simulator.lede}</p>
      </div>

      {rounds.length === 0 || drivers.length === 0 ? (
        <p className="muted">{t.simulator.noRounds}</p>
      ) : (
        <>
          {hasChoices && champion ? (
            <section aria-labelledby="result" className="stack">
              <h2 id="result">{t.simulator.result}</h2>
              {conflicts.length > 0 ? (
                <ul className="notice" role="alert">
                  {[...new Set(conflicts.map((c) => c.round))].map((round) => (
                    <li key={round}>{t.simulator.conflict(round)}</li>
                  ))}
                </ul>
              ) : (
                <p className="auto-note">{t.simulator.champion(champion.name, formatPoints(lang, champion.total))}</p>
              )}
              <div className="table-wrap" tabIndex={0} role="region" aria-label={t.simulator.result}>
                <table>
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
                      <tr key={d.id}>
                        <td className="num">{i + 1}</td>
                        <th scope="row">{d.name}</th>
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

          <form action={`/${lang}/simulator#result`} method="get" className="stack-l">
            <p className="muted">{t.simulator.help}</p>
            {rounds.map((r) => (
              <fieldset key={r.round} className="stack-s sim-round">
                <legend className="h-small">
                  {t.home.round(r.round, season)} · {r.name}
                </legend>
                <div className="table-wrap" tabIndex={0} role="region" aria-label={r.name}>
                  <table>
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
            <button type="submit">{t.simulator.calculate}</button>
          </form>
        </>
      )}
    </div>
  );
}
