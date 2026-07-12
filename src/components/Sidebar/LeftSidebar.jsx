import { useState } from 'react';
import FurnitureCatalogContent from './FurnitureCatalogContent';
import FloorTextureCatalogContent from './FloorTextureCatalogContent';

const LEFT_RAIL = [
  { id: 'Interior', label: 'Interior', icon: '🛋' },
  { id: 'Floors', label: 'Floors', icon: '▦' },
];

function LeftSidebar({ onSelectFurniture, rooms, setRooms, selectedRoomIndex }) {
  const [activeTab, setActiveTab] = useState('Interior');

  return (
    <div className="catalog-shell">
      <div className="catalog-rail">
        {LEFT_RAIL.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`catalog-rail-button${activeTab === item.id ? ' active' : ''}`}
            title={item.label}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {activeTab === 'Interior' && (
        <FurnitureCatalogContent onSelectFurniture={onSelectFurniture} />
      )}
      
      {activeTab === 'Floors' && (
        <FloorTextureCatalogContent 
          rooms={rooms}
          setRooms={setRooms}
          selectedRoomIndex={selectedRoomIndex}
        />
      )}
    </div>
  );
}

export default LeftSidebar;
