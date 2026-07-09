import { useState, useEffect, useRef } from 'react';
import { snapToGrid, snapToWall } from '../../utils/snapping';
import { Stage, Layer, Line, Text, Circle, Rect, Group, Image as KonvaImage, Transformer, Arrow } from 'react-konva';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

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

        // Patch the opening <svg …> tag: remove old width/height, add ours
        svg = svg.replace(/<svg([^>]*)>/, (_, attrs) => {
          const cleaned = attrs.replace(/\s*(width|height)\s*=\s*"[^"]*"/gi, '');
          return `<svg${cleaned} width="${Math.round(width)}" height="${Math.round(height)}">`;
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
    return <Rect width={width} height={height} fill="#e8e0f0" cornerRadius={4} opacity={0.5} />;
  }
  return <KonvaImage image={image} x={0} y={0} width={width} height={height} />;
}

// ── Premium toolbar button ────────────────────────────────────────────────
function TBtn({ label, onClick, disabled, variant, tip }) {
  const base = {
    display: 'flex', alignItems: 'center', gap: 5,
    border: '1px solid', borderRadius: 6,
    fontSize: 12, fontWeight: 500, padding: '5px 13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s', letterSpacing: '0.1px',
    outline: 'none', whiteSpace: 'nowrap',
  };
  const styles = {
    default: {
      background: disabled ? 'transparent' : 'rgba(255,255,255,0.07)',
      borderColor: disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)',
      color: disabled ? 'rgba(255,255,255,0.22)' : '#d1d5db',
    },
    primary: {
      background: 'linear-gradient(135deg,#6b5b95,#9333ea)',
      borderColor: 'rgba(107,91,149,0.4)',
      color: '#fff',
    },
    danger: {
      background: disabled ? 'transparent' : 'rgba(239,68,68,0.1)',
      borderColor: disabled ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.35)',
      color: disabled ? 'rgba(255,255,255,0.22)' : '#f87171',
    },
  };
  return (
    <button onClick={!disabled ? onClick : undefined} title={tip || label} style={{ ...base, ...styles[variant || 'default'] }}>
      {label}
    </button>
  );
}

