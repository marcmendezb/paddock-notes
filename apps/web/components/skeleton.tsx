/** Esqueleto de carga con la forma del contenido: nunca una pantalla en blanco (TRA-30). */
export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="container stack-l" aria-busy="true">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="stack-s">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton skeleton-row" />
        ))}
      </div>
    </div>
  );
}
