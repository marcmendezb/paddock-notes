import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { countryName, gpName, type Lang } from "@paddock/shared";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CircuitMap } from "@/components/charts/circuit-map";
import { notesFor } from "@/content/circuits";
import { CIRCUIT_GUIDES } from "@/content/circuit-guides";
import { StatGrid } from "@/components/stat-grid";
import { DriverLink, TeamLink } from "@/components/links";
import { api } from "@/lib/api";
import { formatDate, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

type Params = { params: Promise<{ lang: string; id: string }> };

async function load(params: Params["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const profile = await api.circuit(p.id);
  if (!profile) notFound();
  return { lang, profile: profile.data };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, profile } = await load(params);
  const name = profile.circuit.name;
  return {
    title: lang === "es" ? `${name}: ganadores y datos del circuito` : `${name}: winners and circuit facts`,
    description:
      lang === "es"
        ? `Todos los Grandes Premios disputados en ${name}, año a año.`
        : `Every Grand Prix held at ${name}, year by year.`,
    alternates: {
      canonical: `/${lang}/circuits/${profile.circuit.id}`,
      languages: { es: `/es/circuits/${profile.circuit.id}`, en: `/en/circuits/${profile.circuit.id}` },
    },
  };
}

export default async function CircuitPage({ params }: Params) {
  const { lang, profile } = await load(params);
  const t = dict(lang);
  const { circuit, races } = profile;
  // Una respuesta cacheada de antes de añadir `facts` no los trae: la página sale igual, sin esas cifras.
  const facts = profile.facts ?? { laps: null, fastestRaceLap: null };
  const place = `${circuit.locality}, ${countryName(lang, circuit.country)}`;
  const first = races.at(-1);
  // Solo cuentan los Grandes Premios ya disputados, no el del próximo fin de semana.
  const today = new Date().toISOString().slice(0, 10);
  const held = races.filter((r) => r.date < today);
  const layout = await api.circuitLayout(circuit.id);
  const guide = CIRCUIT_GUIDES[circuit.id];
  const GuideBody = guide?.body[lang];
  const km = layout ? new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", { maximumFractionDigits: 2 }).format(layout.data.length / 1000) : "";

  return (
    <article className="container stack-xl">
      <div className="stack">
        <Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: circuit.name }]} />
        <header className="stack-s">
          <p className="eyebrow">{place}</p>
          <h1>{circuit.name}</h1>
          {first && held.length ? <p className="lede">{t.circuit.lede(circuit.name, place, held.length, first.season)}</p> : null}
        </header>
        <StatGrid
          items={[
            ...(first ? [{ label: t.circuit.facts.first, value: first.season }] : []),
            ...(facts.laps
              ? [{ label: t.circuit.facts.laps, value: facts.laps.laps, detail: String(facts.laps.season) }]
              : []),
            ...(facts.fastestRaceLap
              ? [
                  {
                    label: t.circuit.facts.fastest,
                    value: facts.fastestRaceLap.time,
                    detail: `${fullName(facts.fastestRaceLap.driver)}, ${facts.fastestRaceLap.season}`,
                  },
                ]
              : []),
          ]}
        />
        {facts.fastestRaceLap ? <p className="source">{t.circuit.facts.fastestNote}</p> : null}
      </div>

      {guide && GuideBody ? (
        <section aria-label={t.circuit.guide} className="stack" id="guide">
          <p className="eyebrow">{t.circuit.guide}</p>
          <div className="article">
            <GuideBody />
          </div>
          <p className="source">{t.circuit.guideUpdated(formatDate(lang, guide.updated))}</p>
        </section>
      ) : null}

      {layout ? (
        <CircuitMap
          points={layout.data.points}
          label={t.circuit.layout(circuit.name)}
          caption={t.circuit.layoutCaption(layout.data.season, km)}
          corners={layout.data.corners}
        />
      ) : null}

      {layout && layout.data.corners.length ? (
        <section aria-labelledby="braking" className="stack">
          <h2 id="braking">{t.circuit.braking}</h2>
          <p className="muted">{t.circuit.brakingHelp}</p>
          <BrakingTable lang={lang} circuitId={circuit.id} corners={layout.data.corners} />
        </section>
      ) : null}

      <section aria-labelledby="winners" className="stack">
        <h2 id="winners">{t.circuit.winners}</h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label={t.circuit.winners}>
          <table>
            <thead>
              <tr>
                <th scope="col">{t.circuit.cols.season}</th>
                <th scope="col">{t.circuit.cols.gp}</th>
                <th scope="col">{t.circuit.cols.winner}</th>
                <th scope="col">{t.circuit.cols.team}</th>
              </tr>
            </thead>
            <tbody>
              {races.map((r) => (
                <tr key={`${r.season}-${r.round}`}>
                  <th scope="row">{r.season}</th>
                  <td>
                    <Link href={`/${lang}/races/${r.season}/${r.round}`}>{gpName(lang, r.name)}</Link>
                  </td>
                  <td>{r.winner ? <DriverLink lang={lang} driver={r.winner} /> : "—"}</td>
                  <td>{r.constructor ? <TeamLink lang={lang} team={r.constructor} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}

/** Frenadas de la vuelta rápida con su velocidad mínima y, si la hay, la nota editorial (NUC-44). */
function BrakingTable({ lang, circuitId, corners }: { lang: Lang; circuitId: string; corners: { n: number; at: number; speed: number; gear: number }[] }) {
  const t = dict(lang).circuit;
  const notes = notesFor(circuitId, corners);
  const slowest = Math.min(...corners.map((c) => c.speed));
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={t.braking}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="num">{t.brakingCols.n}</th>
            <th scope="col" className="num">{t.brakingCols.speed}</th>
            <th scope="col" className="num">{t.brakingCols.gear}</th>
            <th scope="col">{t.brakingCols.note}</th>
          </tr>
        </thead>
        <tbody>
          {corners.map((c) => {
            const note = notes.get(c.n);
            return (
              <tr key={c.n}>
                <th scope="row" className="num">{c.n}</th>
                <td className="num">
                  {c.speed} km/h
                  {c.speed === slowest ? <span className="tag">{t.slowest}</span> : null}
                </td>
                <td className="num">{c.gear || "—"}</td>
                <td>{note ? `${t.turn(note.turn)}. ${note.note[lang]}` : <span className="muted">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
