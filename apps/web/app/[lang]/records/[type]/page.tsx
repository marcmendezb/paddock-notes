import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RecordTable } from "@/components/record-table";
import { api } from "@/lib/api";
import { formatDate, formatPoints, fullName } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { isRecordType, RECORD_ICON } from "@/lib/records";
import { HeroStats, PageHero } from "@/components/page-hero";

type Props = { params: Promise<{ lang: string; type: string }> };

async function load(params: Props["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  if (!isRecordType(p.type)) notFound();
  return { lang, type: p.type };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, type } = await load(params);
  const r = dict(lang).records.types[type];
  return {
    title: { es: `Récord de ${r.name.toLowerCase()} en F1`, en: `F1 record: ${r.name.toLowerCase()}`, de: `F1-Rekord: ${r.name}` }[lang],
    description: r.def,
    alternates: { canonical: `/${lang}/records/${type}`, languages: { es: `/es/records/${type}`, en: `/en/records/${type}`, de: `/de/records/${type}` } },
  };
}

export default async function RecordPage({ params }: Props) {
  const { lang, type } = await load(params);
  const t = dict(lang);
  const r = t.records.types[type];
  const data = await api.records(type);
  const first = data?.data[0];
  return (
    <>
      <PageHero
        icon={RECORD_ICON[type]}
        crumbs={
          <Breadcrumbs
            lang={lang}
            items={[
              { href: `/${lang}/history`, label: t.history.title },
              { href: `/${lang}/records`, label: t.records.title },
              { label: r.name },
            ]}
          />
        }
        kicker={t.records.title}
        title={r.name}
        lede={<p>{r.def}</p>}
        aside={
          first ? (
            <HeroStats items={[{ label: fullName(first.driver), value: formatPoints(lang, first.value), sub: first.detail ?? undefined, accent: true }]} />
          ) : undefined
        }
      />
      <div className="container stack-l">
        {data ? <RecordTable lang={lang} rows={data.data} label={r.name} /> : <p className="muted">{t.home.noData}</p>}
        {data?.updatedAt ? <p className="source">{t.source("Jolpica F1", formatDate(lang, data.updatedAt))}</p> : null}
      </div>
    </>
  );
}
