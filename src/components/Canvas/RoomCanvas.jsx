import React, { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle } from 'react';
import { snapToGrid, snapToWall } from '../../utils/snapping';
import { Stage, Layer, Line, Text, Circle, Rect, Group, Image as KonvaImage, Transformer, Arrow, Shape, Arc } from 'react-konva';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';
import { FLOOR_TEXTURES } from '../../data/floorTextures';
import html2canvas from 'html2canvas';

const GRID_SIZE = 20;
const PIXELS_PER_FOOT = 20;
const STAGE_WIDTH = 900;
const STAGE_HEIGHT = 600;

// Loads a furniture SVG and renders it at EXACTLY the given pixel dimensions.
//
// Root cause of tiny icons: SVGs only have viewBox (no width/height on the <svg> tag).
// Browsers treat dimensionless SVGs as 0×0 intrinsic size, so Konva KonvaImage ignores
// the width/height props even though they are set.
//
// Fix: fetch the SVG text, inject width/height attributes into the <svg> root, create a
// Blob URL from the patched text, then load that URL as an Image. The browser rasterises
// the SVG to our exact target pixel dimensions.
function FurnitureIconImage({ url, width, height }) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let blobUrl = null;

    (async () => {
      try {
        const res  = await fetch(url);
        let svg    = await res.text();

        // Patch the opening <svg …> tag: remove old width/height/preserveAspectRatio, add ours.
        // We use "xMidYMid meet" (the SVG default) so the icon art keeps its natural aspect ratio
        // and letterboxes inside the item's physical bounding box instead of stretching to fill it.
        svg = svg.replace(/<svg([^>]*)>/, (_, attrs) => {
          const cleaned = attrs.replace(/\s*(width|height|preserveAspectRatio)\s*=\s*"[^"]*"/gi, '');
          return `<svg${cleaned} width="${Math.round(width)}" height="${Math.round(height)}" preserveAspectRatio="xMidYMid meet">`;
        });

        blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

        const img = new window.Image();
        img.onload  = () => { if (!cancelled) setImage(img); };
        img.onerror = () => { if (!cancelled) setImage(null); };
        img.src = blobUrl;
      } catch {
        // Fetch failed — try loading the original URL directly as a fallback
        if (!cancelled) {
          const img = new window.Image();
          img.onload  = () => { if (!cancelled) setImage(img); };
          img.onerror = () => { if (!cancelled) setImage(null); };
          img.src = url;
        }
      }
    })();

    return () => {
      cancelled = true;
      // Revoke only after a short delay so the Image element has finished using the URL
      setTimeout(() => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, 1000);
    };
  }, [url, width, height]);

  if (!image) {
    // Soft placeholder while image loads (first render or if fetch is slow)
    return <Rect width={width} height={height} fill="#e8e0f0" cornerRadius={4} opacity={0.5} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />;
  }
  return <KonvaImage image={image} x={0} y={0} width={width} height={height} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />;
}

// ── Memoized Furniture Item ───────────────────────────────────────────────
const MemoizedFurnitureItem = React.memo(({
  item,
  catalogItem,
  isSelected,
  setRef,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onClick,
  renderShape
}) => {
  return (
    <Group
      x={item.x} y={item.y} rotation={item.rotation ?? 0}
      ref={setRef}
      draggable
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onClick={onClick}
    >
      {catalogItem?.thumbnail
        ? <FurnitureIconImage url={catalogItem.thumbnail} width={item.width} height={item.height} />
        : renderShape(item)}
      {isSelected && (
        <Rect width={item.width} height={item.height}
          stroke="#6b5b95" strokeWidth={2} dash={[4,4]} fill="rgba(107,91,149,0.06)"
          perfectDrawEnabled={false} shadowForStrokeEnabled={false}
        />
      )}
    </Group>
  );
});


const GRID_RANGE = 3000;
const GridShape = () => (
  <Shape
    sceneFunc={(ctx, shape) => {
      ctx.beginPath();
      for (let x = -GRID_RANGE; x <= GRID_RANGE; x += GRID_SIZE) {
        ctx.moveTo(x, -GRID_RANGE);
        ctx.lineTo(x, GRID_RANGE);
      }
      for (let y = -GRID_RANGE; y <= GRID_RANGE; y += GRID_SIZE) {
        ctx.moveTo(-GRID_RANGE, y);
        ctx.lineTo(GRID_RANGE, y);
      }
      // Konva's strokeShape automatically applies the stroke/strokeWidth props below
      ctx.fillStrokeShape(shape);
    }}
    stroke="#e2e6ec"
    strokeWidth={0.5}
    listening={false}
    perfectDrawEnabled={false}
    shadowForStrokeEnabled={false}
  />
);

