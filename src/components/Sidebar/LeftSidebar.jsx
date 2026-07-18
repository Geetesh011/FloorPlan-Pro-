import { useState } from 'react';
import FurnitureCatalogContent from './FurnitureCatalogContent';
import FloorTextureCatalogContent from './FloorTextureCatalogContent';
import DoorCatalogContent from './DoorCatalogContent';

const LEFT_RAIL = [
  { id: 'Search', label: 'Search', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> },
  { id: 'Interior', label: 'Interior', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"></path><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"></path><path d="M5 18v2"></path><path d="M19 18v2"></path></svg> },
  { id: 'Floors', label: 'Floors', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path></svg> },
  { id: 'Doors', label: 'Doors', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16"></path><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"></path><path d="M14 12v.01"></path></svg> },
];

function LeftSidebar({
  onSelectFurniture,
  rooms,
  setRooms,
  selectedRoomIndex,
  doorPlacementMode,
  setDoorPlacementMode,
  doors,
  setDoors,
  pendingDoorType,
  setPendingDoorType,
  pendingDoorWidth,
  setPendingDoorWidth
}) {
  const [activeTab, setActiveTab] = useState(null);

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) {
      setActiveTab(null);
      setDoorPlacementMode(false);
    } else {
      setActiveTab(tabId);
      if (tabId === 'Doors') {
        setDoorPlacementMode(!doorPlacementMode);
      } else {
        setDoorPlacementMode(false);
      }
    }
  };

  return (
    <div className="catalog-shell">
      <div className="catalog-rail">
        {LEFT_RAIL.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`catalog-rail-button${activeTab === item.id ? ' active' : ''}${item.id === 'Doors' && doorPlacementMode ? ' door-active' : ''}`}
            title={item.label}
            onClick={() => handleTabClick(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {activeTab === 'Search' && (
        <div className="catalog-panel">
          <div className="catalog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="catalog-title" style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em', margin: 0 }}>Global Search</div>
              <div className="catalog-subtitle" style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Search across all catalogs</div>
            </div>
            <button onClick={() => setActiveTab(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="catalog-search" style={{ marginTop: '16px' }}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Search furniture, floors, doors..." />
          </div>
          <div style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
            Search functionality coming soon. Use the search bar in the Furniture tab for now.
          </div>
        </div>
      )}

      {activeTab === 'Interior' && (
        <FurnitureCatalogContent 
          onSelectFurniture={onSelectFurniture} 
          onClose={() => setActiveTab(null)} 
        />
      )}
      
      {activeTab === 'Floors' && (
        <FloorTextureCatalogContent 
          rooms={rooms}
          setRooms={setRooms}
          selectedRoomIndex={selectedRoomIndex}
          onClose={() => setActiveTab(null)}
        />
      )}

      {activeTab === 'Doors' && (
        <DoorCatalogContent
          doors={doors}
          setDoors={setDoors}
          doorPlacementMode={doorPlacementMode}
          setDoorPlacementMode={setDoorPlacementMode}
          pendingDoorType={pendingDoorType}
          setPendingDoorType={setPendingDoorType}
          pendingDoorWidth={pendingDoorWidth}
          setPendingDoorWidth={setPendingDoorWidth}
          rooms={rooms}
          onClose={() => {
            setActiveTab(null);
            setDoorPlacementMode(false);
          }}
        />
      )}
    </div>
  );
}

export default LeftSidebar;
