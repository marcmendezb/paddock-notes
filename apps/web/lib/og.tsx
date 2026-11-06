import "server-only";
import { ImageResponse } from "next/og";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SITE_URL } from "./site";

/**
 * Imagen para redes de 1200×630 (TEC-11), según la plantilla del brandboard (marca.md §7): fondo negro,
 * titular a la izquierda, cota en lima y fuente con fecha. Las fuentes (TTF, OFL) se leen de los
 * recursos estáticos: en Workers no hay sistema de archivos.
 */
export const OG_SIZE = { width: 1200, height: 630 };

async function asset(path: string): Promise<ArrayBuffer> {
  const { env } = await getCloudflareContext({ async: true });
  const request = new Request(new URL(path, SITE_URL));
  const response = env.ASSETS ? await env.ASSETS.fetch(request) : await fetch(new URL(path, "http://localhost:3000"));
  if (!response.ok) throw new Error(`No se pudo leer ${path}`);
  return response.arrayBuffer();
}

export async function ogImage({
  eyebrow,
  title,
  subtitle,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  footer: string;
}) {
  const [regular, semibold, display, logo] = await Promise.all([
    asset("/og-fonts/archivo-400.ttf"),
    asset("/og-fonts/archivo-600.ttf"),
    asset("/og-fonts/archivo-semicondensed-700.ttf"),
    asset("/brand/paddock-notes-horizontal-sobre-negro.svg"),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`;
  const lime = "#C6F432";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0A0A",
          color: "#F5F5F5",
          padding: "64px 72px",
          fontFamily: "Archivo",
        }}
      >
        <img src={logoSrc} width={312} height={56} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 28, color: "#A3A3A3" }}>{eyebrow}</div>
          <div style={{ fontFamily: "Archivo Display", fontSize: title.length > 70 ? 56 : 68, lineHeight: 1.04, maxWidth: 1000 }}>
            {title}
          </div>
          {subtitle ? <div style={{ fontSize: 30, color: "#F5F5F5", maxWidth: 960 }}>{subtitle}</div> : null}
          <div style={{ display: "flex", alignItems: "center", width: 520, height: 16, marginTop: 8 }}>
            <div style={{ width: 3, height: 16, background: lime }} />
            <div style={{ flex: 1, height: 3, background: lime }} />
            <div style={{ width: 3, height: 16, background: lime }} />
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#A3A3A3", fontWeight: 600 }}>{footer}</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
        { name: "Archivo", data: semibold, weight: 600, style: "normal" },
        { name: "Archivo Display", data: display, weight: 700, style: "normal" },
      ],
      headers: { "cache-control": "public, max-age=86400" },
    },
  );
}
