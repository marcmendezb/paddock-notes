import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageSlug, PAGES } from "@/lib/pages";
import { parseLang } from "@/lib/params";

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
    alternates: { canonical: `/${lang}/${slug}`, languages: { es: `/es/${slug}`, en: `/en/${slug}` } },
  };
}

export default async function TextPageView({ params }: Params) {
  const { page } = await load(params);
  return (
    <article className="container prose stack-l">
      <h1>{page.title}</h1>
      {page.sections.map((section, i) => (
        <section key={i} className="stack-s">
          {section.heading ? <h2>{section.heading}</h2> : null}
          {section.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