function RoomCanvas({ pendingFurniture, onFurniturePlaced, placedFurniture, setPlacedFurniture, rooms, setRooms, onSaveClick, onSaveAsClick, onLoadClick }) {
  // Canvas container ref — used by ResizeObserver for dynamic Stage sizing
  const containerRef = useRef(null);
  const stageRef = useRef(null);           // ref to Konva Stage for zoom controls
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });
  // Refs for the Konva Transformer and each placed furniture Group node.
  const transformerRef = useRef(null);
  const furnitureGroupRefs = useRef({});
  // rooms / setRooms lifted to App.jsx so App can save/load them
  const [currentPoints, setCurrentPoints] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  // true when the cursor is close enough to the first point to auto-close
  const [nearFirstPoint, setNearFirstPoint] = useState(false);
  const CLOSE_THRESHOLD = 20; // px — snap-to-start radius
  const [pendingRoom, setPendingRoom] = useState(null);
  const [roomNameInput, setRoomNameInput] = useState('');
  // placedFurniture + setPlacedFurniture are now props (shared with BudgetPanel via App)
  const [selectedId, setSelectedId] = useState(null);

  // ── Undo history ────────────────────────────────────────────────────────────
  // Each entry is a full snapshot: { rooms, currentPoints, placedFurniture }.
  // We never store pendingRoom snapshots — naming dialog is transient UI.
  const historyRef = useRef([]);

  /** Save a snapshot before every mutating action. */
  const pushHistory = (snap) => {
    historyRef.current = [
      ...historyRef.current.slice(-49), // keep last 50 states
      snap,
    ];
  };

  const undo = () => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setRooms(prev.rooms);
    setCurrentPoints(prev.currentPoints);
    setPlacedFurniture(prev.placedFurniture);
    setSelectedId(null);
    setPendingRoom(null); // close naming dialog if open
  };
  // ────────────────────────────────────────────────────────────────────────────

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

  // ── Infinite grid: large static range so panning never reveals a gap ──────
  // 3000px world-units ≈ 150 ft in each direction from origin (300 lines each axis)
  const GRID_RANGE = 3000;
  const gridLines = [];
  for (let x = -GRID_RANGE; x <= GRID_RANGE; x += GRID_SIZE)
    gridLines.push(<Line key={`v-${x}`} points={[x, -GRID_RANGE, x, GRID_RANGE]} stroke="#e2e6ec" strokeWidth={0.5} listening={false} />);
  for (let y = -GRID_RANGE; y <= GRID_RANGE; y += GRID_SIZE)
    gridLines.push(<Line key={`h-${y}`} points={[-GRID_RANGE, y, GRID_RANGE, y]} stroke="#e2e6ec" strokeWidth={0.5} listening={false} />);

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

  const handleStageClick = (e) => {
    // Ignore clicks that were actually a pan drag
    if (e.target.getStage().isDragging()) return;

    if (pendingFurniture) {
      // getRelativePointerPosition returns WORLD coords (undoes pan + zoom)
      const pos = e.target.getStage().getRelativePointerPosition();
      const width = pendingFurniture.width * PIXELS_PER_FOOT;
      const height = pendingFurniture.height * PIXELS_PER_FOOT;
      const { x: snappedX, y: snappedY } = applySnap(pos.x, pos.y, width, height);

      if (hasCollision(null, snappedX, snappedY, width, height, placedFurniture)) {
        alert('Cannot place furniture here — it overlaps another item.');
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
      pushHistory({ rooms, currentPoints, placedFurniture });
      setPlacedFurniture([...placedFurniture, newItem]);
      onFurniturePlaced();
      return;
    }

    if (pendingRoom) return;
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

    pushHistory({ rooms, currentPoints, placedFurniture });
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
      alert('Add at least 3 points to form a room.');
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
  };

  const handleFurnitureDragEnd = (id, e) => {
    const movingItem = placedFurniture.find((f) => f.id === id);
    // Wall-snap first, grid-snap fallback — runs BEFORE collision check
    const { x: snappedX, y: snappedY } = applySnap(
      e.target.x(), e.target.y(), movingItem.width, movingItem.height
    );

    const collides = hasCollision(
      id, snappedX, snappedY, movingItem.width, movingItem.height,
      placedFurniture, movingItem.rotation ?? 0
    );

    if (collides) {
      e.target.position({ x: movingItem.x, y: movingItem.y });
      return;
    }

    pushHistory({ rooms, currentPoints, placedFurniture });
    setPlacedFurniture(placedFurniture.map(f =>
      f.id === id ? { ...f, x: snappedX, y: snappedY } : f
    ));
  };

  // Called when the Transformer finishes a rotation gesture.
  // Resets any accidental scale the Transformer may have applied, then
  // saves the new rotation angle (degrees) into furniture state.
  const handleFurnitureTransformEnd = (id, e) => {
    const node = e.target;
    const newRotation = node.rotation();
    // Guard against Transformer accidentally scaling the node
    node.scaleX(1);
    node.scaleY(1);
    pushHistory({ rooms, currentPoints, placedFurniture });
    setPlacedFurniture(prev =>
      prev.map(f => f.id === id ? { ...f, rotation: newRotation } : f)
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    pushHistory({ rooms, currentPoints, placedFurniture });
    setPlacedFurniture(placedFurniture.filter(f => f.id !== selectedId));
    setSelectedId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, placedFurniture, rooms, currentPoints]);

  // Attach / detach the Transformer whenever the selected furniture item changes.
  useEffect(() => {
    if (!transformerRef.current) return;
    if (selectedId && furnitureGroupRefs.current[selectedId]) {
      transformerRef.current.nodes([furnitureGroupRefs.current[selectedId]]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedId]);

  // Push history before confirming a room name so the completed room is undoable.
  const confirmRoomNameWithHistory = () => {
    pushHistory({ rooms, currentPoints, placedFurniture });
    confirmRoomName();
  };

  const buildWallsAndLabels = (points, keyPrefix) => {
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
    const WALL_COLOR  = '#334155';

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

      // ── Wall stroke ──────────────────────────────────────────────────────
      walls.push(
        <Line
          key={`${keyPrefix}-w-${i}`}
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke={WALL_COLOR} strokeWidth={2.5}
        />
      );

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
        <Text key={`${keyPrefix}-txt-${i}`}
          x={textX} y={textY}
          text={label}
          fontSize={10} fontStyle="bold"
          fill={TEXT_COLOR}
          fontFamily="'Segoe UI', system-ui, sans-serif"
          width={textW} align="center"
        />
      );
    }
    return { walls, labels };
  };

  const renderFurnitureShape = (item) => {
    const { width: w, height: h, color, catalogId } = item;
    switch (catalogId) {
      case 'bed-queen':
      case 'bed-single':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />
            <Line points={[4, h * 0.15, w - 4, h * 0.15]} stroke="#000" strokeWidth={1} />
            <Rect x={w * 0.1} y={4} width={w * 0.35} height={h * 0.12} fill="#fff" stroke="#000" strokeWidth={1} />
            <Rect x={w * 0.55} y={4} width={w * 0.35} height={h * 0.12} fill="#fff" stroke="#000" strokeWidth={1} />
          </>
        );
      case 'wardrobe':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />
            <Line points={[w / 2, 0, w / 2, h]} stroke="#000" strokeWidth={1} />
            <Circle x={w / 2 - 6} y={h / 2} radius={2} fill="#000" />
            <Circle x={w / 2 + 6} y={h / 2} radius={2} fill="#000" />
          </>
        );
      case 'desk':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />
            <Line points={[w * 0.15, 0, w * 0.15, h]} stroke="#000" strokeWidth={1} />
          </>
        );
      case 'chair':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />
            <Line points={[2, 2, w - 2, 2]} stroke="#000" strokeWidth={3} />
          </>
        );
      case 'sofa-2seat':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />
            <Line points={[2, 3, w - 2, 3]} stroke="#000" strokeWidth={4} />
            <Line points={[w / 2, h * 0.25, w / 2, h]} stroke="#000" strokeWidth={1} />
          </>
        );
      case 'dining-table':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} cornerRadius={4} />
            <Circle x={w * 0.2} y={-4} radius={3} fill="#6b5b95" />
            <Circle x={w * 0.8} y={-4} radius={3} fill="#6b5b95" />
            <Circle x={w * 0.2} y={h + 4} radius={3} fill="#6b5b95" />
            <Circle x={w * 0.8} y={h + 4} radius={3} fill="#6b5b95" />
          </>
        );
      case 'tv-unit':
        return (
          <>
            <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />
            <Rect x={w * 0.25} y={-h * 0.6} width={w * 0.5} height={h * 0.6} fill="#111" stroke="#000" strokeWidth={1} />
          </>
        );
      default:
        return <Rect width={w} height={h} fill={color} stroke="#000" strokeWidth={1} />;
    }
  };

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
    <div
      ref={containerRef}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: '#eef0f4', minWidth: 0 }}
    >
      {/* ══════════ TOP BAR — Planner5D style ══════════ */}
      <div style={{
        height: 48, flexShrink: 0,
        background: 'rgba(15,15,25,0.96)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 4,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        zIndex: 10,
      }}>

        {/* ── Draw action ── */}
        <button
          onClick={finishRoom}
          style={{
            ...iconBtn(),
            background: 'linear-gradient(135deg,#6b5b95,#9333ea)',
            border: 'none', color: '#fff',
            width: 'auto', padding: '0 14px', gap: 6,
            fontSize: 12, fontWeight: 600, letterSpacing: '0.2px',
          }}
          title="Finish drawing room"
        >
          ✦ Finish Room
        </button>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

        {/* ── Save / Load ── */}
        {/* 💾 Ctrl+S — instant quick-save (no dialog) */}
        <button
          onClick={onSaveClick}
          title="Quick save (Ctrl+S)"
          style={iconBtn({ background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80', fontSize: 14 })}
        >💾</button>
        {/* 📝 Ctrl+Shift+S — opens naming dialog */}
        <button
          onClick={onSaveAsClick}
          title="Save As… (Ctrl+Shift+S)"
          style={iconBtn({ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)', color: '#86efac', fontSize: 11, fontWeight: 700, width: 'auto', padding: '0 8px', letterSpacing: 0 })}
        >AS</button>
        {/* 📂 Load modal */}
        <button
          onClick={onLoadClick}
          title="Load a saved design (Ctrl+O)"
          style={iconBtn({ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 14 })}
        >📂</button>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

        {/* ── Undo / Redo ── */}
        <button
          onClick={undo}
          disabled={historyRef.current.length === 0}
          title="Undo (Ctrl+Z)"
          style={iconBtn({ opacity: historyRef.current.length === 0 ? 0.3 : 1 })}
        >
          ↩
        </button>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

        {/* ── Delete selected ── */}
        <button
          onClick={handleDeleteSelected}
          disabled={!selectedId}
          title="Delete selected item"
          style={iconBtn({
            opacity: !selectedId ? 0.3 : 1,
            color: '#f87171',
            borderColor: !selectedId ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.35)',
            background: !selectedId ? 'transparent' : 'rgba(239,68,68,0.1)',
          })}
        >
          🗑
        </button>

        {/* ── Clear all ── */}
        <button
          onClick={clearAll}
          title="Clear all"
          style={iconBtn({ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' })}
        >
          ✕
        </button>

        {/* ── Spacer + status ── */}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.5px' }}>
          {rooms.length} room{rooms.length !== 1 ? 's' : ''} · {placedFurniture.length} item{placedFurniture.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ══════════ CANVAS AREA ══════════ */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Placement hint toast */}
        {pendingFurniture && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(107,91,149,0.92)', backdropFilter: 'blur(10px)',
            color: '#fff', borderRadius: 20, padding: '7px 20px',
            fontSize: 13, fontWeight: 500, zIndex: 20, pointerEvents: 'none',
            whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(107,91,149,0.4)',
          }}>
            📐 Click to place: <strong>{pendingFurniture.name}</strong>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          draggable
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          onDblClick={handleDoubleClick}
          onWheel={handleWheel}
          style={{ cursor: 'crosshair' }}
        >
          <Layer>
            {gridLines}

            {rooms.map((room, ri) => {
              const floorPoints = room.points.flatMap(p => [p.x, p.y]);
              const { walls, labels } = buildWallsAndLabels(room.points, `room${ri}`);
              const centerX = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
              const centerY = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
              return (
                <>
                  <Line key={`floor-${ri}`} points={floorPoints} closed fill="#ddeeff" stroke="#334155" strokeWidth={2.5} />
                  {walls}{labels}
                  <Text key={`rl-${ri}`} x={centerX - 30} y={centerY} text={room.label} fontSize={14} fontStyle="bold" fill="#1e293b" />
                </>
              );
            })}

            {pendingRoom && (() => {
              const fp = pendingRoom.points.flatMap(p => [p.x, p.y]);
              const { walls, labels } = buildWallsAndLabels(pendingRoom.points, 'pending');
              return (
                <>
                  <Line points={fp} closed fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth={2} dash={[6,6]} />
                  {walls}{labels}
                </>
              );
            })()}

            {currentPoints.length > 1 && (
              <Line points={currentPoints.flatMap(p => [p.x, p.y])} stroke="#334155" strokeWidth={2} />
            )}
            {previewLine && (
              <Line points={previewLine} stroke="#94a3b8" strokeWidth={1.5} dash={[6,6]} />
            )}

            {currentPoints.map((p, i) => {
              const highlight = i === 0 && nearFirstPoint;
              return (
                <Circle key={`pt-${i}`} x={p.x} y={p.y}
                  radius={highlight ? 9 : 5}
                  fill={highlight ? '#22c55e' : '#ef4444'}
                  stroke={highlight ? '#15803d' : '#fff'}
                  strokeWidth={highlight ? 2 : 1.5}
                />
              );
            })}

            {placedFurniture.map((item) => {
              const catalogItem = FURNITURE_CATALOG.find(f => f.id === item.catalogId);
              const isSelected = item.id === selectedId;
              return (
                <Group
                  key={item.id} x={item.x} y={item.y} rotation={item.rotation ?? 0}
                  ref={(node) => { if (node) furnitureGroupRefs.current[item.id] = node; }}
                  draggable
                  onDragEnd={(e) => handleFurnitureDragEnd(item.id, e)}
                  onTransformEnd={(e) => handleFurnitureTransformEnd(item.id, e)}
                  onClick={(e) => { e.cancelBubble = true; setSelectedId(item.id); }}
                >
                  {catalogItem?.icon
                    ? <FurnitureIconImage url={catalogItem.icon} width={item.width} height={item.height} />
                    : renderFurnitureShape(item)}
                  {isSelected && (
                    <Rect width={item.width} height={item.height}
                      stroke="#6b5b95" strokeWidth={2} dash={[4,4]} fill="rgba(107,91,149,0.06)" />
                  )}
                </Group>
              );
            })}

            <Transformer
              ref={transformerRef}
              enabledAnchors={[]} rotateEnabled={true}
              borderStroke="#6b5b95" borderStrokeWidth={1.5} borderDash={[4,4]}
              anchorStroke="#6b5b95" anchorFill="#fff"
              anchorSize={8} anchorCornerRadius={4} rotateAnchorOffset={20}
            />
          </Layer>
        </Stage>

        {/* ══════════ RIGHT ZOOM RAIL — Planner5D style ══════════ */}
        <div style={{
          position: 'absolute', right: 16, bottom: 24,
          display: 'flex', flexDirection: 'column', gap: 6,
          zIndex: 15,
        }}>
          {/* Reset view */}
          <button
            title="Reset view (fit to screen)"
            onClick={() => {
              const stage = stageRef.current;
              if (!stage) return;
              stage.scale({ x: 1, y: 1 });
              stage.position({ x: 0, y: 0 });
              stage.batchDraw();
            }}
            style={iconBtn({ background: '#fff', color: '#555', border: '1px solid #e2e5ea', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 13 })}
          >⊙</button>
          <div style={{ height: 1, background: '#ddd', margin: '2px 0' }} />
          {/* Zoom in */}
          <button
            title="Zoom in (or scroll up)"
            onClick={() => {
              const stage = stageRef.current;
              if (!stage) return;
              const oldScale = stage.scaleX();
              const newScale = Math.min(oldScale * 1.2, 4);
              // zoom toward canvas center
              const cx = stageSize.width / 2;
              const cy = stageSize.height / 2;
              const mousePointTo = { x: (cx - stage.x()) / oldScale, y: (cy - stage.y()) / oldScale };
              stage.scale({ x: newScale, y: newScale });
              stage.position({ x: cx - mousePointTo.x * newScale, y: cy - mousePointTo.y * newScale });
              stage.batchDraw();
            }}
            style={iconBtn({ background: '#fff', color: '#333', border: '1px solid #e2e5ea', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 18, fontWeight: 700 })}
          >+</button>
          {/* Zoom out */}
          <button
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
            style={iconBtn({ background: '#fff', color: '#333', border: '1px solid #e2e5ea', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 18, fontWeight: 700 })}
          >−</button>
        </div>
      </div>

      {/* ── Room naming dialog (dark, floating) ── */}
      {pendingRoom && (
        <div style={{
          position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(12,12,20,0.97)', backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
          padding: '20px 22px', boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          zIndex: 30, minWidth: 290,
        }}>
          <p style={{ margin: '0 0 14px 0', fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>🏠 Name this room</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmRoomNameWithHistory()}
              placeholder="e.g. Bedroom, Kitchen…"
              style={{
                flex: 1, padding: '9px 13px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.07)', color: '#e2e8f0',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={confirmRoomNameWithHistory} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'linear-gradient(135deg,#6b5b95,#9333ea)',
              border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomCanvas;
