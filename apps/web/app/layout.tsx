import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { DEFAULT_LANG, isLang } from "@paddock/shared";
import { INTRO_SCRIPT, IntroLoader } from "@/components/intro-loader";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Todo el HTML se renderiza por petición: la CSP lleva un nonce nuevo cada vez (D-04).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Paddock Notes", template: "%s · Paddock Notes" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const requested = h.get("x-lang") ?? DEFAULT_LANG;
  const nonce = h.get("x-nonce") ?? undefined;
  const lang = isLang(requested) ? requested : DEFAULT_LANG;
  return (
    // suppressHydrationWarning: el script de la entrada puede marcar <html data-intro> antes de hidratar.
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* La fuente del titular y la cuenta atrás: precargarla evita que el LCP espere a descubrirla en el CSS. */}
        <link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <script nonce={nonce}>{INTRO_SCRIPT}</script>
        <IntroLoader />
        {children}
      </body>
    </html>
  );
}