function RoomCanvas({ exportRef, pendingFurniture, onFurniturePlaced, placedFurniture = [], setPlacedFurniture, rooms = [], setRooms, selectedRoomIndex, setSelectedRoomIndex, onSaveClick, onSaveAsClick, onLoadClick, doors = [], setDoors, doorPlacementMode, setDoorPlacementMode, pendingDoorType, pendingDoorWidth, readOnly = false, history, currentPoints = [], setCurrentPoints, onError }) {
  // Canvas container ref — used by ResizeObserver for dynamic Stage sizing
  const containerRef = useRef(null);
  const stageRef = useRef(null);           // ref to Konva Stage for zoom controls
  const lastDist = useRef(0);
  const lastCenter = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });
  // Refs for the Konva Transformer and each placed furniture Group node.
  const transformerRef = useRef(null);
  const furnitureGroupRefs = useRef({});
  // rooms / setRooms lifted to App.jsx so App can save/load them
  const [mousePos, setMousePos] = useState(null);
  // true when the cursor is close enough to the first point to auto-close
  const [nearFirstPoint, setNearFirstPoint] = useState(false);
  const CLOSE_THRESHOLD = 20; // px — snap-to-start radius
  const [pendingRoom, setPendingRoom] = useState(null);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDoorId, setSelectedDoorId] = useState(null);
  const [hoveredWall, setHoveredWall] = useState(null); // { roomIndex, wallIndex, point }

  // Expose capture functionality to parent via exportRef
  useImperativeHandle(exportRef, () => ({
    async captureFullView() {
      const stage = stageRef.current;
      if (!stage) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      rooms.forEach(room => {
        room.points.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
      });
      
      placedFurniture.forEach(f => {
        if (f.x < minX) minX = f.x;
        if (f.x + f.width > maxX) maxX = f.x + f.width;
        if (f.y < minY) minY = f.y;
        if (f.y + f.height > maxY) maxY = f.y + f.height;
      });
      
      if (minX === Infinity) {
        minX = 0; minY = 0; maxX = stageSize.width; maxY = stageSize.height;
      }
      
      const padding = 120; // Increased padding to ensure dimension lines outside rooms are fully captured
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;
      
      const width = maxX - minX;
      const height = maxY - minY;
      
      const scaleX = stageSize.width / width;
      const scaleY = stageSize.height / height;
      const scale = Math.min(scaleX, scaleY);
      
      const oldScale = stage.scale();
      const oldPos = stage.position();
      const oldSelection = selectedRoomIndex;
      
      // Clear selection so borders don't appear in export
      setSelectedRoomIndex(null);
      
      stage.scale({ x: scale, y: scale });
      stage.position({
        x: -minX * scale + (stageSize.width - width * scale) / 2,
        y: -minY * scale + (stageSize.height - height * scale) / 2
      });
      
      stage.batchDraw();
      await new Promise(r => setTimeout(r, 100)); // wait for render
      
      const stageElement = document.querySelector('.canvas-stage');
      const canvas = await html2canvas(stageElement, {
        useCORS: true,
        scale: 0.5, // Reduce scale for much smaller thumbnail
        backgroundColor: '#f8fafc',
      });
      
      stage.scale(oldScale);
      stage.position(oldPos);
      setSelectedRoomIndex(oldSelection);
      stage.batchDraw();
      
      // Use JPEG with 0.5 quality to ensure the base64 string is well under Firestore's 1MB limit
      return canvas.toDataURL('image/jpeg', 0.5);
    }
  }));

  const [loadedTextures, setLoadedTextures] = useState({});
  useEffect(() => {
    FLOOR_TEXTURES.forEach((tex) => {
      const img = new window.Image();
      img.onload = () => {
        setLoadedTextures((prev) => ({ ...prev, [tex.id]: img }));
      };
      img.src = tex.thumbnail;
    });
  }, []);

  // Internal undo has been replaced by EditorView's useHistory hook

  // ── Point-in-polygon (ray casting) ──────────────────────────────────────────
  // Returns true if (px, py) is strictly inside the polygon defined by `points`.
  const pointInPolygon = (px, py, points) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  /** Returns true if (x, y) falls inside ANY already-confirmed room. */
  const isInsideAnyRoom = (x, y) =>
    rooms.some((r) => pointInPolygon(x, y, r.points));
  // ────────────────────────────────────────────────────────────────────────────

  // Wall-snap first (within 15 px of any axis-aligned wall), grid-snap as fallback.
  // Defined inside the component so it closes over the `rooms` state automatically.
  const applySnap = (rawX, rawY, w, h) => {
    const wall = snapToWall(rawX, rawY, w, h, rooms);
    if (wall.snapped) return { x: wall.x, y: wall.y };
    return snapToGrid(rawX, rawY, GRID_SIZE);
  };

  // ── Dynamic canvas sizing via ResizeObserver ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0)
        setStageSize({ width: Math.floor(width), height: Math.floor(height - 48) }); // 48px top bar
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────

  const rectsOverlap = (a, b) => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  };

  // Returns the axis-aligned bounding box (AABB) of a furniture item,
  // accounting for rotation so collision checks remain accurate after rotating.
  const getAABB = (f) => {
    if (!f.rotation) return { x: f.x, y: f.y, width: f.width, height: f.height };
    const rad = (f.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const aabbW = f.width * cos + f.height * sin;
    const aabbH = f.width * sin + f.height * cos;
    // Konva rotates around the node origin (top-left corner), so the visual
    // centre shifts; compute it from the rotated corner.
    const cx = f.x + (f.width * Math.cos(rad) - f.height * Math.sin(rad)) / 2
               + (f.width * Math.sin(rad) + f.height * Math.cos(rad)) / 2
               - aabbW / 2 + f.x;
    // Simpler: use raw centre approximation (accurate enough for grid-scale items)
    const cxSimple = f.x + f.width / 2;
    const cySimple = f.y + f.height / 2;
    return {
      x: cxSimple - aabbW / 2,
      y: cySimple - aabbH / 2,
      width: aabbW,
      height: aabbH,
    };
  };

  const hasCollision = (movingId, x, y, width, height, allFurniture, rotation = 0) => {
    const proposedItem = { x, y, width, height, rotation };
    const proposedRect = getAABB(proposedItem);
    return allFurniture.some((f) => {
      if (f.id === movingId) return false;
      return rectsOverlap(proposedRect, getAABB(f));
    });
  };

  const handleTouchMove = (e) => {
    // If not doing multi-touch, just handle drawing logic
    if (e.evt.touches.length < 2) {
      handleMouseMove(e);
      return;
    }
    e.evt.preventDefault();
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (stageRef.current && stageRef.current.isDragging()) {
      stageRef.current.stopDrag();
    }
    const p1 = { x: touch1.clientX, y: touch1.clientY };
    const p2 = { x: touch2.clientX, y: touch2.clientY };
    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    if (!lastDist.current) {
      lastDist.current = dist;
      lastCenter.current = center;
      return;
    }
    
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const scaleBy = dist / lastDist.current;
    const newScale = Math.max(0.1, Math.min(oldScale * scaleBy, 10));
    
    const mousePointTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };
    
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: center.x - mousePointTo.x * newScale,
      y: center.y - mousePointTo.y * newScale,
    });
    stage.batchDraw();
    
    lastDist.current = dist;
    lastCenter.current = center;
  };

  const handleTouchEnd = () => {
    lastDist.current = 0;
    lastCenter.current = null;
  };

  // ── Wheel zoom — centered on cursor, 0.3× – 4× range ────────────────────
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition(); // screen-space pointer

    const SCALE_FACTOR = 1.06;  // gentler zoom — 6% per scroll tick
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = direction > 0
      ? Math.min(oldScale * SCALE_FACTOR, 4)
      : Math.max(oldScale / SCALE_FACTOR, 0.3);

    // Keep the world-point under the cursor fixed during zoom
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position(newPos);
    stage.batchDraw();
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── Door placement: project a point onto a wall segment ──────────────────
  const projectPointOnSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) return { t: 0, dist: Math.hypot(px - ax, py - ay), x: ax, y: ay };
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx, projY = ay + t * dy;
    const dist = Math.hypot(px - projX, py - projY);
    return { t, dist, x: projX, y: projY };
  };

  // ── Find nearest wall to a world point (for door placement hover) ────────
  const findNearestWall = (worldX, worldY, maxDist = 20) => {
    let best = null;
    rooms.forEach((room, ri) => {
      for (let wi = 0; wi < room.points.length; wi++) {
        const p1 = room.points[wi];
        const p2 = room.points[(wi + 1) % room.points.length];
        const proj = projectPointOnSegment(worldX, worldY, p1.x, p1.y, p2.x, p2.y);
        if (proj.dist < maxDist && (!best || proj.dist < best.dist)) {
          best = { roomIndex: ri, wallIndex: wi, t: proj.t, dist: proj.dist, x: proj.x, y: proj.y };
        }
      }
    });
    return best;
  };

  const handleStageClick = (e) => {
    // Ignore clicks that were actually a pan drag
    if (e.target.getStage().isDragging()) return;

    // If clicking on empty stage (e.target === Stage), clear selections
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      setSelectedDoorId(null);
      if (setSelectedRoomIndex) setSelectedRoomIndex(null);
    }

    // ── Door placement mode ─────────────────────────────────────────────
    if (doorPlacementMode && !pendingFurniture) {
      if (!pendingDoorType) {
        // User clicked but hasn't selected a door type yet
        if (onError) onError('Please select a Door Type from the catalog first.', false);
        return;
      }
      const pos = e.target.getStage().getRelativePointerPosition();
      if (!pos) return;
      const nearest = findNearestWall(pos.x, pos.y, 25);
      if (!nearest) return; // no wall nearby

      const room = rooms[nearest.roomIndex];
      const p1 = room.points[nearest.wallIndex];
      const p2 = room.points[(nearest.wallIndex + 1) % room.points.length];
      const wallLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const doorWidthFt = pendingDoorWidth || 3;
      const doorWidthPx = doorWidthFt * PIXELS_PER_FOOT;
      const halfT = doorWidthPx / (2 * wallLen);

      // Clamp so the door doesn't hang off the wall ends
      let posAlongWall = nearest.t;
      posAlongWall = Math.max(halfT, Math.min(1 - halfT, posAlongWall));

      // Check this wall has room for the door (wall must be longer than door)
      if (wallLen < doorWidthPx) return;

      const newDoor = {
        id: `door-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        roomIndex: nearest.roomIndex,
        wallIndex: nearest.wallIndex,
        positionAlongWall: posAlongWall,
        width: doorWidthFt,
        type: pendingDoorType,
      };


      setDoors(prev => [...prev, newDoor]);
      setDoorPlacementMode(false); // exit after placing one
      setHoveredWall(null);
      return;
    }

    if (pendingFurniture) {
      // getRelativePointerPosition returns WORLD coords (undoes pan + zoom)
      const pos = e.target.getStage().getRelativePointerPosition();
      const width = pendingFurniture.width * PIXELS_PER_FOOT;
      const height = pendingFurniture.height * PIXELS_PER_FOOT;
      const { x: snappedX, y: snappedY } = applySnap(pos.x, pos.y, width, height);

      if (hasCollision(null, snappedX, snappedY, width, height, placedFurniture)) {
        if (onError) onError('Cannot place furniture here - it overlaps another item.', false);
        return;
      }

      const newItem = {
        id: `${pendingFurniture.id}-${Date.now()}`,
        catalogId: pendingFurniture.id,
        name: pendingFurniture.name,
        x: snappedX,
        y: snappedY,
        width,
        height,
        color: pendingFurniture.color,
        price: pendingFurniture.price,
        rotation: 0,
      };

      setPlacedFurniture([...placedFurniture, newItem]);
      onFurniturePlaced();
      return;
    }

    if (pendingRoom) return;
    if (doorPlacementMode) return; // block room drawing while in door mode
    if (e.evt.detail > 1) return; // ignore the second click of a double-click

    // getRelativePointerPosition → world coords (corrected for pan + zoom)
    const pos = e.target.getStage().getRelativePointerPosition();
    const snappedX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;

    // ── Auto-close: click near first point when ≥ 3 points exist ────────────
    if (currentPoints.length >= 3) {
      const first = currentPoints[0];
      const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
      if (dist <= CLOSE_THRESHOLD) {
        finishRoom();
        return;
      }
    }

    if (isInsideAnyRoom(snappedX, snappedY)) return;

    const lastPoint = currentPoints[currentPoints.length - 1];
    if (lastPoint && lastPoint.x === snappedX && lastPoint.y === snappedY) return;


    setCurrentPoints([...currentPoints, { x: snappedX, y: snappedY }]);
    setSelectedId(null);
  };

  const handleMouseMove = (e) => {
    if (pendingRoom) return;
    // World coords — correct even when panned/zoomed
    const pos = e.target.getStage().getRelativePointerPosition();
    if (!pos) return;
    const snappedX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
    setMousePos({ x: snappedX, y: snappedY });

    // ── Door placement: track hovered wall ──────────────────────────────
    if (doorPlacementMode) {
      const nearest = findNearestWall(pos.x, pos.y, 25);
      setHoveredWall(nearest); // null if nothing nearby
    } else if (hoveredWall) {
      setHoveredWall(null);
    }

    if (currentPoints.length >= 3) {
      const first = currentPoints[0];
      const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
      setNearFirstPoint(dist <= CLOSE_THRESHOLD);
    } else {
      setNearFirstPoint(false);
    }
  };

  const finishRoom = () => {
    if (currentPoints.length < 3) {
      if (onError) onError('Add at least 3 points to form a room.', false);
      return;
    }
    setPendingRoom({ points: currentPoints });
    setRoomNameInput(`Room ${rooms.length + 1}`);
    setCurrentPoints([]);
    setMousePos(null);
  };

  // Double-click is kept as an alternative way to close the room
  const handleDoubleClick = () => {
    if (pendingFurniture) return;
    if (doorPlacementMode) return; // block room closing in door mode
    if (currentPoints.length >= 3) finishRoom();
  };

  const confirmRoomName = () => {
    const label = roomNameInput.trim() || `Room ${rooms.length + 1}`;
    setRooms([...rooms, { points: pendingRoom.points, label }]);
    setPendingRoom(null);
    setRoomNameInput('');
  };

  const clearAll = () => {
    setRooms([]);
    setCurrentPoints([]);
    setPendingRoom(null);
    setMousePos(null);
    setPlacedFurniture([]);
    setSelectedId(null);
    if (setDoors) setDoors([]);
  };

  const handleFurnitureDragMove = (id, e) => {
    const node = e.target;
    const movingItem = placedFurniture.find(f => f.id === id);
    if (!movingItem) return;

    // Live snap
    const { x: snappedX, y: snappedY } = applySnap(
      node.x(), node.y(), movingItem.width, movingItem.height
    );
    node.position({ x: snappedX, y: snappedY });

    // Live collision check
    const collides = hasCollision(
      id, snappedX, snappedY, movingItem.width, movingItem.height,
      placedFurniture, movingItem.rotation ?? 0
    );

    // Zero-lag visual feedback using Konva node APIs
    if (collides) {
      node.opacity(0.6);
      node.setAttr('wasColliding', true);
    } else {
      if (node.getAttr('wasColliding')) {
        node.opacity(1);
        node.setAttr('wasColliding', false);
      }
    }
  };

  const handleFurnitureDragEnd = (id, e) => {
    const node = e.target;
    const movingItem = placedFurniture.find((f) => f.id === id);
    if (!movingItem) return;

    // Reset visual feedback
    node.opacity(1);
    node.setAttr('wasColliding', false);

    // Wall-snap first, grid-snap fallback
    const { x: snappedX, y: snappedY } = applySnap(
      node.x(), node.y(), movingItem.width, movingItem.height
    );

    const collides = hasCollision(
      id, snappedX, snappedY, movingItem.width, movingItem.height,
      placedFurniture, movingItem.rotation ?? 0
    );

    if (collides) {
      // Revert to original position if dropped while colliding
      node.position({ x: movingItem.x, y: movingItem.y });
      node.getLayer()?.batchDraw();
      return;
    }


    setPlacedFurniture(placedFurniture.map(f =>
      f.id === id ? { ...f, x: snappedX, y: snappedY } : f
    ));
  };

  // Called when the Transformer finishes a rotation or scale gesture.
  // Resets scale to 1, computes new dimensions, and checks collisions.
  const handleFurnitureTransformEnd = (id, e) => {
    const node = e.target;
    const newRotation = node.rotation();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const movingItem = placedFurniture.find((f) => f.id === id);
    if (!movingItem) return;

    // Fetch baseline catalog dimensions
    const catalogItem = FURNITURE_CATALOG.find((c) => c.id === movingItem.catalogId);
    const baseWidth = catalogItem ? catalogItem.width * PIXELS_PER_FOOT : movingItem.width;
    const baseHeight = catalogItem ? catalogItem.height * PIXELS_PER_FOOT : movingItem.height;

    // Calculate requested new dimensions based on scale
    let newWidth = movingItem.width * scaleX;
    let newHeight = movingItem.height * scaleY;

    // Clamp dimensions to 50% - 200% of the baseline catalog size
    newWidth = Math.max(baseWidth * 0.5, Math.min(baseWidth * 2.0, newWidth));
    newHeight = Math.max(baseHeight * 0.5, Math.min(baseHeight * 2.0, newHeight));

    // Guard against Transformer accidentally scaling the node, we manage size via width/height
    node.scaleX(1);
    node.scaleY(1);

    const collides = hasCollision(
      id, movingItem.x, movingItem.y, newWidth, newHeight,
      placedFurniture, newRotation
    );

    if (collides) {
      // Revert to original properties if collision happens
      node.rotation(movingItem.rotation ?? 0);
      node.width(movingItem.width);
      node.height(movingItem.height);
      node.getLayer()?.batchDraw();
      return;
    }


    setPlacedFurniture(prev =>
      prev.map(f => f.id === id ? { ...f, rotation: newRotation, width: newWidth, height: newHeight } : f)
    );
  };

  const handleDeleteSelected = () => {
    if (selectedDoorId) {

      setDoors(prev => prev.filter(d => d.id !== selectedDoorId));
      setSelectedDoorId(null);
      return;
    }
    if (!selectedId) return;

    setPlacedFurniture(placedFurniture.filter(f => f.id !== selectedId));
    setSelectedId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'Escape' && doorPlacementMode) {
        setDoorPlacementMode(false);
        setHoveredWall(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedDoorId, placedFurniture, rooms, currentPoints, doors, doorPlacementMode]);

  // Attach / detach the Transformer whenever the selected furniture item changes.
  useEffect(() => {
    if (!transformerRef.current) return;
    const isStillPlaced = placedFurniture.some(f => f.id === selectedId);
    if (selectedId && isStillPlaced && furnitureGroupRefs.current[selectedId]) {
      transformerRef.current.nodes([furnitureGroupRefs.current[selectedId]]);
    } else {
      transformerRef.current.nodes([]);
      if (selectedId && !isStillPlaced) {
        setSelectedId(null);
      }
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedId, placedFurniture]);

  // Confirm room name helper
  const confirmRoomNameWithHistory = () => {
    confirmRoomName();
  };

  // ── Collect door gaps for a specific wall of a specific room ───────────
  const getDoorsOnWall = (roomIndex, wallIndex) => {
    return doors.filter(d => d.roomIndex === roomIndex && d.wallIndex === wallIndex);
  };

  const buildWallsAndLabels = (points, keyPrefix, roomIndex) => {
    const walls = [];
    const labels = [];
    if (points.length < 2) return { walls, labels };

    // Room centroid — determines which perpendicular direction is outward
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    const ARROW_OFFSET = 26;   // px from wall line to the arrow line
    const CAP_HALF    = 5;     // px half-length of perpendicular end-cap ticks
    const ARROW_PX    = 5;     // arrowhead pointer size
    const LINE_COLOR  = '#64748b';
    const TEXT_COLOR  = '#1e293b';
    const WALL_COLOR  = '#1e293b';
    const WALL_WIDTH  = 10;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      // ── Wall geometry ────────────────────────────────────────────────────
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 2) continue;

      const ux = dx / len;   // unit vector along wall
      const uy = dy / len;
      const nx = -uy;        // left-hand perpendicular
      const ny =  ux;

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      // Outward: perpendicular pointing AWAY from room centroid
      const dot  = (cx - midX) * nx + (cy - midY) * ny;
      const sign = dot > 0 ? -1 : 1;  // flip if normal points inward
      const offX = nx * ARROW_OFFSET * sign;
      const offY = ny * ARROW_OFFSET * sign;

      // Arrow line endpoints (offset from wall)
      const ax1 = p1.x + offX;
      const ay1 = p1.y + offY;
      const ax2 = p2.x + offX;
      const ay2 = p2.y + offY;

      // ── Per-segment wall Lines with door gap splitting ─────────────────
      const wallDoors = (roomIndex !== undefined) ? getDoorsOnWall(roomIndex, i) : [];

      if (wallDoors.length === 0) {
        // No doors on this wall — draw solid wall segment
        walls.push(
          <Line key={`${keyPrefix}-w-${i}`}
            points={[p1.x, p1.y, p2.x, p2.y]}
            stroke={WALL_COLOR} strokeWidth={WALL_WIDTH}
            lineCap="square" lineJoin="miter"
            perfectDrawEnabled={false} shadowForStrokeEnabled={false}
            listening={false}
          />
        );
      } else {
        // Sort doors by position along wall
        const sorted = [...wallDoors].sort((a, b) => a.positionAlongWall - b.positionAlongWall);

        // Build gap intervals as t-ranges [gapStart, gapEnd]
        const gaps = sorted.map(d => {
          const doorPx = d.width * PIXELS_PER_FOOT;
          const halfT = doorPx / (2 * len);
          const gapStart = Math.max(0, d.positionAlongWall - halfT);
          const gapEnd   = Math.min(1, d.positionAlongWall + halfT);
          return { gapStart, gapEnd };
        });

        // Draw wall sub-segments between gaps
        let cursor = 0;
        gaps.forEach((gap, gi) => {
          if (cursor < gap.gapStart) {
            const sx = p1.x + cursor * dx, sy = p1.y + cursor * dy;
            const ex = p1.x + gap.gapStart * dx, ey = p1.y + gap.gapStart * dy;
            walls.push(
              <Line key={`${keyPrefix}-w-${i}-seg-${gi}a`}
                points={[sx, sy, ex, ey]}
                stroke={WALL_COLOR} strokeWidth={WALL_WIDTH}
                lineCap="square" lineJoin="miter"
                perfectDrawEnabled={false} shadowForStrokeEnabled={false}
                listening={false}
              />
            );
          }
          cursor = gap.gapEnd;
        });
        // Draw trailing segment after last gap
        if (cursor < 1) {
          const sx = p1.x + cursor * dx, sy = p1.y + cursor * dy;
          walls.push(
            <Line key={`${keyPrefix}-w-${i}-seg-tail`}
              points={[sx, sy, p2.x, p2.y]}
              stroke={WALL_COLOR} strokeWidth={WALL_WIDTH}
              lineCap="square" lineJoin="miter"
              perfectDrawEnabled={false} shadowForStrokeEnabled={false}
              listening={false}
            />
          );
        }
      }

      // ── Thin dashed extension lines (wall endpoint → arrow endpoint) ────
      labels.push(
        <Line key={`${keyPrefix}-ext1-${i}`}
          points={[p1.x, p1.y, ax1, ay1]}
          stroke={LINE_COLOR} strokeWidth={0.8} dash={[3, 3]} opacity={0.7}
        />
      );
      labels.push(
        <Line key={`${keyPrefix}-ext2-${i}`}
          points={[p2.x, p2.y, ax2, ay2]}
          stroke={LINE_COLOR} strokeWidth={0.8} dash={[3, 3]} opacity={0.7}
        />
      );

      // ── Double-headed Arrow (Planner5D style) ────────────────────────────
      labels.push(
        <Arrow
          key={`${keyPrefix}-arr-${i}`}
          points={[ax1, ay1, ax2, ay2]}
          stroke={LINE_COLOR} strokeWidth={1}
          fill={LINE_COLOR}
          pointerLength={ARROW_PX} pointerWidth={ARROW_PX}
          pointerAtBeginning={true} pointerAtEnding={true}
        />
      );

      // ── Perpendicular end-cap ticks ──────────────────────────────────────
      labels.push(
        <Line key={`${keyPrefix}-cap1-${i}`}
          points={[
            ax1 - ux * CAP_HALF, ay1 - uy * CAP_HALF,
            ax1 + ux * CAP_HALF, ay1 + uy * CAP_HALF,
          ]}
          stroke={LINE_COLOR} strokeWidth={1.5}
        />
      );
      labels.push(
        <Line key={`${keyPrefix}-cap2-${i}`}
          points={[
            ax2 - ux * CAP_HALF, ay2 - uy * CAP_HALF,
            ax2 + ux * CAP_HALF, ay2 + uy * CAP_HALF,
          ]}
          stroke={LINE_COLOR} strokeWidth={1.5}
        />
      );

      // ── Measurement text with white background for legibility ────────────
      const distFeet = (len / PIXELS_PER_FOOT).toFixed(1);
      const label    = `${distFeet} ft`;
      const textW    = label.length * 6 + 10;
      const textH    = 14;
      // Push text slightly further out than the arrow line
      const extraOff = 6;
      const textX = midX + offX + nx * extraOff * sign - textW / 2;
      const textY = midY + offY + ny * extraOff * sign - textH / 2;

      labels.push(
        <Rect key={`${keyPrefix}-tbg-${i}`}
          x={textX - 3} y={textY - 1}
          width={textW + 6} height={textH + 2}
          fill="white" cornerRadius={3} opacity={0.92}
        />
      );
      labels.push(
        <Text
          key={`${keyPrefix}-lbl-${i}`}
          x={textX} y={textY}
          width={textW} align="center"
          text={label}
          fontSize={12} fill={TEXT_COLOR}
          fontFamily="Inter, sans-serif" fontWeight={500}
        />
      );
    }

    return { walls, labels };
  };

  // ── Build door shapes (panel line + swing arc) ──────────────────────────
  const buildDoorShapes = (roomIndex, points) => {
    const shapes = [];
    const roomDoors = doors.filter(d => d.roomIndex === roomIndex);
    if (roomDoors.length === 0) return shapes;

    // Room centroid — used to determine "inward" direction for swing
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    const DOOR_COLOR = '#8B5E3C';     // warm brown for door panel
    const ARC_COLOR  = '#8B5E3C';     // same brown for arc
    const SELECTED_COLOR = '#22c55e'; // green highlight when selected

    roomDoors.forEach((door) => {
      const wi = door.wallIndex;
      if (wi >= points.length) return;
      const p1 = points[wi];
      const p2 = points[(wi + 1) % points.length];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const wallLen = Math.hypot(dx, dy);
      if (wallLen < 2) return;

      const ux = dx / wallLen, uy = dy / wallLen;
      const doorPx = door.width * PIXELS_PER_FOOT;
      const halfT = doorPx / (2 * wallLen);
      const gapStartT = Math.max(0, door.positionAlongWall - halfT);
      const gapEndT   = Math.min(1, door.positionAlongWall + halfT);

      // Gap endpoints in world coords
      const gapStartX = p1.x + gapStartT * dx;
      const gapStartY = p1.y + gapStartT * dy;
      const gapEndX   = p1.x + gapEndT * dx;
      const gapEndY   = p1.y + gapEndT * dy;

      // "Inward" perpendicular — toward room centroid
      const nx = -uy, ny = ux; // left-hand normal
      const midWallX = (p1.x + p2.x) / 2, midWallY = (p1.y + p2.y) / 2;
      const dotProd = (cx - midWallX) * nx + (cy - midWallY) * ny;
      const inwardNx = dotProd > 0 ? nx : -nx;
      const inwardNy = dotProd > 0 ? ny : -ny;

      const isSelected = selectedDoorId === door.id;
      const strokeColor = isSelected ? SELECTED_COLOR : DOOR_COLOR;
      const strokeW = isSelected ? 3 : 2;
      const dType = door.type || 'single-left'; // fallback

      const createSingleDoor = (hx, hy, fx, fy, panelLen) => {
        let panelAngleDeg = Math.atan2(fy - hy, fx - hx) * (180 / Math.PI);
        const crossProduct = (fx - hx) * inwardNy - (fy - hy) * inwardNx;
        const sweepCW = crossProduct < 0;

        // Panel line
        shapes.push(
          <Line
            key={`door-panel-${door.id}-${hx}`}
            points={[hx, hy, fx, fy]}
            stroke={strokeColor}
            strokeWidth={strokeW + 1}
            lineCap="round"
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            onClick={(e) => {
              e.cancelBubble = true;
              setSelectedDoorId(door.id);
              setSelectedId(null);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              setSelectedDoorId(door.id);
              setSelectedId(null);
            }}
          />
        );

        // Arc
        shapes.push(
          <Shape
            key={`door-arc-${door.id}-${hx}`}
            sceneFunc={(ctx, shape) => {
              ctx.beginPath();
              const startAngleRad = panelAngleDeg * (Math.PI / 180);
              const sweepRad = (sweepCW ? -1 : 1) * (Math.PI / 2);
              const endAngleRad = startAngleRad + sweepRad;
              ctx.arc(hx, hy, panelLen, startAngleRad, endAngleRad, sweepCW);
              ctx.fillStrokeShape(shape);
            }}
            stroke={strokeColor}
            strokeWidth={1.2}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            listening={false}
          />
        );

        // Tip line
        const startAngleRad = panelAngleDeg * (Math.PI / 180);
        const sweepRad = (sweepCW ? -1 : 1) * (Math.PI / 2);
        const endAngleRad = startAngleRad + sweepRad;
        const tipX = hx + panelLen * Math.cos(endAngleRad);
        const tipY = hy + panelLen * Math.sin(endAngleRad);
        shapes.push(
          <Line
            key={`door-tip-${door.id}-${hx}`}
            points={[hx, hy, tipX, tipY]}
            stroke={strokeColor}
            strokeWidth={1.2}
            lineCap="round"
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            listening={false}
          />
        );

        // Hinge dot
        shapes.push(
          <Circle
            key={`door-hinge-${door.id}-${hx}`}
            x={hx} y={hy}
            radius={3}
            fill={strokeColor}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            listening={false}
          />
        );
      };

      if (dType === 'single-left' || dType === 'single-right' || (dType !== 'double' && dType !== 'sliding')) {
        const isRight = dType === 'single-right';
        const legacyRight = door.swingDirection === 'right';
        const hingeAtEnd = isRight || legacyRight;
        const hx = hingeAtEnd ? gapEndX : gapStartX;
        const hy = hingeAtEnd ? gapEndY : gapStartY;
        const fx = hingeAtEnd ? gapStartX : gapEndX;
        const fy = hingeAtEnd ? gapStartY : gapEndY;
        createSingleDoor(hx, hy, fx, fy, doorPx);
      } else if (dType === 'double') {
        const midX = (gapStartX + gapEndX) / 2;
        const midY = (gapStartY + gapEndY) / 2;
        // Left panel
        createSingleDoor(gapStartX, gapStartY, midX, midY, doorPx / 2);
        // Right panel
        createSingleDoor(gapEndX, gapEndY, midX, midY, doorPx / 2);
      } else if (dType === 'sliding') {
        // Two offset lines to indicate sliding doors
        const midX = (gapStartX + gapEndX) / 2;
        const midY = (gapStartY + gapEndY) / 2;
        const offsetDist = 2.5; // px outward/inward
        const overlap = 4; // px

        shapes.push(
          <Line
            key={`door-slide1-${door.id}`}
            points={[gapStartX + inwardNx * offsetDist, gapStartY + inwardNy * offsetDist, midX + ux * overlap + inwardNx * offsetDist, midY + uy * overlap + inwardNy * offsetDist]}
            stroke={strokeColor}
            strokeWidth={strokeW + 1}
            lineCap="round"
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            onClick={(e) => {
              e.cancelBubble = true;
              setSelectedDoorId(door.id);
              setSelectedId(null);
            }}
          />
        );
        shapes.push(
          <Line
            key={`door-slide2-${door.id}`}
            points={[gapEndX - inwardNx * offsetDist, gapEndY - inwardNy * offsetDist, midX - ux * overlap - inwardNx * offsetDist, midY - uy * overlap - inwardNy * offsetDist]}
            stroke={strokeColor}
            strokeWidth={strokeW + 1}
            lineCap="round"
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            onClick={(e) => {
              e.cancelBubble = true;
              setSelectedDoorId(door.id);
              setSelectedId(null);
            }}
          />
        );
      }
    });

    return shapes;
  };

  const renderFurnitureShape = useCallback((item) => {
    const { width: w, height: h, color, catalogId } = item;
    switch (catalogId) {
      case 'bed-queen':
      case 'bed-single':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Line points={[4, h * 0.15, w - 4, h * 0.15]} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Rect x={w * 0.1} y={4} width={w * 0.35} height={h * 0.12} fill="#fff" stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Rect x={w * 0.55} y={4} width={w * 0.35} height={h * 0.12} fill="#fff" stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
          </>
        );
      case 'wardrobe':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Line points={[w / 2, 0, w / 2, h]} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Circle x={w / 2 - 6} y={h / 2} radius={2} fill="#000" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Circle x={w / 2 + 6} y={h / 2} radius={2} fill="#000" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
          </>
        );
      case 'desk':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Line points={[w * 0.15, 0, w * 0.15, h]} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
          </>
        );
      case 'chair':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Line points={[2, 2, w - 2, 2]} stroke="#000" strokeWidth={3} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
          </>
        );
      case 'sofa-2seat':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Line points={[2, 3, w - 2, 3]} stroke="#000" strokeWidth={4} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Line points={[w / 2, h * 0.25, w / 2, h]} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
          </>
        );
      case 'dining-table':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} cornerRadius={4} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Circle x={w * 0.2} y={-4} radius={3} fill="#6b5b95" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Circle x={w * 0.8} y={-4} radius={3} fill="#6b5b95" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Circle x={w * 0.2} y={h + 4} radius={3} fill="#6b5b95" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Circle x={w * 0.8} y={h + 4} radius={3} fill="#6b5b95" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
          </>
        );
      case 'tv-unit':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            <Rect x={w * 0.25} y={-h * 0.6} width={w * 0.5} height={h * 0.6} fill="#111" stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
          </>
        );
      default:
        return <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />;
    }
  }, []);

  const staticRoomShapes = useMemo(() => {
    return rooms.map((room, ri) => {
      const isSelected = !readOnly && ri === selectedRoomIndex;
      const textureId = room.floorTextureId || 'wood-oak';
      const patternImage = loadedTextures[textureId] || undefined;

      const floorPoints = room.points.flatMap(p => [p.x, p.y]);
      const { walls, labels } = buildWallsAndLabels(room.points, `room${ri}`, ri);
      const doorShapes = buildDoorShapes(ri, room.points);
      const centerX = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
      const centerY = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
      return (
        <React.Fragment key={`room-fragment-${ri}`}>
          {/* Floor fill polygon — ONE continuous closed shape, untouched */}
          <Line
            key={`floor-${ri}`}
            points={floorPoints}
            closed
            fillPatternImage={patternImage}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 0.2, y: 0.2 }}
            fillPriority={patternImage ? 'pattern' : 'color'}
            fill="#d2a96e"
            shadowColor="#000"
            shadowBlur={12}
            shadowOpacity={0.12}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            onClick={(e) => { 
              if (pendingFurniture || doorPlacementMode) return; 
              e.cancelBubble = true; 
              if (setSelectedRoomIndex) setSelectedRoomIndex(ri); 
            }}
            onTap={(e) => { 
              if (pendingFurniture || doorPlacementMode) return; 
              e.cancelBubble = true; 
              if (setSelectedRoomIndex) setSelectedRoomIndex(ri); 
            }}
          />
          {/* Per-segment wall strokes (split around door gaps) */}
          {walls}
          {isSelected && (
            <Line
              key={`selected-highlight-${ri}`}
              points={floorPoints}
              closed
              stroke="#22c55e"
              strokeWidth={2}
              dash={[6, 6]}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          {labels}
          {/* Door symbols (panel + swing arc) */}
          {doorShapes}
          <Text
            key={`rl-${ri}`}
            x={centerX - 40}
            y={centerY - 10}
            text={room.label}
            fontSize={14}
            fontStyle="500"
            fontFamily="Inter, system-ui, sans-serif"
            fill="#1f2937"
            perfectDrawEnabled={false}
          />
        </React.Fragment>
      );
    });
  }, [rooms, loadedTextures, selectedRoomIndex, setSelectedRoomIndex, doors, selectedDoorId, readOnly]);

  // Handlers wrapped in useCallback to preserve furniture memoization
  const handleFurnitureDragMoveCb = useCallback((id, e) => handleFurnitureDragMove(id, e), [placedFurniture, rooms, currentPoints]);
  const handleFurnitureDragEndCb = useCallback((id, e) => handleFurnitureDragEnd(id, e), [placedFurniture, rooms, currentPoints]);
  const handleFurnitureTransformEndCb = useCallback((id, e) => handleFurnitureTransformEnd(id, e), [placedFurniture, rooms, currentPoints]);
  const handleFurnitureClickCb = useCallback((e, id) => {
    e.cancelBubble = true;
    setSelectedId(id);
    setSelectedDoorId(null); // clear door selection when selecting furniture
  }, []);

  const lastPoint = currentPoints[currentPoints.length - 1];
  const previewLine = lastPoint && mousePos
    ? [lastPoint.x, lastPoint.y, mousePos.x, mousePos.y]
    : null;

  /* ── shared icon-button style ── */
  const iconBtn = (extra = {}) => ({
    width: 34, height: 34, borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.07)',
    color: '#d1d5db', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, transition: 'all 0.15s', outline: 'none',
    fontFamily: 'inherit',
    ...extra,
  });

  return (
    <div ref={containerRef} className="room-canvas-shell">
      {/* ══════════ TOP BAR — Planner5D style ══════════ */}
      {!readOnly && (
        <div className="canvas-top-bar">
          <button
            type="button"
            onClick={history.undo}
            disabled={!history.canUndo}
            title="Undo (Ctrl+Z)"
            className="canvas-icon-button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 14-5-5 5-5"/><path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5A5.5 5.5 0 0 1 14.5 20H11"/></svg>
          </button>
          <button
            type="button"
            onClick={history.redo}
            disabled={!history.canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="canvas-icon-button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/></svg>
          </button>
          <button
            type="button"
            onClick={clearAll}
            title="Clear all"
            className="canvas-action-button danger canvas-top-action"
          >
            ✕
          </button>
          <div className="canvas-top-spacer" />
          <span className="canvas-top-status">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} · {placedFurniture.length} item{placedFurniture.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ══════════ CANVAS AREA ══════════ */}
      <div 
        className="canvas-stage-wrapper"
        onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={readOnly ? undefined : (e) => {
          e.preventDefault();
          try {
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;
            const item = JSON.parse(data);
            
            const stage = stageRef.current;
            if (!stage) return;
            
            const rect = e.currentTarget.getBoundingClientRect();
            const pointerX = e.clientX - rect.left;
            const pointerY = e.clientY - rect.top;
            
            const scale = stage.scaleX();
            const worldX = (pointerX - stage.x()) / scale;
            const worldY = (pointerY - stage.y()) / scale;
            
            const width = item.width * PIXELS_PER_FOOT;
            const height = item.height * PIXELS_PER_FOOT;
            const { x: snappedX, y: snappedY } = applySnap(worldX, worldY, width, height);

            if (hasCollision(null, snappedX, snappedY, width, height, placedFurniture)) {
              if (onError) onError('Cannot place furniture here - it overlaps another item.', false);
              return;
            }
            
            const newItem = {
              id: `${item.id}-${Date.now()}`,
              catalogId: item.id,
              name: item.name,
              x: snappedX,
              y: snappedY,
              width,
              height,
              color: item.color,
              price: item.price,
              rotation: 0
            };

            setPlacedFurniture(prev => [...prev, newItem]);
            if (onFurniturePlaced) onFurniturePlaced();
          } catch (err) {
            console.error('Drop error:', err);
          }
        }}
      >

        {/* Placement hint toast */}
        {pendingFurniture && (
          <div className="canvas-toast" style={{ fontWeight: '400', color: 'var(--text-muted, #64748b)' }}>
            📐 Click to place: <strong style={{ fontWeight: '500', color: 'var(--text-primary, #f8fafc)' }}>{pendingFurniture.name}</strong>
          </div>
        )}
        {doorPlacementMode && pendingDoorType && !pendingFurniture && rooms.length > 0 && (
          <div className="canvas-toast door-mode">
            🚪 Click on a wall to place a door
          </div>
        )}

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          draggable
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDblClick={handleDoubleClick}
          onWheel={handleWheel}
          className="canvas-stage"
        >
          <Layer>
            <GridShape />

            {staticRoomShapes}

            {/* ── Wall hover highlight (door placement mode) ── */}
            {doorPlacementMode && hoveredWall && (() => {
              const room = rooms[hoveredWall.roomIndex];
              if (!room) return null;
              const p1 = room.points[hoveredWall.wallIndex];
              const p2 = room.points[(hoveredWall.wallIndex + 1) % room.points.length];
              return (
                <Line
                  key="hovered-wall-highlight"
                  points={[p1.x, p1.y, p2.x, p2.y]}
                  stroke="#22c55e"
                  strokeWidth={14}
                  opacity={0.35}
                  lineCap="round"
                  listening={false}
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                />
              );
            })()}

            {pendingRoom && (() => {
              const fp = pendingRoom.points.flatMap(p => [p.x, p.y]);
              const { walls, labels } = buildWallsAndLabels(pendingRoom.points, 'pending');
              return (
                <>
                  <Line points={fp} closed fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth={2} dash={[6,6]} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                  {walls}{labels}
                </>
              );
            })()}

            {currentPoints.length > 1 && (
              <Line points={currentPoints.flatMap(p => [p.x, p.y])} stroke="#334155" strokeWidth={2} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            )}
            {previewLine && (
              <Line points={previewLine} stroke="#94a3b8" strokeWidth={1.5} dash={[6,6]} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
            )}

            {currentPoints.map((p, i) => {
              const highlight = i === 0 && nearFirstPoint;
              return (
                <Circle key={`pt-${i}`} x={p.x} y={p.y}
                  radius={highlight ? 9 : 5}
                  fill={highlight ? '#22c55e' : '#ef4444'}
                  stroke={highlight ? '#15803d' : '#fff'}
                  strokeWidth={highlight ? 2 : 1.5}
                  perfectDrawEnabled={false} shadowForStrokeEnabled={false}
                />
              );
            })}
          </Layer>

          {/* ── Furniture Layer (Dynamic) ── */}
          <Layer>
            {placedFurniture.map((item) => {
              const catalogItem = FURNITURE_CATALOG.find(f => f.id === item.catalogId);
              const isSelected = item.id === selectedId;
              return (
                <Group
                  key={item.id}
                  x={item.x} y={item.y} rotation={item.rotation ?? 0}
                  ref={(node) => { 
                    if (node) furnitureGroupRefs.current[item.id] = node; 
                    else delete furnitureGroupRefs.current[item.id];
                  }}
                  draggable={!readOnly}
                  onDragMove={readOnly ? undefined : (e) => handleFurnitureDragMoveCb(item.id, e)}
                  onDragEnd={readOnly ? undefined : (e) => handleFurnitureDragEndCb(item.id, e)}
                  onTransformEnd={readOnly ? undefined : (e) => handleFurnitureTransformEndCb(item.id, e)}
                  onClick={readOnly ? undefined : (e) => handleFurnitureClickCb(e, item.id)}
                >
                  {catalogItem?.thumbnail
                    ? <FurnitureIconImage url={catalogItem.thumbnail} width={item.width} height={item.height} />
                    : renderFurnitureShape(item)}
                  {isSelected && !readOnly && (
                    <Rect width={item.width} height={item.height}
                      stroke="#6b5b95" strokeWidth={2} dash={[4,4]} fill="rgba(107,91,149,0.06)"
                      perfectDrawEnabled={false} shadowForStrokeEnabled={false}
                    />
                  )}
                </Group>
              );
            })}

            {!readOnly && (
              <Transformer
                ref={transformerRef}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} rotateEnabled={true}
                borderStroke="#6b5b95" borderStrokeWidth={1.5} borderDash={[4,4]}
                anchorStroke="#6b5b95" anchorFill="#fff"
                anchorSize={8} anchorCornerRadius={4} rotateAnchorOffset={20}
              />
            )}
          </Layer>
        </Stage>

        {/* ══════════ RIGHT ZOOM RAIL — Planner5D style ══════════ */}
        <div className="canvas-zoom-rail">
          <button
            type="button"
            title="Reset view (fit to screen)"
            onClick={() => {
              const stage = stageRef.current;
              if (!stage) return;
              stage.scale({ x: 1, y: 1 });
              stage.position({ x: 0, y: 0 });
              stage.batchDraw();
            }}
            className="canvas-rail-button"
          >⊙</button>
          <div className="canvas-rail-divider" />
          <button
            type="button"
            title="Zoom in (or scroll up)"
            onClick={() => {
              const stage = stageRef.current;
              if (!stage) return;
              const oldScale = stage.scaleX();
              const newScale = Math.min(oldScale * 1.2, 4);
              const cx = stageSize.width / 2;
              const cy = stageSize.height / 2;
              const mousePointTo = { x: (cx - stage.x()) / oldScale, y: (cy - stage.y()) / oldScale };
              stage.scale({ x: newScale, y: newScale });
              stage.position({ x: cx - mousePointTo.x * newScale, y: cy - mousePointTo.y * newScale });
              stage.batchDraw();
            }}
            className="canvas-rail-button"
          >+</button>
          <button
            type="button"
            title="Zoom out (or scroll down)"
            onClick={() => {
              const stage = stageRef.current;
              if (!stage) return;
              const oldScale = stage.scaleX();
              const newScale = Math.max(oldScale / 1.2, 0.3);
              const cx = stageSize.width / 2;
              const cy = stageSize.height / 2;
              const mousePointTo = { x: (cx - stage.x()) / oldScale, y: (cy - stage.y()) / oldScale };
              stage.scale({ x: newScale, y: newScale });
              stage.position({ x: cx - mousePointTo.x * newScale, y: cy - mousePointTo.y * newScale });
              stage.batchDraw();
            }}
            className="canvas-rail-button"
          >−</button>
        </div>
      </div>

      {/* ── Room naming dialog (dark, floating) ── */}
      {pendingRoom && (
        <div className="canvas-dialog">
          <p>🏠 Name this room</p>
          <div className="canvas-dialog-row">
            <input
              autoFocus value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmRoomNameWithHistory()}
              placeholder="e.g. Bedroom, Kitchen…"
            />
            <button onClick={confirmRoomNameWithHistory}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomCanvas;
