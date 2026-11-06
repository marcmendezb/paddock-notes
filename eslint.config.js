import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["docs/**", "**/node_modules/**", "**/.next/**", "**/.open-next/**", "**/.wrangler/**", "**/dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // seguridad.md §5: prohibido salvo excepción revisada.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "dangerouslySetInnerHTML está prohibido (seguridad.md §5).",
        },
      ],
    },
  },
  {
    // D-14: la API y la web solo leen datos de F1; la escritura es exclusiva de la ingesta.
    files: ["workers/api/src/**", "apps/web/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@paddock/db/f1-write", message: "Solo paddock-ingest puede escribir datos de F1 (D-14)." },
          ],
        },
      ],
    },
  },
);
