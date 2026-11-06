import { NotFoundView, requestLang } from "@/components/not-found-view";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** Rutas que no existen en ningún segmento: misma 404, con cabecera y pie. */
export default async function RootNotFound() {
  const lang = await requestLang();
  return (
    <>
      <SiteHeader lang={lang} />
      <main id="content">
        <NotFoundView lang={lang} />
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
