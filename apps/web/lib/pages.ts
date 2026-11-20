import type { Lang } from "@paddock/shared";

/**
 * Text pages (content.md §3.9 and §10). Minimum content for phase 1; no substitute for advice from a legal
 * professional.
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
            "Paddock Notes es un proyecto personal y no oficial que explica la Fórmula 1 con datos. Lo construí para demostrar cómo diseño un producto de datos completo: una API propia sobre fuentes públicas, visualizaciones hechas a mano, una web en tres idiomas y accesible, y una estrategia de contenido medible.",
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
            "Jolpica F1 (resultados e histórico) y OpenF1 (timing desde 2023), ambos con licencia CC BY-NC-SA 4.0. Los trazados de los circuitos sin telemetría salen de bacinger/f1-circuits (licencia MIT). Los datos y gráficos de Paddock Notes se publican con la misma licencia. La API pública está en /api/v1/docs.",
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
            "Paddock Notes is a personal, unofficial project that explains Formula 1 with data. I built it to show how I design a complete data product: an own API on top of public sources, hand-made visualisations, a trilingual and accessible website, and a measurable content strategy.",
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
            "Jolpica F1 (results and history) and OpenF1 (timing since 2023), both licensed CC BY-NC-SA 4.0. Layouts for circuits without telemetry come from bacinger/f1-circuits (MIT licence). Paddock Notes data and charts are published under the same licence. The public API lives at /api/v1/docs.",
          ],
        },
        {
          heading: "How it's made",
          paragraphs: ["The code is open source (MIT licence) and the decisions are documented in the repository."],
        },
      ],
    },
    de: {
      title: "Über das Projekt",
      description: "Was Paddock Notes ist, woher die Daten kommen und wie es gebaut ist.",
      sections: [
        {
          paragraphs: [
            "Paddock Notes ist ein persönliches, inoffizielles Projekt, das die Formel 1 mit Daten erklärt. Ich habe es gebaut, um zu zeigen, wie ich ein vollständiges Datenprodukt gestalte: eine eigene API auf öffentlichen Quellen, handgemachte Visualisierungen, eine dreisprachige und barrierefreie Website und eine messbare Content-Strategie.",
          ],
        },
        {
          heading: "Was dahintersteckt",
          paragraphs: [
            "Next.js und React auf Cloudflare, eine Datenbank mit der Geschichte der F1 und Analysen, die nach jedem Rennen berechnet werden.",
          ],
        },
        {
          heading: "Woher die Daten kommen",
          paragraphs: [
            "Jolpica F1 (Ergebnisse und Historie) und OpenF1 (Zeitnahme seit 2023), beide lizenziert unter CC BY-NC-SA 4.0. Die Streckenverläufe ohne Telemetrie stammen aus bacinger/f1-circuits (MIT-Lizenz). Die Daten und Grafiken von Paddock Notes erscheinen unter derselben Lizenz. Die öffentliche API ist unter /api/v1/docs erreichbar.",
          ],
        },
        {
          heading: "Wie es gemacht ist",
          paragraphs: ["Der Code ist Open Source (MIT-Lizenz), und die Entscheidungen sind im Repository dokumentiert."],
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
            "Si no creas una cuenta, Paddock Notes no trata datos personales: las visitas se miden con Cloudflare Web Analytics, sin cookies y sin identificar a nadie. Por eso no hay banner de consentimiento.",
            "Newsletter: Paddock Notes es un proyecto de portfolio y el formulario de la newsletter es una demostración. Lo que escribes no se envía a ningún servidor ni se guarda en ningún sitio, y no recibirás ningún email.",
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
            "If you don't create an account, Paddock Notes processes no personal data: visits are measured with Cloudflare Web Analytics, with no cookies and without identifying anyone. That's why there is no consent banner.",
            "Newsletter: Paddock Notes is a portfolio project and the newsletter form is a demonstration. What you type isn't sent to any server or stored anywhere, and you won't receive any email.",
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
    de: {
      title: "Datenschutz",
      description: "Welche Daten Paddock Notes verarbeitet.",
      sections: [
        {
          paragraphs: [
            "Wenn du kein Konto anlegst, verarbeitet Paddock Notes keine personenbezogenen Daten: Besuche werden mit Cloudflare Web Analytics gemessen, ohne Cookies und ohne jemanden zu identifizieren. Deshalb gibt es kein Einwilligungsbanner.",
            "Newsletter: Paddock Notes ist ein Portfolio-Projekt, und das Newsletter-Formular ist eine Demonstration. Was du eingibst, wird an keinen Server geschickt und nirgends gespeichert, und du bekommst keine E-Mail.",
            "Wenn du ein Konto anlegst, speichern wir deine E-Mail-Adresse, den gewählten Namen, deine Sprache, deine Tipps, deine Ligen und deine Quiz-Ergebnisse, nur damit diese Funktionen laufen (Rechtsgrundlage: Erbringung des gewünschten Dienstes). Es gibt keine Passwörter: Du meldest dich über einen Link per E-Mail an.",
            "Die Sitzung nutzt ein einziges technisch notwendiges Cookie (__Host-pn.session_token), nie für Werbung. Deine IP-Adresse speichern wir nicht.",
            "Die E-Mail-Benachrichtigungen des Kontos (vor jedem Grand Prix und bei Erscheinen der Analyse) sind standardmäßig aus. Du schaltest sie in deinem Konto oder über den Abmeldelink in jeder E-Mail an oder aus.",
            "Du kannst deine Daten jederzeit als JSON herunterladen und dein Konto auf deiner Kontoseite löschen: Die Löschung erfolgt sofort. Konten, die 24 Monate inaktiv sind, werden nach einer Vorwarnung gelöscht.",
            "Technische Protokolle speichern den Pfad, den Antwortcode und das Land, nie die vollständige IP-Adresse oder Autorisierungs-Header.",
            "Dienstleister: Cloudflare, Inc. (Hosting, Datenbank in der EU, E-Mail-Versand, Bot-Schutz und Analyse). Maßgebliche Vorschriften: DSGVO (EU) und revDSG (Schweiz).",
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
    de: {
      title: "Impressum",
      description: "Verantwortlicher, Art des Projekts und Lizenzen.",
      sections: [
        {
          paragraphs: [
            "Paddock Notes ist ein persönliches, nicht kommerzielles und inoffizielles Projekt ohne Verbindung zur Formel 1, zur FIA oder zu einem Team. F1, FORMULA 1 und verwandte Marken gehören ihren Inhabern.",
            "Daten: Jolpica F1 und OpenF1, lizenziert unter CC BY-NC-SA 4.0. Abgeleitete Daten erscheinen unter derselben Lizenz. Code: MIT-Lizenz.",
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
            "Cada gráfico tiene una tabla equivalente con los mismos datos, y los interactivos se recorren con el teclado.",
            "Problemas conocidos: la tira de horarios de la cabecera y el vídeo del inicio se mueven y no se pueden pausar (criterio 2.2.2). Con «reducir movimiento» activado en tu sistema, los dos se quedan quietos.",
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
            "Every chart has an equivalent table with the same data, and interactive charts can be explored with the keyboard.",
            "Known issues: the timing strip in the header and the home page video move and can't be paused (criterion 2.2.2). With \"reduce motion\" turned on in your system, both stay still.",
            "If you find a barrier, tell us and we'll fix it.",
          ],
        },
      ],
    },
    de: {
      title: "Barrierefreiheit",
      description: "Angestrebtes Niveau der Barrierefreiheit und bekannte Probleme.",
      sections: [
        {
          paragraphs: [
            "Ziel: WCAG 2.2 Stufe AA. Jede Seite wird bei jeder Änderung mit der Tastatur und mit axe geprüft.",
            "Jede Grafik hat eine gleichwertige Tabelle mit denselben Daten, und interaktive Grafiken lassen sich mit der Tastatur bedienen.",
            "Bekannte Probleme: Das Zeitband in der Kopfzeile und das Video auf der Startseite bewegen sich und lassen sich nicht anhalten (Kriterium 2.2.2). Mit „Bewegung reduzieren“ in deinem System bleiben beide still.",
            "Wenn du auf eine Barriere stößt, sag es uns, und wir beheben sie.",
          ],
        },
      ],
    },
  },
};

export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}
