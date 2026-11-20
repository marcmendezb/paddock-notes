import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@paddock/shared", "@paddock/analysis"],
  pageExtensions: ["ts", "tsx"],
};

// MDX from the repository, compiled at build time (security.md §5): never user or external content.
// With Turbopack, plugins are passed by name.
const withMDX = createMDX({ options: { remarkPlugins: [["remark-gfm", {}]] } });

export default withMDX(config);

// In `next dev`, it exposes the bindings in wrangler.jsonc (the Service Binding to the API) to getCloudflareContext().
if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();
