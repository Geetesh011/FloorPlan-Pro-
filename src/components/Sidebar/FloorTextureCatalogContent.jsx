import { useState, useEffect } from 'react';
import { FLOOR_TEXTURES } from '../../data/floorTextures';

function FloorTextureCatalogContent({ rooms, setRooms, selectedRoomIndex, onClose }) {
  const [activeId, setActiveId] = useState(null);
  const [message, setMessage] = useState('');

  // Keep activeId in sync with the selected room's texture
  useEffect(() => {
    if (selectedRoomIndex !== null && rooms[selectedRoomIndex]) {
      setActiveId(rooms[selectedRoomIndex].floorTextureId || 'wood-oak');
      setMessage('');
    } else {
      setActiveId(null);
    }
  }, [selectedRoomIndex, rooms]);

  const handleSelect = (item) => {
    if (selectedRoomIndex === null) {
      setMessage('Select a room first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const nextId = item.id;
    setActiveId(nextId);
    
    // Update the selected room's floor texture
    setRooms(prevRooms => {
      const newRooms = [...prevRooms];
      if (newRooms[selectedRoomIndex]) {
        newRooms[selectedRoomIndex] = {
          ...newRooms[selectedRoomIndex],
          floorTextureId: nextId
        };
      }
      return newRooms;
    });
  };

  return (
    <div className="catalog-panel">
      <div className="catalog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="catalog-title" style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em', margin: 0 }}>Floor Textures</div>
          <div className="catalog-subtitle" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Select a room to apply texture</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {message && (
        <div style={{ margin: '0 1rem', padding: '0.75rem', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', border: '1px solid #fde68a' }}>
          {message}
        </div>
      )}

      <div className="catalog-grid" style={{ marginTop: message ? '0.5rem' : '1rem' }}>
        {FLOOR_TEXTURES.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              className={`catalog-card${isActive ? ' active' : ''}`}
              onClick={() => handleSelect(item)}
            >
              <div className="catalog-thumb">
                <img src={item.thumbnail} alt={item.name} style={{ borderRadius: '8px' }} />
              </div>
              <div className="catalog-item-name" style={{ fontWeight: '500', fontSize: '1rem' }}>{item.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FloorTextureCatalogContent;
