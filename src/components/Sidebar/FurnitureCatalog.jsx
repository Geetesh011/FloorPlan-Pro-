import { useState, useRef } from 'react';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

// ── Category metadata: icon shown in the rail + accent color ─────────────
const CATEGORY_META = {
  Beds:    { icon: '🛏', color: '#c9a875' },
  Storage: { icon: '🗄', color: '#8b6f47' },
  Work:    { icon: '🖥', color: '#a67c52' },
  Seating: { icon: '🪑', color: '#6b5b95' },
  Dining:  { icon: '🍽', color: '#5b7c99' },
};

// Pre-group items by category (stable reference, computed once)
const GROUPED = FURNITURE_CATALOG.reduce((acc, item) => {
  const cat = item.category ?? 'Other';
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(item);
  return acc;
}, {});

function FurnitureCatalog({ onSelectFurniture }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeId, setActiveId]     = useState(null);
  const [search, setSearch]         = useState('');
  const categoryRefs                = useRef({});
  const listRef                     = useRef(null);

  // ── Selection handler ──────────────────────────────────────────────────
  const handleSelect = (item) => {
    const next = item.id === activeId ? null : item.id;
    setActiveId(next);
    onSelectFurniture(next ? item : null);
  };

  // ── Jump to category (opens panel first if closed) ─────────────────────
  const scrollToCategory = (cat) => {
    if (!isExpanded) setIsExpanded(true);
    setTimeout(() => {
      categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 240); // wait for slide-open transition
  };

  // ── Live search filter ─────────────────────────────────────────────────
  const query = search.toLowerCase().trim();
  const filtered = Object.entries(GROUPED).reduce((acc, [cat, items]) => {
    const hits = query ? items.filter(i => i.name.toLowerCase().includes(query)) : items;
    if (hits.length) acc[cat] = hits;
    return acc;
  }, {});

  // ── Shared button style helper ─────────────────────────────────────────
  const railBtn = (active = false) => ({
    width: 36, height: 36, borderRadius: 8,
    background: active ? 'rgba(107,91,149,0.75)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${active ? 'rgba(107,91,149,0.6)' : 'rgba(255,255,255,0.08)'}`,
    color: '#fff', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', outline: 'none', flexShrink: 0,
  });

  return (
    <div style={{ display: 'flex', height: '100vh', flexShrink: 0, zIndex: 100 }}>

      {/* ════════════ ICON RAIL (always visible, 52 px) ════════════ */}
      <div style={{
        width: 52, height: '100vh', flexShrink: 0,
        background: 'rgba(12,12,20,0.97)',
        backdropFilter: 'blur(14px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 0 16px',
        gap: 6,
        boxShadow: '2px 0 16px rgba(0,0,0,0.25)',
        zIndex: 2,
      }}>

        {/* ── Toggle expand / collapse ── */}
        <button
          onClick={() => setIsExpanded(e => !e)}
          title={isExpanded ? 'Collapse sidebar' : 'Expand furniture catalog'}
          style={{ ...railBtn(isExpanded), marginBottom: 6, fontSize: 15 }}
        >
          {isExpanded ? '✕' : '☰'}
        </button>

        {/* ── Divider ── */}
        <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 4 }} />

        {/* ── Category shortcut icons ── */}
        {Object.entries(CATEGORY_META).map(([cat, meta]) => (
          <button
            key={cat}
            title={`Jump to ${cat}`}
            onClick={() => scrollToCategory(cat)}
            style={{ ...railBtn(), fontSize: 17 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            {meta.icon}
          </button>
        ))}
      </div>

      {/* ════════════ SLIDE-OUT CATALOG PANEL (220 px) ════════════ */}
      <div style={{
        width: isExpanded ? 220 : 0,
        height: '100vh',
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#fff',
        borderRight: '1px solid #e2e5ea',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isExpanded ? '4px 0 24px rgba(0,0,0,0.1)' : 'none',
        flexShrink: 0,
      }}>
        {/* Inner wrapper fixes width at 220px so content doesn't collapse during animation */}
        <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* ── Catalog header ── */}
          <div style={{
            padding: '14px 14px 10px',
            background: 'linear-gradient(135deg, #6b5b95, #9333ea)',
            color: '#fff', flexShrink: 0,
          }}>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.2px' }}>🛋 Furniture</div>
            <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>Click item → place on canvas</div>
          </div>

          {/* ── Search bar ── */}
          <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f4f5f8', borderRadius: 8,
              padding: '7px 10px',
              border: '1.5px solid #e2e5ea',
              transition: 'border-color 0.15s',
            }}>
              <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search furniture…"
                style={{
                  border: 'none', outline: 'none',
                  background: 'transparent',
                  fontSize: 12, color: '#1e293b',
                  flex: 1, fontFamily: 'inherit',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    border: 'none', background: 'none',
                    cursor: 'pointer', color: '#94a3b8',
                    fontSize: 12, padding: 0, flexShrink: 0,
                  }}
                >✕</button>
              )}
            </div>
          </div>

          {/* ── Grouped furniture list ── */}
          <div
            ref={listRef}
            style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 24px' }}
          >
            {Object.entries(filtered).length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '36px 12px',
                color: '#94a3b8', fontSize: 12,
              }}>
                No results for <strong>"{search}"</strong>
              </div>
            ) : Object.entries(filtered).map(([cat, items]) => {
              const meta = CATEGORY_META[cat];
              const catColor = meta?.color ?? '#6b5b95';
              return (
                <div
                  key={cat}
                  ref={el => { categoryRefs.current[cat] = el; }}
                  style={{ marginBottom: 16, paddingTop: 8 }}
                >
                  {/* Category heading */}
                  <div style={{
                    fontSize: 9, fontWeight: 700,
                    color: catColor,
                    textTransform: 'uppercase', letterSpacing: '0.9px',
                    marginBottom: 6, paddingLeft: 2,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {meta?.icon && <span style={{ fontSize: 11 }}>{meta.icon}</span>}
                    {cat}
                  </div>

                  {/* Item cards */}
                  {items.map((item) => {
                    const isActive = item.id === activeId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        style={{
                          padding: '8px 10px',
                          marginBottom: 4,
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: isActive ? `${catColor}18` : '#f7f8fa',
                          border: `1.5px solid ${isActive ? catColor : 'transparent'}`,
                          boxShadow: isActive ? `0 0 0 3px ${catColor}22` : 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#eff0f3'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#f7f8fa'; }}
                      >
                        {/* Accent dot */}
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: catColor, flexShrink: 0,
                          boxShadow: isActive ? `0 0 4px ${catColor}` : 'none',
                        }} />
                        <span style={{
                          fontSize: 12, fontWeight: isActive ? 700 : 600,
                          color: isActive ? catColor : '#222',
                          letterSpacing: '-0.1px',
                        }}>
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
}

export default FurnitureCatalog;