import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { RouteCurtain } from "@/components/route-curtain";
import { SmoothScroll } from "@/components/smooth-scroll";
import { dict } from "@/lib/i18n";
import { parseLang } from "@/lib/params";

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const lang = parseLang((await params).lang);
  return (
    <>
      <a href="#content" className="skip-link">
        {dict(lang).skip}
      </a>
      <SmoothScroll />
      <SiteHeader lang={lang} />
      <main id="content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter lang={lang} />
      <RouteCurtain />
    </>
  );
}
