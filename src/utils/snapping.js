/**
 * snapping.js
 * Snap utilities for furniture placement on the floor plan canvas.
 */

/**
 * Rounds a position to the nearest grid cell boundary.
 * Mirrors the inline logic in RoomCanvas.jsx.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} gridSize - pixels per grid cell
 * @returns {{ x: number, y: number }}
 */
export function snapToGrid(x, y, gridSize) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

/**
 * Attempts to snap furniture to the nearest wall edge.
 * Only snaps to axis-aligned walls (horizontal / vertical).
 * Diagonal walls are skipped — grid-snap is used as fallback.
 *
 * @param {number} x            - furniture top-left x (raw / grid-snapped)
 * @param {number} y            - furniture top-left y (raw / grid-snapped)
 * @param {number} w            - furniture width in pixels
 * @param {number} h            - furniture height in pixels
 * @param {Array}  rooms        - array of { points: [{x,y},...] }
 * @param {number} threshold    - snap distance in pixels (default 15)
 * @returns {{ x: number, y: number, snapped: boolean }}
 */
export function snapToWall(x, y, w, h, rooms, threshold = 15) {
  // Furniture edges
  const left   = x;
  const right  = x + w;
  const top    = y;
  const bottom = y + h;

  // Furniture center — used to check overlap with wall extent
  const cx = x + w / 2;
  const cy = y + h / 2;

  let bestDist = threshold + 1; // anything above threshold is ignored
  let snappedX = x;
  let snappedY = y;
  let didSnap  = false;

  for (const room of rooms) {
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      const isHorizontal = Math.abs(dy) < 2 && Math.abs(dx) > 2;
      const isVertical   = Math.abs(dx) < 2 && Math.abs(dy) > 2;

      // Skip diagonal walls — grid-snap handles those
      if (!isHorizontal && !isVertical) continue;

      const wallY = p1.y; // relevant for horizontal walls
      const wallX = p1.x; // relevant for vertical walls

      if (isHorizontal) {
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);

        // Snap furniture TOP edge flush against this horizontal wall
        const distTop = Math.abs(top - wallY);
        if (distTop < threshold && distTop < bestDist && cx >= minX && cx <= maxX) {
          bestDist = distTop;
          snappedX = x;
          snappedY = wallY;       // top edge touches wall
          didSnap  = true;
        }

        // Snap furniture BOTTOM edge flush against this horizontal wall
        const distBottom = Math.abs(bottom - wallY);
        if (distBottom < threshold && distBottom < bestDist && cx >= minX && cx <= maxX) {
          bestDist = distBottom;
          snappedX = x;
          snappedY = wallY - h;   // bottom edge touches wall
          didSnap  = true;
        }
      }

      if (isVertical) {
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        // Snap furniture LEFT edge flush against this vertical wall
        const distLeft = Math.abs(left - wallX);
        if (distLeft < threshold && distLeft < bestDist && cy >= minY && cy <= maxY) {
          bestDist = distLeft;
          snappedX = wallX;       // left edge touches wall
          snappedY = y;
          didSnap  = true;
        }

        // Snap furniture RIGHT edge flush against this vertical wall
        const distRight = Math.abs(right - wallX);
        if (distRight < threshold && distRight < bestDist && cy >= minY && cy <= maxY) {
          bestDist = distRight;
          snappedX = wallX - w;   // right edge touches wall
          snappedY = y;
          didSnap  = true;
        }
      }
    }
  }

  return { x: snappedX, y: snappedY, snapped: didSnap };
}
