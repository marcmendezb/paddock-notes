import Link from "next/link";
import {
  maxPointsPerRound,
  titleContenders,
  type ConstructorStandingRow,
  type DriverStandingRow,
  type Lang,
  type Standings,
} from "@paddock/shared";
import { formatDate, fullName, localeOf } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { Icon } from "./icons";

/**
 * La clasificación de la home contada como la pelea por el título (NUC-04, NUC-36), sobre negro. Cada
 * piloto es un carril: la barra son sus puntos, la trama lo que aún puede sumar si lo gana todo, la línea
 * lila los puntos del líder y la bandera a cuadros, al final, el máximo que alguien puede alcanzar. Quien
 * no llega a la línea lila ya no puede ser campeón. El titular sale de esa cuenta.
 *
 * Las barras van en porcentajes como atributos SVG (la CSP no admite estilos en línea, D-04).
 */

interface Lane {
  key: string;
  href: string;
  name: string;
  detail: string;
  position: number | null;
  points: number;
  favorite: boolean;
}

/** Puntos máximos de un equipo por ronda: sus dos coches primero y segundo. */
function teamMaxPerRound(season: number, isSprintWeekend: boolean): number | null {
  if (season < 2022) return null;
  const fastestLap = season <= 2024 ? 1 : 0;
  return 25 + 18 + fastestLap + (isSprintWeekend ? 8 + 7 : 0);
}

const pct = (value: number, scale: number) => `${Math.max(0, Math.min(100, (value / scale) * 100)).toFixed(2)}%`;

