import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageSlug, PAGES } from "@/lib/pages";
import { parseLang } from "@/lib/params";
import { PageHero } from "@/components/page-hero";

type Params = { params: Promise<{ lang: string; page: string }> };

async function load(params: Params["params"]) {
  const p = await params;
  const lang = parseLang(p.lang);
  if (!isPageSlug(p.page)) notFound();
  return { lang, slug: p.page, page: PAGES[p.page][lang] };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug, page } = await load(params);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${lang}/${slug}`, languages: { es: `/es/${slug}`, en: `/en/${slug}`, de: `/de/${slug}` } },
  };
}

export default async function TextPageView({ params }: Params) {
  const { page } = await load(params);
  return (
    <article>
      <PageHero icon="book" size="m" kicker="Paddock Notes" title={page.title} />
      <div className="container reading">
        <div className="reading-main prose stack-l">
          {page.sections.map((section, i) => (
            <section key={i} className="stack-s" id={section.heading ? `s-${i}` : undefined}>
              {section.heading ? <h2 className="tx-h2">{section.heading}</h2> : null}
              {section.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
          ))}
        </div>
        {page.sections.some((x) => x.heading) ? (
          <nav className="reading-aside" aria-label={page.title}>
            <ul className="reading-links">
              {page.sections.map((x, i) =>
                x.heading ? (
                  <li key={i}>
                    <a href={`#s-${i}`}>{x.heading}</a>
                  </li>
                ) : null,
              )}
            </ul>
          </nav>
        ) : null}
      </div>
    </article>
  );
}
