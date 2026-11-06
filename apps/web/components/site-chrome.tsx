import Link from "next/link";
import type { Lang } from "@paddock/shared";
import { dict } from "@/lib/i18n";
import { REPO_URL } from "@/lib/site";
import { LangSwitch } from "./lang-switch";
import { NavLinks } from "./nav-links";
import { SearchShortcut } from "./search-shortcut";

/** Cabecera siempre en negro (data-surface="ink"), también en modo claro (marca.md §3). */
export function SiteHeader({ lang }: { lang: Lang }) {
  const t = dict(lang);
  return (
    <header className="site-header" data-surface="ink">
      <div className="container header-row">
        <Link href={`/${lang}`} className="logo" aria-label={`${t.name}, ${t.tagline}`}>
          <img src="/brand/paddock-notes-horizontal-sobre-negro.svg" alt="" width={156} height={28} className="logo-wide" />
          <img src="/brand/paddock-notes-simbolo-sobre-negro.svg" alt="" width={28} height={28} className="logo-narrow" />
        </Link>
        <nav aria-label={lang === "es" ? "Principal" : "Main"}>
          <NavLinks
            lang={lang}
            items={[
              { href: "/races", label: t.nav.races },
              { href: "/standings", label: t.nav.standings },
              { href: "/analysis", label: t.nav.analysis },
              { href: "/history", label: t.nav.history },
              { href: "/learn", label: t.nav.learn },
              { href: "/search", label: t.nav.search },
            ]}
          />
        </nav>
        <Link href={`/${lang}/account`} className="lang-switch">
          {t.account.nav}
        </Link>
        <LangSwitch target={t.otherLangCode} label={t.otherLang} />
        <SearchShortcut lang={lang} />
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const t = dict(lang);
  return (
    <footer className="site-footer">
      <div className="container">
        <p>{t.footer.disclaimer}</p>
        <p>{t.footer.data}</p>
        <ul className="footer-links">
          <li>
            <Link href={`/${lang}/about`}>{t.footer.about}</Link>
          </li>
          <li>
            <Link href={`/${lang}/newsletter`}>{t.footer.newsletter}</Link>
          </li>
          <li>
            <Link href={`/${lang}/privacy`}>{t.footer.privacy}</Link>
          </li>
          <li>
            <Link href={`/${lang}/legal`}>{t.footer.legal}</Link>
          </li>
          <li>
            <Link href={`/${lang}/accessibility`}>{t.footer.accessibility}</Link>
          </li>
          <li>
            <a href={REPO_URL} rel="noopener noreferrer">
              {t.footer.code}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

/** Aviso de datos antiguos (TRA-32). */
export function StaleNotice({ lang, updatedAt }: { lang: Lang; updatedAt: string | null }) {
  const hours = updatedAt ? Math.max(1, Math.round((Date.now() - Date.parse(updatedAt)) / 3_600_000)) : null;
  return (
    <p className="notice" role="status">
      {hours === null ? dict(lang).error.data : dict(lang).stale(hours)}
    </p>
  );
}
