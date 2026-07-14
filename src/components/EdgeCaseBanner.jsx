import React from 'react';

export default function EdgeCaseBanner({ overlappingRooms, furnitureOutOfBounds }) {
  const issues = [];
  
  if (overlappingRooms && overlappingRooms.length > 0) {
    issues.push(`There are ${overlappingRooms.length} overlapping rooms.`);
  }
  
  if (furnitureOutOfBounds && furnitureOutOfBounds.length > 0) {
    issues.push(`${furnitureOutOfBounds.length} furniture items are placed outside of any room.`);
  }

  if (issues.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fef2f2',
      border: '1px solid #ef4444',
      color: '#b91c1c',
      padding: '8px 16px',
      borderRadius: '6px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontWeight: 600, fontSize: '14px' }}>⚠️ Layout Warning</div>
      <div style={{ fontSize: '13px', textAlign: 'center' }}>
        {issues.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>
    </div>
  );
}
