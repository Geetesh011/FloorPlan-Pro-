import { useState, useMemo } from 'react';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

/* ─── tiny helpers ────────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const CATEGORY_COLORS = {
  Beds:    '#c9a875',
  Storage: '#8b6f47',
  Work:    '#a67c52',
  Seating: '#6b5b95',
  Dining:  '#5b7c99',
};

/* ─── sub-components ──────────────────────────────────────────────── */
function CategoryBar({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: '#555', fontWeight: 500 }}>{label}</span>
        <span style={{ color: '#222', fontWeight: 600 }}>{fmt(amount)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#e8eaed', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color || '#6b5b95',
            borderRadius: 99,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function ItemRow({ item, onPriceChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
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

  const catalogItem = FURNITURE_CATALOG.find(c => c.id === item.catalogId);
  const category    = catalogItem?.category ?? 'Other';
  const catColor    = CATEGORY_COLORS[category] || '#999';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 8,
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        marginBottom: 6,
      }}
    >
      {/* category dot */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />

      {/* name */}
      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </span>

      {/* editable price */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
          style={{
            width: 64, fontSize: 12, border: '1px solid #6b5b95',
            borderRadius: 4, padding: '2px 6px', textAlign: 'right',
          }}
        />
      ) : (
        <button
          onClick={startEdit}
          title="Click to override price"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            color: isCustom ? '#9333ea' : '#222',
            padding: '2px 4px', borderRadius: 4,
            textDecoration: isCustom ? 'underline dotted' : 'none',
          }}
        >
          {fmt(effectivePrice)}
        </button>
      )}

      {/* delete */}
      <button
        onClick={() => onRemove(item.id)}
        title="Remove item"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#bbb', fontSize: 14, lineHeight: 1, padding: 2,
          borderRadius: 4,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
      >
        ✕
      </button>
    </div>
  );
}

/* ─── main panel ──────────────────────────────────────────────────── */
function BudgetPanel({ placedFurniture, onPriceChange, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  const { total, byCategory, itemCount } = useMemo(() => {
    let tot = 0;
    const cats = {};
    for (const f of placedFurniture) {
      const price = f.customPrice ?? f.price;
      tot += price;
      const catalogItem = FURNITURE_CATALOG.find(c => c.id === f.catalogId);
      const cat = catalogItem?.category ?? 'Other';
      cats[cat] = (cats[cat] ?? 0) + price;
    }
    return { total: tot, byCategory: cats, itemCount: placedFurniture.length };
  }, [placedFurniture]);

  return (
    <div
      style={{
        width: collapsed ? 42 : 260,
        minWidth: collapsed ? 42 : 260,
        height: '100vh',
        background: '#fafbfc',
        borderLeft: '1px solid #e2e5ea',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        overflow: 'hidden',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        boxShadow: '-2px 0 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── header ── */}
      <div
        style={{
          padding: '14px 12px 12px',
          borderBottom: '1px solid #e2e5ea',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#111', letterSpacing: '-0.2px' }}>
              Budget Estimate
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand budget panel' : 'Collapse'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, color: '#666', padding: 4, borderRadius: 4,
            lineHeight: 1, marginLeft: collapsed ? 0 : 'auto',
          }}
        >
          {collapsed ? '◀' : '▶'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>

          {/* ── grand total ── */}
          <div
            style={{
              background: 'linear-gradient(135deg, #6b5b95, #9333ea)',
              borderRadius: 12,
              padding: '16px 18px',
              color: '#fff',
              marginBottom: 18,
              boxShadow: '0 4px 12px rgba(107,91,149,0.3)',
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Total Estimate
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
              {fmt(total)}
            </div>
            {itemCount === 0 && (
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                Place furniture to start budgeting
              </div>
            )}
          </div>

          {/* ── category breakdown ── */}
          {Object.keys(byCategory).length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>
                By Category
              </div>
              {Object.entries(byCategory).map(([cat, amt]) => (
                <CategoryBar key={cat} label={cat} amount={amt} total={total} color={CATEGORY_COLORS[cat] || '#999'} />
              ))}
            </div>
          )}

          {/* ── item list ── */}
          {placedFurniture.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                Items <span style={{ fontWeight: 400, color: '#aaa' }}>(click price to edit)</span>
              </div>
              {placedFurniture.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onPriceChange={onPriceChange}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}

          {/* ── empty state ── */}
          {placedFurniture.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#bbb' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🛋️</div>
              <div style={{ fontSize: 12, lineHeight: '1.6' }}>
                Drag furniture from the left panel onto the canvas to see your budget here.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── collapsed total pill ── */}
      {collapsed && total > 0 && (
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            fontSize: 11, fontWeight: 700, color: '#6b5b95', paddingBottom: 12,
          }}
        >
          {fmt(total)}
        </div>
      )}
    </div>
  );
}

export default BudgetPanel;
