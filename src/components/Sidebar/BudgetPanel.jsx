import { useMemo, useState, useEffect, useRef } from 'react';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const CATEGORY_COLORS = {
  Beds:    '#c9a875',
  Storage: '#8b6f47',
  Work:    '#a67c52',
  Seating: '#6b5b95',
  Dining:  '#5b7c99',
  Doors:   '#b45309', // A distinct orange/brown for Doors
};

function ItemRow({ item, onPriceChange, onRemove, readOnly }) {
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
      <div className={`budget-item-thumb ${categoryClass}`}>
        {catalogItem?.thumbnail && <img src={catalogItem.thumbnail} alt={item.name} style={{ width: '75%', height: '75%', objectFit: 'contain' }} />}
      </div>
      <div className="budget-item-meta">
        <div className="budget-item-title" style={{ fontWeight: '500', fontSize: '1rem' }}>{item.name}</div>
        <div className="budget-item-subtitle" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)' }}>{category}</div>
      </div>
      <div className="budget-item-controls">
        {editing && !readOnly ? (
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
            onClick={!readOnly ? startEdit : undefined}
            title={!readOnly ? "Click to override price" : undefined}
            style={readOnly ? { cursor: 'default' } : undefined}
          >
            {fmt(effectivePrice)}
          </button>
        )}
        {!readOnly && (
          <button className="budget-remove-button" onClick={() => onRemove(item.id)} title="Remove item">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function DoorItemRow({ door, onRemove, readOnly }) {
  const DOOR_LABELS = {
    'single-left': 'Single Left Door',
    'single-right': 'Single Right Door',
    'double': 'Double Door',
    'sliding': 'Sliding Door',
  };
  const DOOR_PRICES = {
    'single-left': 150,
    'single-right': 150,
    'double': 280,
    'sliding': 220,
  };
  const type = door.type || 'single-left';
  const name = DOOR_LABELS[type];
  const price = door.customPrice ?? DOOR_PRICES[type];
  
  return (
    <div className="budget-item-card">
      <div className={`budget-item-thumb category-doors`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(180, 83, 9, 0.1)', color: '#b45309' }}>
         <div style={{ fontSize: '24px' }}>🚪</div>
      </div>
      <div className="budget-item-meta">
        <div className="budget-item-title" style={{ fontWeight: '500', fontSize: '1rem' }}>{name}</div>
        <div className="budget-item-subtitle" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)' }}>Doors</div>
      </div>
      <div className="budget-item-controls">
        <div className="budget-price-button" style={{ cursor: 'default', background: 'none' }}>
          {fmt(price)}
        </div>
        {!readOnly && (
          <button className="budget-remove-button" onClick={() => onRemove(door.id)} title="Remove door">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function BudgetPanel({ rooms, placedFurniture, onPriceChange, onRemove, doors = [], onRemoveDoor, readOnly = false }) {
  const [collapsed, setCollapsed] = useState(false);

  const prevFurnitureCount = useRef(placedFurniture.length);
  useEffect(() => {
    if (placedFurniture.length > prevFurnitureCount.current) {
      setCollapsed(false);
    }
    prevFurnitureCount.current = placedFurniture.length;
  }, [placedFurniture.length]);

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
    
    // Add doors to budget
    const doorPrices = {
      'single-left': 150,
      'single-right': 150,
      'double': 280,
      'sliding': 220,
    };
    
    for (const d of (doors || [])) {
      const type = d.type || 'single-left';
      const price = d.customPrice ?? doorPrices[type] ?? 150;
      tot += price;
      cats['Doors'] = (cats['Doors'] ?? 0) + price;
    }
    
    return { total: tot, byCategory: cats, itemCount: placedFurniture.length + (doors || []).length };
  }, [placedFurniture, doors]);

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
    <>
      {collapsed && (
        <button
          type="button"
          className="floating-collapse-btn"
          onClick={() => setCollapsed(false)}
          title="Expand budget"
        >
          ◀
        </button>
      )}
      <aside className={`budget-panel${collapsed ? ' collapsed' : ''}`}>
      <div className="budget-headline">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>Budget Estimate</h2>
          <span style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
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
              <div className="budget-total-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '500', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>Total Estimate</div>
              <div className="budget-total-value" style={{ fontWeight: '700', fontSize: '2rem', letterSpacing: '-0.02em' }}>{fmt(total)}</div>
              {itemCount === 0 ? (
                <div className="budget-summary-hint" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Add furniture to start seeing your estimate.
                </div>
              ) : (
                <div className="budget-summary-hint" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {itemCount} item{itemCount !== 1 ? 's' : ''} placed in room.
                </div>
              )}
            </div>
            <div className="budget-donut" style={{ background: donutGradient, borderRadius: '50%' }} />
          </div>
        </section>

        {Object.keys(byCategory).length > 0 && (
          <section className="budget-section">
            <div className="budget-section-heading" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '500', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Category Breakdown</div>
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

        { (placedFurniture.length > 0 || (doors || []).length > 0) ? (
          <section className="budget-section">
            <div className="budget-section-heading" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '500', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Items in room</div>
            {placedFurniture.map((item) => (
              <ItemRow key={item.id} item={item} onPriceChange={onPriceChange} onRemove={onRemove} readOnly={readOnly} />
            ))}
            {(doors || []).map((door) => (
              <DoorItemRow key={door.id} door={door} onRemove={onRemoveDoor} readOnly={readOnly} />
            ))}
          </section>
        ) : (
          <div className="budget-empty-state">
            <div className="budget-empty-icon">🛋️</div>
            <div className="budget-empty-title" style={{ fontWeight: '500', fontSize: '1rem', marginTop: '1rem' }}>No furniture in the room yet</div>
            <div className="budget-empty-copy" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'center' }}>
              Drag a furniture item from the left panel onto the canvas to preview cost and budget breakdown.
            </div>
          </div>
        )}
      </div>

      {collapsed && total > 0 && (
        <div className="budget-collapsed-pill">Budget {fmt(total)}</div>
      )}
    </aside>
    </>
  );
}

export default BudgetPanel;
