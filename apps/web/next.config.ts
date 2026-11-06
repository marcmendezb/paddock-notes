import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@paddock/shared", "@paddock/analysis"],
  pageExtensions: ["ts", "tsx"],
};

// MDX del repositorio, compilado en el build (seguridad.md §5): nunca contenido de usuarios ni externo.
// Con Turbopack, los plugins se pasan por nombre.
const withMDX = createMDX({ options: { remarkPlugins: [["remark-gfm", {}]] } });

export default withMDX(config);

// En `next dev`, expone los bindings de wrangler.jsonc (Service Binding a la API) a getCloudflareContext().
if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();
