/** Cifras clave de una ficha: valor grande y etiqueta, como una cota (marca.md §4). */
export function StatGrid({ items }: { items: { label: string; value: string | number; detail?: string }[] }) {
  return (
    <dl className="stat-grid">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            <span className="stat-value">{item.value}</span>
            {item.detail ? <span className="stat-detail">{item.detail}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
