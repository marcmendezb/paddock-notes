import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ToolName } from "@paddock/analysis";
import { gpName, type Lang } from "@paddock/shared";
import { PaceChart, PaceTable } from "@/components/analysis/pace-chart";
import { ReplayView } from "@/components/analysis/replay-view";
import { SectorsTable } from "@/components/analysis/sectors-table";
import { StrategyChart, StrategyTable } from "@/components/analysis/strategy-chart";
import { TelemetryView } from "@/components/analysis/telemetry-view";
import { ToolFrame } from "@/components/analysis/tool-frame";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SERIES_COUNT } from "@/components/charts/series";
import { api } from "@/lib/api";
import { paceNote, replayNote, sectorsNote, strategyNote, telemetryNote } from "@/lib/analysis-notes";
import { dict } from "@/lib/i18n";
import { parseLang, parseRound, parseSeason } from "@/lib/params";
import { isTool, TOOL_ORDER } from "@/lib/tools";

type Props = {
  params: Promise<{ lang: string; season: string; round: string; tool: string }>;
  searchParams: Promise<{ d?: string | string[]; a?: string; b?: string; all?: string; mode?: string }>;
};

async function load(params: Props["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  const season = parseSeason(p.season);
  const round = parseRound(p.round);
  if (!isTool(p.tool)) notFound();
  const [index, race] = await Promise.all([api.analysisIndex(season, round), api.race(season, round)]);
  if (!index || !race || !index.data.tools.includes(p.tool)) notFound();
  return { lang, season, round, tool: p.tool as ToolName, index: index.data, race: race.data };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, season, round, tool, race } = await load(params);
  const t = dict(lang).analysis.tools[tool];
  return {
    title: `${t.name}: ${gpName(lang, race.name)} ${season}`,
    description: t.q,
    alternates: {
      canonical: `/${lang}/analysis/${season}/${round}/${tool}`,
      languages: { es: `/es/analysis/${season}/${round}/${tool}`, en: `/en/analysis/${season}/${round}/${tool}` },
    },
  };
}

const driverNumbers = (value: string | string[] | undefined) =>
  [value ?? []].flat().filter((v) => /^\d{1,2}$/.test(v)).map(Number);

