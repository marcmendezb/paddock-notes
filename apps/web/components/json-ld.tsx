import { headers } from "next/headers";

/**
 * Structured data (CON-08). The only reviewed exception to the rule against dangerouslySetInnerHTML
 * (security.md §5): the content is JSON we generate, and "<", ">" and "&" are escaped so no data can close
 * the <script> tag. It carries the CSP nonce.
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
      // eslint-disable-next-line no-restricted-syntax -- Reviewed exception: escaped JSON (security.md §5).
      dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", ...data }) }}
    />
  );
}
