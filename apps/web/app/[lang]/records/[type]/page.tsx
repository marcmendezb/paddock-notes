import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RecordTable } from "@/components/record-table";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { isRecordType } from "@/lib/records";

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
    title: lang === "es" ? `Récord de ${r.name.toLowerCase()} en F1` : `F1 record: ${r.name.toLowerCase()}`,
    description: r.def,
    alternates: { canonical: `/${lang}/records/${type}`, languages: { es: `/es/records/${type}`, en: `/en/records/${type}` } },
  };
}

export default async function RecordPage({ params }: Props) {
  const { lang, type } = await load(params);
  const t = dict(lang);
  const r = t.records.types[type];
  const data = await api.records(type);
  return (
    <div className="container stack-l">
      <Breadcrumbs
        lang={lang}
        items={[
          { href: `/${lang}/history`, label: t.history.title },
          { href: `/${lang}/records`, label: t.records.title },
          { label: r.name },
        ]}
      />
      <h1>{r.name}</h1>
      <p className="lede">{r.def}</p>
      {data ? <RecordTable lang={lang} rows={data.data} label={r.name} /> : <p className="muted">{t.home.noData}</p>}
      {data?.updatedAt ? <p className="source">{t.source("Jolpica F1", formatDate(lang, data.updatedAt))}</p> : null}
    </div>
  );
}