export default async function ToolPage({ params, searchParams }: Props) {
  const { lang, season, round, tool, index, race } = await load(params);
  const query = await searchParams;
  const t = dict(lang);
  const name = `${gpName(lang, race.name)} ${season}`;
  const base = `/${lang}/analysis/${season}/${round}`;

  return (
    <div className="container stack-l">
      <Breadcrumbs
        lang={lang}
        items={[
          { href: `/${lang}/analysis`, label: t.analysis.title },
          { href: base, label: name },
          { label: t.analysis.tools[tool].name },
        ]}
      />
      <h1>{t.analysis.tools[tool].name}</h1>
      <nav aria-label={t.analysis.title}>
        <ul className="link-list">
          {TOOL_ORDER.filter((x) => index.tools.includes(x)).map((x) => (
            <li key={x}>
              <Link href={`${base}/${x}`} aria-current={x === tool ? "page" : undefined}>
                {t.analysis.tools[x].name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Tool lang={lang} season={season} round={round} tool={tool} telemetryDrivers={index.telemetryDrivers} query={query} base={base} />
    </div>
  );
}

async function Tool({
  lang,
  season,
  round,
  tool,
  telemetryDrivers,
  query,
  base,
}: {
  lang: Lang;
  season: number;
  round: number;
  tool: ToolName;
  telemetryDrivers: number[];
  query: Awaited<Props["searchParams"]>;
  base: string;
}) {
  const t = dict(lang).analysis;
  const frame = { lang, question: t.tools[tool].q, howTo: t.read[tool] };

  if (tool === "strategy") {
    const data = await api.strategy(season, round);
    if (!data) notFound();
    return (
      <ToolFrame {...frame} note={strategyNote(lang, data.data)} updatedAt={data.updatedAt}>
        <StrategyChart lang={lang} data={data.data} />
        <details>
          <summary>{t.tableAlt}</summary>
          <StrategyTable lang={lang} data={data.data} />
        </details>
      </ToolFrame>
    );
  }

  if (tool === "pace") {
    const data = await api.pace(season, round);
    if (!data) notFound();
    const picked = driverNumbers(query.d);
    const selected = (picked.length ? picked : data.data.drivers.slice(0, 2).map((d) => d.number)).slice(0, 4);
    const showAll = query.all === "1";
    return (
      <ToolFrame {...frame} note={paceNote(lang, data.data, selected)} updatedAt={data.updatedAt}>
        <form action={`${base}/pace`} method="get" className="stack-s">
          <fieldset className="picker">
            <legend>{t.upTo4}</legend>
            {data.data.drivers.map((d) => (
              <label key={d.number}>
                <input type="checkbox" name="d" value={d.number} defaultChecked={selected.includes(d.number)} />
                {d.code}
              </label>
            ))}
          </fieldset>
          <label className="picker">
            <input type="checkbox" name="all" value="1" defaultChecked={showAll} /> {t.showAll}
          </label>
          <button type="submit">{dict(lang).standings2.show}</button>
        </form>
        <PaceChart lang={lang} data={data.data} selected={selected.slice(0, SERIES_COUNT)} showAll={showAll} />
        <details>
          <summary>{t.tableAlt}</summary>
          <PaceTable lang={lang} data={data.data} selected={selected} />
        </details>
      </ToolFrame>
    );
  }

  if (tool === "sectors") {
    const data = await api.sectors(season, round);
    if (!data) notFound();
    const mode = query.mode === "average" ? "average" : "best";
    return (
      <ToolFrame {...frame} note={sectorsNote(lang, data.data)} updatedAt={data.updatedAt}>
        <ul className="link-list">
          {(["best", "average"] as const).map((m) => (
            <li key={m}>
              <Link href={`${base}/sectors?mode=${m}`} aria-current={m === mode ? "page" : undefined}>
                {t.mode[m]}
              </Link>
            </li>
          ))}
        </ul>
        <SectorsTable lang={lang} data={data.data} mode={mode} />
      </ToolFrame>
    );
  }

  if (tool === "replay") {
    const data = await api.replay(season, round);
    if (!data) notFound();
    return (
      <ToolFrame {...frame} note={replayNote(lang, data.data)} updatedAt={data.updatedAt}>
        <ReplayView
          data={data.data}
          labels={{
            play: t.play,
            pause: t.pause,
            speed: t.speedLabel,
            lap: t.lap,
            lapOf: t.lapOf(0, 0).replace("0", "{n}").replace("0", "{total}"),
            title: t.tools.replay.name,
          }}
        />
      </ToolFrame>
    );
  }

  // Telemetría: por defecto, los dos primeros con datos (TEC-04); la URL guarda la vista (TEC-10).
  const pick = (v: string | undefined, fallback: number) =>
    v && /^\d{1,2}$/.test(v) && telemetryDrivers.includes(Number(v)) ? Number(v) : fallback;
  const aNum = pick(query.a, telemetryDrivers[0]!);
  const bNum = pick(query.b, telemetryDrivers.find((n) => n !== aNum) ?? telemetryDrivers[1]!);
  const [a, b] = await Promise.all([api.telemetry(season, round, aNum), api.telemetry(season, round, bNum)]);
  if (!a || !b) notFound();
  const options = await api.pace(season, round);
  const names = new Map(options?.data.drivers.map((d) => [d.number, `${d.code} · ${d.name}`]) ?? []);
  return (
    <ToolFrame {...frame} note={telemetryNote(lang, a.data, b.data)} updatedAt={a.updatedAt}>
      <form action={`${base}/telemetry`} method="get" className="inline-form">
        {(["a", "b"] as const).map((key) => (
          <label key={key}>
            {key === "a" ? t.driverA : t.driverB}
            <select name={key} defaultValue={key === "a" ? aNum : bNum}>
              {telemetryDrivers.map((n) => (
                <option key={n} value={n}>
                  {names.get(n) ?? n}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button type="submit">{dict(lang).compare.go}</button>
      </form>
      <TelemetryView
        locale={lang === "es" ? "es-ES" : "en-GB"}
        a={a.data}
        b={b.data}
        labels={{
          speed: t.speed,
          throttle: t.throttle,
          brake: t.brake,
          delta: t.delta,
          units: t.units,
          map: t.map,
          mapTable: t.mapTable,
          segment: t.segment,
          faster: t.faster("{name}"),
          deltaEstimate: t.deltaEstimate,
        }}
      />
    </ToolFrame>
  );
}
