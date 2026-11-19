import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { api } from "@/lib/api";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";
import { RECORD_ICON, RECORD_TYPES } from "@/lib/records";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { formatPoints, fullName } from "@/lib/format";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = parseLang((await params).lang);
  const t = dict(lang).records;
  return {
    title: t.title,
    description: t.lede,
    alternates: { canonical: `/${lang}/records`, languages: { es: "/es/records", en: "/en/records", de: "/de/records" } },
  };
}

/** Récords (HIS-07): los cinco primeros de cada uno, con su definición exacta. */
export default async function RecordsPage({ params }: Props) {
  const lang = parseLang((await params).lang);
  const t = dict(lang);
  const all = await Promise.all(RECORD_TYPES.map(async (type) => ({ type, data: await api.records(type) })));
  return (
    <>
      <PageHero
        icon="trophy"
        crumbs={<Breadcrumbs lang={lang} items={[{ href: `/${lang}/history`, label: t.history.title }, { label: t.records.title }]} />}
        kicker={t.history.title}
        title={t.records.title}
        lede={<p>{t.records.lede}</p>}
      />
      <div className="container">
        <ul className="rec-grid">
          {all.map(({ type, data }) => {
            const rows = data?.data.slice(0, 5) ?? [];
            const [first, ...rest] = rows;
            const top = Math.max(1, first?.value ?? 1);
            return (
              <li key={type}>
                <section aria-labelledby={`record-${type}`} className="rec-card">
                  <p className="rec-kicker">
                    <Icon name={RECORD_ICON[type]} /> <span id={`record-${type}`}>{t.records.types[type].name}</span>
                  </p>
                  {first ? (
                    <div className="rec-leader">
                      <span className="rec-value tabular">{formatPoints(lang, first.value)}</span>
                      <Link href={`/${lang}/drivers/${first.driver.id}`} className="rec-name">
                        {fullName(first.driver)}
                      </Link>
                      {first.detail ? <span className="rec-detail">{first.detail}</span> : null}
                    </div>
                  ) : (
                    <p className="muted">{t.home.noData}</p>
                  )}
                  <p className="rec-def">{t.records.types[type].def}</p>
                  {rest.length ? (
                    <ol className="rec-rest">
                      {rest.map((r) => (
                        <li key={`${r.driver.id}-${r.rank}`}>
                          <span className="rec-rank tabular">{r.rank}</span>
                          <span className="rec-rest-name">{fullName(r.driver)}</span>
                          <span className="rec-rest-value tabular">{formatPoints(lang, r.value)}</span>
                          <svg className="rec-bar" aria-hidden="true" focusable="false">
                            <rect x="0" y="0" width="100%" height="100%" className="rec-bar-rail" />
                            <rect x="0" y="0" width={`${((r.value / top) * 100).toFixed(2)}%`} height="100%" className="rec-bar-fill" />
                          </svg>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <Link href={`/${lang}/records/${type}`} className="ln-more rec-more">
                    {t.records.top} →
                  </Link>
                </section>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
