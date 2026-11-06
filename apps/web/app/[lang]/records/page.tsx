import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RecordTable } from "@/components/record-table";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { RECORD_TYPES } from "@/lib/records";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).records;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/records`, languages: { es: "/es/records", en: "/en/records" } },
  };
}

/** Récords (HIS-07): los cinco primeros de cada uno, con su definición exacta. */
export default async function RecordsPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const all = await Promise.all(RECORD_TYPES.map(async (type) => ({ type, data: await api.records(type) })));
  return (
    <div className="container stack-xl">
      <div className="stack">
        <Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: t.records.title }]} />
        <h1>{t.records.title}</h1>
        <p className="lede">{t.records.lede}</p>
      </div>
      <div className="cards">
        {all.map(({ type, data }) => (
          <section key={type} aria-labelledby={`record-${type}`} className="stack-s">
            <h2 id={`record-${type}`} className="h-small">
              {t.records.types[type].name}
            </h2>
            <p className="muted">{t.records.types[type].def}</p>
            {data ? <RecordTable lang={lang} rows={data.data.slice(0, 5)} label={t.records.types[type].name} /> : null}
            <p>
              <Link href={`/${lang}/records/${type}`}>{t.records.top}</Link>
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
