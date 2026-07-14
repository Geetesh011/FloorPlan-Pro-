export function findOverlappingRooms(rooms) {
  // Basic bounding box collision between rooms
  const getBBox = (points) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    return { minX, minY, maxX, maxY };
  };

  const overlaps = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const b1 = getBBox(rooms[i].points);
      const b2 = getBBox(rooms[j].points);
      if (
        b1.minX < b2.maxX && b1.maxX > b2.minX &&
        b1.minY < b2.maxY && b1.maxY > b2.minY
      ) {
        overlaps.push([i, j]);
      }
    }
  }
  return overlaps;
}

export function findFurnitureOutOfBounds(rooms, placedFurniture) {
  // Ray casting point in polygon
  const isInside = (point, vs) => {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].x, yi = vs[i].y;
      let xj = vs[j].x, yj = vs[j].y;
      let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const outOfBounds = [];
  placedFurniture.forEach(f => {
    // Check center point of furniture
    const center = { x: f.x + f.width / 2, y: f.y + f.height / 2 };
    const inAnyRoom = rooms.some(r => isInside(center, r.points));
    if (!inAnyRoom) {
      outOfBounds.push(f);
    }
  });
  return outOfBounds;
}

export function validateForExport(rooms) {
  if (!rooms || rooms.length === 0) {
    return { valid: false, error: 'Cannot export: The floor plan has no rooms.' };
  }
  return { valid: true };
}
