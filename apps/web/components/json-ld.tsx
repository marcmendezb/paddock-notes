import { headers } from "next/headers";

/**
 * Datos estructurados (CON-08). Única excepción revisada a la regla contra dangerouslySetInnerHTML
 * (seguridad.md §5): el contenido es JSON generado por nosotros, y se escapan "<", ">" y "&" para que
 * ningún dato pueda cerrar la etiqueta <script>. Lleva el nonce de la CSP.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export async function JsonLd({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // eslint-disable-next-line no-restricted-syntax -- Excepción revisada: JSON escapado (seguridad.md §5).
      dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", ...data }) }}
    />
  );
}
