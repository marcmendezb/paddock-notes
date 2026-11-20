import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * Components for the MDX explainers. Internal links use next/link; external ones carry
 * rel="noopener noreferrer" (security.md §5). Tables are wrapped in a focusable region.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = "", children }) =>
      href.startsWith("/") ? (
        <Link href={href}>{children}</Link>
      ) : (
        <a href={href} rel="noopener noreferrer">
          {children}
        </a>
      ),
    table: ({ children }) => (
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla">
        <table>{children}</table>
      </div>
    ),
    ...components,
  };
}