function Lanes({
  lang,
  lanes,
  remaining,
  champion,
  outLabel,
}: {
  lang: Lang;
  lanes: Lane[];
  /** Puntos que aún puede sumar cada uno; null si no se puede calcular. */
  remaining: number | null;
  champion: boolean;
  outLabel: string;
}) {
  const t = dict(lang);
  const f = t.home.fight;
  const leader = lanes[0]?.points ?? 0;
  const scale = Math.max(1, leader + (remaining ?? 0));
  const num = new Intl.NumberFormat(localeOf(lang));

  return (
    <ol className="tf-lanes">
      {lanes.map((lane, i) => {
        const isLeader = i === 0;
        const reach = remaining === null ? null : lane.points + remaining;
        const out = !isLeader && reach !== null && reach < leader;
        const state = isLeader
          ? champion
            ? f.champion
            : f.leader
          : reach === null || remaining === 0
            ? null
            : out
              ? outLabel
              : f.alive(num.format(reach));
        return (
          <li
            key={lane.key}
            className={`tf-lane${isLeader ? " is-leader" : ""}${out ? " is-out" : ""}${lane.favorite ? " is-favorite" : ""}`}
          >
            <span className="tf-pos">{lane.position ?? "–"}</span>
            <span className="tf-who">
              <Link href={lane.href} className="tf-name">
                {lane.name}
              </Link>
              <span className="tf-detail">
                {lane.detail}
                {lane.favorite ? <span className="tag tag-fav">{t.favorite}</span> : null}
              </span>
            </span>
            <span className="tf-pts">
              <span className="tf-pts-line">
                <span className="tf-pts-value">{num.format(lane.points)}</span>
                <span className="tf-pts-unit"> {f.pts}</span>
              </span>
              {isLeader ? null : <span className="tf-gap">−{num.format(leader - lane.points)}</span>}
            </span>
            <svg className="tf-track" aria-hidden="true" focusable="false">
              <rect className="tf-rail" x="0" y="7" width="100%" height="10" />
              {reach !== null && remaining ? (
                <rect className="tf-reach" x={pct(lane.points, scale)} y="7" width={pct(remaining, scale)} height="10" />
              ) : null}
              <rect className="tf-bar" x="0" y="7" width={pct(lane.points, scale)} height="10" />
              <svg x={pct(lane.points, scale)} y="4" width="16" height="16" overflow="visible">
                <rect className="tf-car" x="-8" y="0" width="16" height="16" />
              </svg>
              {remaining ? <rect className="tf-finish" x="100%" y="0" width="8" height="24" transform="translate(-8 0)" /> : null}
              {remaining ? <line className="tf-mark" x1={pct(leader, scale)} x2={pct(leader, scale)} y1="0" y2="24" /> : null}
            </svg>
            {state ? (
              <span className="tf-state">
                {isLeader ? <Icon name="trophy" /> : null}
                {state}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function TitleFight({
  lang,
  drivers,
  constructors,
  remainingRounds,
  favorites,
  updatedAt,
}: {
  lang: Lang;
  drivers: Standings<DriverStandingRow> | null;
  constructors: Standings<ConstructorStandingRow> | null;
  /** Rondas por disputar de la temporada (null si no hay calendario). */
  remainingRounds: { isSprintWeekend: boolean }[] | null;
  favorites: Set<string>;
  updatedAt: string | null;
}) {
  const t = dict(lang);
  const f = t.home.fight;
  const season = drivers?.season ?? constructors?.season ?? null;

  const sum = (per: (sprint: boolean) => number | null) => {
    if (!remainingRounds || season === null) return null;
    let total = 0;
    for (const r of remainingRounds) {
      const max = per(r.isSprintWeekend);
      if (max === null) return null;
      total += max;
    }
    return total;
  };
  const driverRemaining = season === null ? null : sum((s) => maxPointsPerRound(season, s));
  const teamRemaining = season === null ? null : sum((s) => teamMaxPerRound(season, s));

  const contenders =
    drivers && season !== null && remainingRounds
      ? titleContenders(
          season,
          drivers.rows.map((r) => ({ id: r.driver.id, points: r.points })),
          remainingRounds,
        )
      : null;
  const names = (contenders ?? [])
    .map((id) => drivers?.rows.find((r) => r.driver.id === id)?.driver.familyName)
    .filter((n): n is string => Boolean(n));
  const decided = contenders?.length === 1;
  const headline =
    season === null
      ? f.title
      : decided
        ? f.champion_(names[0]!, season)
        : names.length === 2
          ? f.duel(names[0]!, names[1]!)
          : names.length > 2
            ? f.open(names.length)
            : f.title;

  // La ventaja del líder sobre el segundo, en grande junto al titular.
  const leaderRow = drivers?.rows[0]?.driver.familyName ?? null;
  const runnerUp = drivers?.rows[1];
  const second =
    runnerUp && drivers?.rows[0]
      ? { gap: drivers.rows[0].points - runnerUp.points, name: runnerUp.driver.familyName }
      : null;
  const sprints = remainingRounds?.filter((r) => r.isSprintWeekend).length ?? 0;
  const driverLanes: Lane[] = (drivers?.rows ?? []).slice(0, 5).map((r) => ({
    key: r.driver.id,
    href: `/${lang}/drivers/${r.driver.id}`,
    name: fullName(r.driver),
    detail: [r.constructors.map((c) => c.name).join(" / "), f.wins(r.wins)].join(" · "),
    position: r.position,
    points: r.points,
    favorite: favorites.has(`d:${r.driver.id}`) || r.constructors.some((c) => favorites.has(`c:${c.id}`)),
  }));
  const teamLanes: Lane[] = (constructors?.rows ?? []).slice(0, 3).map((r) => ({
    key: r.constructor.id,
    href: `/${lang}/constructors/${r.constructor.id}`,
    name: r.constructor.name,
    detail: f.wins(r.wins),
    position: r.position,
    points: r.points,
    favorite: favorites.has(`c:${r.constructor.id}`),
  }));
  const teamContenders =
    constructors && teamRemaining !== null
      ? constructors.rows.filter((r) => r.points + teamRemaining >= (constructors.rows[0]?.points ?? 0)).length
      : null;

  return (
    <section className="tf" data-surface="ink" aria-labelledby="standings-summary">
      {/* Trama de «lo que aún puede sumar» y cuadros de meta, compartidos por todos los carriles. */}
      <svg className="tf-defs" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="tf-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="tf-rail" />
            <line x1="0" y1="0" x2="0" y2="6" className="tf-hatch-line" />
          </pattern>
          <pattern id="tf-check" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" className="tf-check-a" />
            <rect x="4" y="4" width="4" height="4" className="tf-check-a" />
          </pattern>
        </defs>
      </svg>
      <div className="container tf-grid">
        <header className="tf-head">
          <p className="eyebrow tf-kicker icon-scroll">
            <Icon name="trophy" /> {season !== null && drivers ? f.kicker(season, drivers.round) : t.nav.standings}
          </p>
          <h2 id="standings-summary" className="tf-title">
            {headline}
          </h2>
          {second && leaderRow ? (
            <p className="tf-margin">
              <span className="tf-margin-value">+{second.gap}</span>
              <span className="tf-margin-label">{f.margin(leaderRow, second.name)}</span>
            </p>
          ) : null}
          {remainingRounds && remainingRounds.length > 0 && driverRemaining !== null ? (
            <p className="tf-stakes">
              {f.stakes(remainingRounds.length, sprints)} <strong>{f.stakesPoints(driverRemaining)}</strong>
            </p>
          ) : null}
        </header>

        {driverLanes.length ? (
          <div className="tf-block tf-drivers">
            <h3 className="tf-sub icon-scroll">
              <Icon name="user" /> {f.drivers}
            </h3>
            <Lanes lang={lang} lanes={driverLanes} remaining={driverRemaining} champion={decided} outLabel={f.out} />
          </div>
        ) : (
          <p className="muted">{t.home.noData}</p>
        )}

        {teamLanes.length ? (
          <div className="tf-block tf-teams">
            <h3 className="tf-sub icon-scroll">
              <Icon name="wrench" /> {f.teams}
            </h3>
            <Lanes
              lang={lang}
              lanes={teamLanes}
              remaining={teamRemaining}
              champion={teamContenders === 1}
              outLabel={f.outTeam}
            />
          </div>
        ) : null}

        <footer className="tf-foot">
          {driverRemaining ? (
            <ul className="tf-legend" aria-hidden="true">
              <li>
                <span className="tf-key tf-key-bar" /> {f.legend.points}
              </li>
              <li>
                <span className="tf-key tf-key-reach" /> {f.legend.reach}
              </li>
              <li>
                <span className="tf-key tf-key-mark" /> {f.legend.leader}
              </li>
              <li>
                <span className="tf-key tf-key-finish" /> {f.legend.max}
              </li>
            </ul>
          ) : null}
          <Link href={`/${lang}/standings`} className="tf-more">
            <Icon name="chart" /> {t.home.fullStandings}
          </Link>
          {updatedAt ? <p className="source">{t.source("Jolpica F1", formatDate(lang, updatedAt))}</p> : null}
        </footer>
      </div>
    </section>
  );
}
