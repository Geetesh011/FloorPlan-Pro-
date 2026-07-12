import React from 'react';

const DOOR_TYPES = [
  { id: 'single-left', label: 'Single Left' },
  { id: 'single-right', label: 'Single Right' },
  { id: 'double', label: 'Double Door' },
  { id: 'sliding', label: 'Sliding Door' },
];

const WIDTH_PRESETS = [
  { value: 2.5, label: '2.5 ft' },
  { value: 3, label: '3 ft' },
  { value: 4, label: '4 ft' },
  { value: 6, label: '6 ft' },
];

const DoorThumbnail = ({ type, isSmall = false }) => {
  let content;
  if (type === 'single-left') {
    content = (
      <>
        <line x1="10" y1="35" x2="10" y2="10" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 10 35 A 25 25 0 0 1 35 10" fill="none" stroke="#8B5E3C" strokeWidth="1.5" />
        <circle cx="10" cy="35" r="2.5" fill="#8B5E3C" />
      </>
    );
  } else if (type === 'single-right') {
    content = (
      <>
        <line x1="40" y1="35" x2="40" y2="10" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 40 35 A 25 25 0 0 0 15 10" fill="none" stroke="#8B5E3C" strokeWidth="1.5" />
        <circle cx="40" cy="35" r="2.5" fill="#8B5E3C" />
      </>
    );
  } else if (type === 'double') {
    content = (
      <>
        <line x1="5" y1="35" x2="5" y2="17.5" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 5 35 A 17.5 17.5 0 0 1 22.5 17.5" fill="none" stroke="#8B5E3C" strokeWidth="1.5" />
        <circle cx="5" cy="35" r="2.5" fill="#8B5E3C" />

        <line x1="45" y1="35" x2="45" y2="17.5" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 45 35 A 17.5 17.5 0 0 0 27.5 17.5" fill="none" stroke="#8B5E3C" strokeWidth="1.5" />
        <circle cx="45" cy="35" r="2.5" fill="#8B5E3C" />
      </>
    );
  } else if (type === 'sliding') {
    content = (
      <>
        <line x1="12" y1="20" x2="28" y2="20" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" />
        <line x1="22" y1="25" x2="38" y2="25" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  const containerStyle = {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const svgSize = isSmall ? "36" : "60";

  return (
    <div style={containerStyle}>
      <svg width={svgSize} height={svgSize} viewBox="0 0 50 50">
        {content}
      </svg>
    </div>
  );
};

function DoorCatalogContent({
  doors,
  setDoors,
  doorPlacementMode,
  setDoorPlacementMode,
  pendingDoorType,
  setPendingDoorType,
  pendingDoorWidth,
  setPendingDoorWidth,
  rooms,
  onClose
}) {

  const handleTypeSelect = (typeId) => {
    setPendingDoorType(typeId);
    setDoorPlacementMode(true);
  };

  const handleRemoveDoor = (doorId) => {
    setDoors(doors.filter(d => d.id !== doorId));
  };

  return (
    <div className="catalog-panel">
      <div className="catalog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div className="catalog-title" style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.01em', margin: 0, color: '#f8fafc' }}>Doors & Windows</div>
          <div className="catalog-subtitle" style={{ fontWeight: '400', color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Select a type to place on a wall</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="door-section-title">Door Type</div>
      <div className="catalog-grid" style={{ overflowY: 'visible', paddingBottom: '0' }}>
        {DOOR_TYPES.map(dt => {
          const isSelected = pendingDoorType === dt.id && doorPlacementMode;
          return (
            <div
              key={dt.id}
              className={`catalog-card ${isSelected ? 'active' : ''}`}
              onClick={() => handleTypeSelect(dt.id)}
            >
              <div className="catalog-thumb">
                <DoorThumbnail type={dt.id} />
              </div>
              <div className="catalog-item-name" style={{ fontWeight: '500', fontSize: '1rem' }}>{dt.label}</div>
            </div>
          );
        })}
      </div>

      {doors.length > 0 && (
        <>
          <div className="door-section-title" style={{ marginTop: '24px' }}>Placed Doors</div>
          <div className="placed-doors-list">
            {doors.map(door => {
              const typeInfo = DOOR_TYPES.find(t => t.id === door.type) || DOOR_TYPES[0];
              const roomName = rooms[door.roomIndex]?.label || `Room ${door.roomIndex + 1}`;
              return (
                <div key={door.id} className="placed-door-card">
                  <div className="placed-door-thumb-small">
                    <DoorThumbnail type={door.type} isSmall={true} />
                  </div>
                  <div className="placed-door-details">
                    <div className="placed-door-name">{typeInfo.label} • {door.width} ft</div>
                    <div className="placed-door-room">{roomName}</div>
                  </div>
                  <button
                    className="placed-door-remove"
                    onClick={() => handleRemoveDoor(door.id)}
                    title="Remove Door"
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default DoorCatalogContent;
