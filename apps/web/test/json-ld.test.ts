import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../components/json-ld";

describe("JSON-LD serialization (security.md §5)", () => {
  it("escapes characters that could break out of a script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script> & co" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script> & co" });
  });
});
