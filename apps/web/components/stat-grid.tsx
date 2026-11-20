/** A profile's key figures: a large value and a label, like a dimension line (brand.md §4). */
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
