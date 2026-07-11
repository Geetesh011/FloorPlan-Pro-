import { useState } from 'react';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

const LEFT_RAIL = [
  { label: 'Interior', icon: '🛋' },
];

const CATEGORIES = [
  'All', 'Sofas & Armchairs', 'Beds', 'Storage', 'Tables', 'Chairs', 'Office',
  'Curtains & Blinds', 'Rugs', 'Decor', 'Lighting', 'Kitchen', 'Bathroom', 'Plants', 'Misc',
];

function FurnitureCatalog({ onSelectFurniture }) {
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const query = search.toLowerCase().trim();
  const filteredItems = FURNITURE_CATALOG.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (item) => {
    const next = item.id === activeId ? null : item.id;
    setActiveId(next);
    onSelectFurniture(next ? item : null);
  };

  return (
    <div className="catalog-shell">
      <div className="catalog-rail">
        {LEFT_RAIL.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={`catalog-rail-button${index === 0 ? ' active' : ''}`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div className="catalog-panel">
        <div className="catalog-header">
          <div>
            <div className="catalog-title" style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em', margin: 0 }}>Furniture</div>
            <div className="catalog-subtitle" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Tap an item to place it in your room</div>
          </div>
        </div>

        <div className="catalog-search">
          <span>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search furniture..."
          />
          {search && (
            <button type="button" className="catalog-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="catalog-grid">
          {filteredItems.length === 0 ? (
            <div className="catalog-no-results" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
              No items match "{search}"
            </div>
          ) : filteredItems.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                className={`catalog-card${isActive ? ' active' : ''}`}
                onClick={() => handleSelect(item)}
              >
                <div className="catalog-thumb">
                  <img src={item.thumbnail} alt={item.name} />
                </div>
                <div className="catalog-item-name" style={{ fontWeight: '500', fontSize: '1rem' }}>{item.name}</div>
              </button>
            );
          })}
        </div>


      </div>
    </div>
  );
}

export default FurnitureCatalog;
