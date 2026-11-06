/**
 * Seis series categóricas de la marca (marca.md §5): cada una con color, trazo y marcador propios,
 * para que no dependan solo del tono. Los colores salen de los tokens --data-1 … --data-6 vía clases
 * (la CSP no permite estilos en línea).
 */
export const SERIES_COUNT = 6;

export const seriesClass = (i: number) => `series series-${(i % SERIES_COUNT) + 1}`;

/** Marcador de 8 px: círculo, cuadrado, triángulo, rombo, aspa, anillo. */
export function Marker({ index, cx, cy }: { index: number; cx: number; cy: number }) {
  const r = 4;
  switch (index % SERIES_COUNT) {
    case 0:
      return <circle cx={cx} cy={cy} r={r} className="series-marker" />;
    case 1:
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} className="series-marker" />;
    case 2:
      return <path d={`M${cx},${cy - r - 1} L${cx + r + 1},${cy + r} L${cx - r - 1},${cy + r} Z`} className="series-marker" />;
    case 3:
      return <path d={`M${cx},${cy - r - 1} L${cx + r + 1},${cy} L${cx},${cy + r + 1} L${cx - r - 1},${cy} Z`} className="series-marker" />;
    case 4:
      return (
        <path
          d={`M${cx - r},${cy - r} L${cx + r},${cy + r} M${cx + r},${cy - r} L${cx - r},${cy + r}`}
          className="series-marker series-marker-stroke"
        />
      );
    default:
      return <circle cx={cx} cy={cy} r={r} className="series-marker series-marker-ring" />;
  }
}

/** Muestra de leyenda para formularios de selección: el mismo trazo y marcador que en el gráfico. */
export function SeriesSwatch({ index }: { index: number }) {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true" className={seriesClass(index)}>
      <line x1="0" x2="28" y1="6" y2="6" className="series-line" />
      <Marker index={index} cx={14} cy={6} />
    </svg>
  );
}
