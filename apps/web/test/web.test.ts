import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, preferredLang } from "../middleware";
import { formatDate, formatPoints, formatSigned } from "../lib/format";
import { dict } from "../lib/i18n";

describe("idioma preferido (TRA-11)", () => {
  it.each([
    [null, "es"],
    ["en-GB,en;q=0.9", "en"],
    ["fr-FR,fr;q=0.9,en;q=0.8,es;q=0.7", "en"],
    ["de-DE", "de"],
    ["de-CH,de;q=0.9,en;q=0.8", "de"],
    ["it-IT", "es"],
    ["es;q=0.5, en;q=0.9", "en"],
    ["en;q=0", "es"],
  ])("%s → %s", (header, lang) => {
    expect(preferredLang(header)).toBe(lang);
  });
});

describe("CSP (seguridad.md §4.1)", () => {
  const csp = contentSecurityPolicy("abc123");

  it("usa nonce y strict-dynamic en script-src, sin unsafe-inline ni unsafe-eval", () => {
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("bloquea iframes, objetos y base", () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("font-src 'self'");
  });
});

describe("formatos (contenido.md §2)", () => {
  it("fechas cortas por idioma", () => {
    expect(formatDate("es", "2025-03-16")).toBe("16 mar 2025");
    expect(formatDate("en", "2025-03-16")).toBe("Mar 16, 2025");
  });

  it("puntos con decimales localizados", () => {
    expect(formatPoints("es", 2.5)).toBe("2,5");
    expect(formatPoints("en", 2.5)).toBe("2.5");
  });

  it("diferencias con signo tipográfico", () => {
    expect(formatSigned("es", 4)).toBe("+4");
    expect(formatSigned("es", -2)).toBe("−2");
    expect(formatSigned("es", 0)).toBe("0");
  });

  it("los dos diccionarios tienen las mismas claves", () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v).map((x) => `${k}.${x}`) : [k]));
    expect(keys(dict("en")).sort()).toEqual(keys(dict("es")).sort());
  });
});
