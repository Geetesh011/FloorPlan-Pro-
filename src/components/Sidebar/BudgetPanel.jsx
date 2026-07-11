import { useMemo, useState } from 'react';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const CATEGORY_COLORS = {
  Beds:    '#c9a875',
  Storage: '#8b6f47',
  Work:    '#a67c52',
  Seating: '#6b5b95',
  Dining:  '#5b7c99',
};

function ItemRow({ item, onPriceChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const effectivePrice = item.customPrice ?? item.price;
  const isCustom = item.customPrice !== undefined && item.customPrice !== item.price;

  const startEdit = () => {
    setDraft(String(effectivePrice));
    setEditing(true);
  };

  const commitEdit = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0) onPriceChange(item.id, val);
    setEditing(false);
  };

  const catalogItem = FURNITURE_CATALOG.find((c) => c.id === item.catalogId);
  const category = catalogItem?.category ?? 'Other';
  const categoryClass = `category-${category.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="budget-item-card">
      <div className={`budget-item-thumb ${categoryClass}`} />
      <div className="budget-item-meta">
        <div className="budget-item-title">{item.name}</div>
        <div className="budget-item-subtitle">{category}</div>
      </div>
      <div className="budget-item-controls">
        {editing ? (
          <input
            autoFocus
            className="budget-price-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <button
            className={`budget-price-button ${isCustom ? 'custom-price' : ''}`}
            onClick={startEdit}
            title="Click to override price"
          >
            {fmt(effectivePrice)}
          </button>
        )}
        <button className="budget-remove-button" onClick={() => onRemove(item.id)} title="Remove item">
          Remove
        </button>
      </div>
    </div>
  );
}

function BudgetPanel({ rooms, placedFurniture, onPriceChange, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  const { total, byCategory, itemCount } = useMemo(() => {
    let tot = 0;
    const cats = {};
    for (const f of placedFurniture) {
      const price = f.customPrice ?? f.price;
      tot += price;
      const catalogItem = FURNITURE_CATALOG.find((c) => c.id === f.catalogId);
      const cat = catalogItem?.category ?? 'Other';
      cats[cat] = (cats[cat] ?? 0) + price;
    }
    return { total: tot, byCategory: cats, itemCount: placedFurniture.length };
  }, [placedFurniture]);

  const donutGradient = total > 0
    ? `conic-gradient(${Object.entries(byCategory)
        .reduce((segments, [cat, amt]) => {
          const start = segments.length ? segments[segments.length - 1].end : 0;
          const sweep = (amt / total) * 360;
          const end = start + sweep;
          segments.push({ color: CATEGORY_COLORS[cat] || '#999', start, end });
          return segments;
        }, [])
        .map(({ color, start, end }) => `${color} ${start}deg ${end}deg`)
        .join(', ')})`
    : 'rgba(229,231,235,0.85)';

  return (
    <aside className={`budget-panel${collapsed ? ' collapsed' : ''}`}>
      <div className="budget-headline">
        <div>
          <h2>Budget Estimate</h2>
          <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>
        <button
          type="button"
          className="budget-collapse-btn"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Expand budget' : 'Collapse budget'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <div className="budget-body">
        <section className="budget-section">
          <div className="budget-total-card">
            <div>
              <div className="budget-total-label">Total Estimate</div>
              <div className="budget-total-value">{fmt(total)}</div>
              {itemCount === 0 ? (
                <div className="budget-summary-hint">
                  Add furniture to start seeing your estimate.
                </div>
              ) : (
                <div className="budget-summary-hint">
                  {itemCount} item{itemCount !== 1 ? 's' : ''} placed in room.
                </div>
              )}
            </div>
            <div className="budget-donut" style={{ background: donutGradient, borderRadius: '50%' }} />
          </div>
        </section>

        {Object.keys(byCategory).length > 0 && (
          <section className="budget-section">
            <div className="budget-section-heading">Category Breakdown</div>
            <div className="budget-legend">
              {Object.entries(byCategory).map(([cat, amount]) => {
                const legendClass = `category-${cat.toLowerCase().replace(/\s+/g, '-')}`;
                return (
                  <div key={cat} className="budget-legend-item">
                    <span className={`budget-legend-dot ${legendClass}`} />
                    <span>{cat}</span>
                    <span>{fmt(amount)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {placedFurniture.length > 0 ? (
          <section className="budget-section">
            <div className="budget-section-heading">Items</div>
            {placedFurniture.map((item) => (
              <ItemRow key={item.id} item={item} onPriceChange={onPriceChange} onRemove={onRemove} />
            ))}
          </section>
        ) : (
          <div className="budget-empty-state">
            <div className="budget-empty-icon">🛋️</div>
            <div className="budget-empty-title">No furniture in the room yet</div>
            <div className="budget-empty-copy">
              Drag a furniture item from the left panel onto the canvas to preview cost and budget breakdown.
            </div>
          </div>
        )}
      </div>

      {collapsed && total > 0 && (
        <div className="budget-collapsed-pill">Budget {fmt(total)}</div>
      )}
    </aside>
  );
}

export default BudgetPanel;
