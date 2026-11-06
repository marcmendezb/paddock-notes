import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../components/json-ld";

describe("JSON-LD (seguridad.md §5)", () => {
  it("escapa los caracteres que podrían cerrar la etiqueta <script>", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script> & co" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script> & co" });
  });
});
