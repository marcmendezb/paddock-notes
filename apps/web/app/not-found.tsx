import { NotFoundView, requestLang } from "@/components/not-found-view";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** Routes that exist in no segment: the same 404, with header and footer. */
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
