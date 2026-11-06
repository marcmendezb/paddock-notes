import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * Componentes de los explicadores en MDX. Los enlaces internos usan next/link; los externos llevan
 * rel="noopener noreferrer" (seguridad.md §5). Las tablas se envuelven en una región enfocable.
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
