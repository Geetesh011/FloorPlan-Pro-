import { useState } from 'react';
import FurnitureCatalogContent from './FurnitureCatalogContent';
import FloorTextureCatalogContent from './FloorTextureCatalogContent';
import DoorCatalogContent from './DoorCatalogContent';

const LEFT_RAIL = [
  { id: 'Interior', label: 'Interior', icon: '🛋' },
  { id: 'Floors', label: 'Floors', icon: '▦' },
  { id: 'Doors', label: 'Doors', icon: '🚪' },
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
  const [activeTab, setActiveTab] = useState('Interior');

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'Doors') {
      setDoorPlacementMode(!doorPlacementMode);
    } else {
      setDoorPlacementMode(false);
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
        />
      )}
    </div>
  );
}

export default LeftSidebar;
