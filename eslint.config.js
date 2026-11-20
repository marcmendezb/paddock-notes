import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["docs/**", "**/node_modules/**", "**/.next/**", "**/.open-next/**", "**/.wrangler/**", "**/dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // security.md §5: banned except for a reviewed exception.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "dangerouslySetInnerHTML is banned (security.md §5).",
        },
      ],
    },
  },
  {
    // D-14: the API and the web app only read F1 data; writing belongs to ingestion alone.
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
