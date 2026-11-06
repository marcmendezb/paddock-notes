import type { Lang } from "@paddock/shared";

/**
 * Páginas de texto (contenido.md §3.9 y §10). Contenido mínimo para la fase 1; no sustituye el
 * asesoramiento de un profesional del derecho.
 */
export interface TextPage {
  title: string;
  description: string;
  sections: { heading?: string; paragraphs: string[] }[];
}

export const PAGE_SLUGS = ["about", "privacy", "legal", "accessibility"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const PAGES: Record<PageSlug, Record<Lang, TextPage>> = {
  about: {
    es: {
      title: "Sobre el proyecto",
      description: "Qué es Paddock Notes, de dónde salen sus datos y cómo está hecho.",
      sections: [
        {
          paragraphs: [
            "Paddock Notes es un proyecto personal y no oficial que explica la Fórmula 1 con datos. Lo construí para demostrar cómo diseño un producto de datos completo: una API propia sobre fuentes públicas, visualizaciones hechas a mano, una web bilingüe y accesible, y una estrategia de contenido medible.",
          ],
        },
        {
          heading: "Qué hay detrás",
          paragraphs: [
            "Next.js y React sobre Cloudflare, una base de datos con la historia de la F1 y análisis precalculados después de cada carrera.",
          ],
        },
        {
          heading: "De dónde salen los datos",
          paragraphs: [
            "Jolpica F1 (resultados e histórico) y OpenF1 (timing desde 2023), ambos con licencia CC BY-NC-SA 4.0. Los datos y gráficos de Paddock Notes se publican con la misma licencia. La API pública está en /api/v1/docs.",
          ],
        },
        {
          heading: "Cómo se hizo",
          paragraphs: ["El código es abierto (licencia MIT) y las decisiones están documentadas en el repositorio."],
        },
      ],
    },
    en: {
      title: "About",
      description: "What Paddock Notes is, where its data comes from and how it is built.",
      sections: [
        {
          paragraphs: [
            "Paddock Notes is a personal, unofficial project that explains Formula 1 with data. I built it to show how I design a complete data product: an own API on top of public sources, hand-made visualisations, a bilingual and accessible website, and a measurable content strategy.",
          ],
        },
        {
          heading: "What's behind it",
          paragraphs: [
            "Next.js and React on Cloudflare, a database with F1 history and analysis computed after every race.",
          ],
        },
        {
          heading: "Where the data comes from",
          paragraphs: [
            "Jolpica F1 (results and history) and OpenF1 (timing since 2023), both licensed CC BY-NC-SA 4.0. Paddock Notes data and charts are published under the same licence. The public API lives at /api/v1/docs.",
          ],
        },
        {
          heading: "How it's made",
          paragraphs: ["The code is open source (MIT licence) and the decisions are documented in the repository."],
        },
      ],
    },
  },
  privacy: {
    es: {
      title: "Privacidad",
      description: "Qué datos trata Paddock Notes.",
      sections: [
        {
          paragraphs: [
            "Si no creas una cuenta ni te apuntas a la newsletter, Paddock Notes no trata datos personales: las visitas se miden con Cloudflare Web Analytics, sin cookies y sin identificar a nadie. Por eso no hay banner de consentimiento.",
            "Newsletter: guardamos solo tu email y tu idioma (base legal: tu consentimiento). Hasta que confirmas desde el email, el alta queda pendiente; si no confirmas en 48 horas, la borramos. Cada número trae un enlace para darte de baja en un clic, y la baja borra tu email de la lista.",
            "Si creas una cuenta, guardamos tu email, el alias que elijas, tu idioma, tus predicciones, tus ligas y tus puntuaciones del quiz. Solo para que funcionen esas funciones (base legal: ejecución del servicio que pides). No usamos contraseñas: entras con un enlace por email.",
            "La sesión usa una cookie técnica imprescindible (__Host-pn.session_token), sin fines publicitarios. No guardamos tu dirección IP.",
            "Los avisos por email de la cuenta (antes de cada Gran Premio y al publicarse el análisis) están desactivados por defecto. Los activas y desactivas desde tu cuenta o con el enlace de baja de cada email.",
            "Puedes descargar tus datos en JSON y borrar tu cuenta en cualquier momento desde tu cuenta: el borrado es inmediato. Las cuentas inactivas durante 24 meses se borran tras avisarte.",
            "Los registros técnicos guardan la ruta, el código de respuesta y el país, nunca la IP completa ni cabeceras de autorización.",
            "Proveedor: Cloudflare, Inc. (alojamiento, base de datos en la UE, envío de emails, verificación anti-bots y analítica). Normativa de referencia: RGPD (UE) y nLPD (Suiza).",
          ],
        },
      ],
    },
    en: {
      title: "Privacy",
      description: "What data Paddock Notes processes.",
      sections: [
        {
          paragraphs: [
            "If you don't create an account or sign up for the newsletter, Paddock Notes processes no personal data: visits are measured with Cloudflare Web Analytics, with no cookies and without identifying anyone. That's why there is no consent banner.",
            "Newsletter: we only keep your email and language (legal basis: your consent). Your sign-up stays pending until you confirm it from the email; if you don't confirm within 48 hours, we delete it. Every issue has a one-click unsubscribe link, and unsubscribing deletes your email from the list.",
            "If you create an account, we store your email, the alias you choose, your language, your predictions, your leagues and your quiz scores, only so those features work (legal basis: providing the service you ask for). There are no passwords: you sign in with an email link.",
            "The session uses one strictly necessary technical cookie (__Host-pn.session_token), never for advertising. We don't store your IP address.",
            "Account email alerts (before every Grand Prix and when the analysis is published) are off by default. Turn them on or off from your account, or with the unsubscribe link in every email.",
            "You can download your data as JSON and delete your account at any time from your account page: deletion is immediate. Accounts inactive for 24 months are deleted after a warning.",
            "Technical logs store the path, the response code and the country, never the full IP address or authorisation headers.",
            "Provider: Cloudflare, Inc. (hosting, EU database, email delivery, bot protection and analytics). Reference regulations: GDPR (EU) and nFADP (Switzerland).",
          ],
        },
      ],
    },
  },
  legal: {
    es: {
      title: "Aviso legal",
      description: "Responsable, naturaleza del proyecto y licencias.",
      sections: [
        {
          paragraphs: [
            "Paddock Notes es un proyecto personal, no comercial y no oficial, sin afiliación con Formula 1, la FIA ni ningún equipo. F1, FORMULA 1 y las marcas relacionadas pertenecen a sus titulares.",
            "Datos: Jolpica F1 y OpenF1, con licencia CC BY-NC-SA 4.0. Los datos derivados se publican con la misma licencia. Código: licencia MIT.",
          ],
        },
      ],
    },
    en: {
      title: "Legal notice",
      description: "Owner, nature of the project and licences.",
      sections: [
        {
          paragraphs: [
            "Paddock Notes is a personal, non-commercial and unofficial project, not affiliated with Formula 1, the FIA or any team. F1, FORMULA 1 and related marks belong to their owners.",
            "Data: Jolpica F1 and OpenF1, licensed CC BY-NC-SA 4.0. Derived data is published under the same licence. Code: MIT licence.",
          ],
        },
      ],
    },
  },
  accessibility: {
    es: {
      title: "Accesibilidad",
      description: "Nivel de accesibilidad objetivo y problemas conocidos.",
      sections: [
        {
          paragraphs: [
            "Objetivo: WCAG 2.2 nivel AA. Cada página se revisa con teclado y con axe en cada cambio.",
            "Problemas conocidos: los gráficos interactivos todavía no existen; cuando lleguen, cada uno tendrá una tabla equivalente.",
            "Si encuentras una barrera, escríbenos y la corregiremos.",
          ],
        },
      ],
    },
    en: {
      title: "Accessibility",
      description: "Target accessibility level and known issues.",
      sections: [
        {
          paragraphs: [
            "Target: WCAG 2.2 level AA. Every page is checked with a keyboard and with axe on every change.",
            "Known issues: interactive charts don't exist yet; when they arrive, each one will have an equivalent table.",
            "If you find a barrier, tell us and we'll fix it.",
          ],
        },
      ],
    },
  },
};

export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}
