/**
 * AnimatedRoomDemo.jsx
 *
 * An ambient, fully-CSS animated room that shows furniture items appearing
 * one-by-one as if being placed by a user. Used as the left-side background
 * on the Login and Signup pages.
 *
 * Animation loop:
 *  1. Room fades in (empty).
 *  2. Each furniture piece pops in with a staggered scale+opacity animation.
 *  3. The fully-furnished room "holds" for ~2.5 s.
 *  4. The entire room fades out.
 *  5. Loop restarts.
 *
 * Total cycle ≈ 18 s → driven by a single CSS animation on the wrapper.
 * Individual items use animation-delay offsets within that cycle.
 *
 * No JS timers / intervals — everything is pure CSS keyframes so React never
 * needs to re-render while the animation is running.
 */

import bedQueenIcon    from '../../assets/furniture/bed-queen.svg';
import sofaIcon        from '../../assets/furniture/sofa-2seat.svg';
import deskIcon        from '../../assets/furniture/desk.svg';
import chairIcon       from '../../assets/furniture/chair.svg';
import tvUnitIcon      from '../../assets/furniture/tv-unit.svg';
import wardrobeIcon    from '../../assets/furniture/wardrobe.svg';
import diningTableIcon from '../../assets/furniture/dining-table.svg';
import plantIcon       from '../../assets/furniture/plant.svg';
import armchairIcon    from '../../assets/furniture/armchair.svg';

/* --------------------------------------------------------------------------
   Furniture layout — positions are expressed as % of the room canvas size.
   Each item gets an index that drives its animation-delay.
   -------------------------------------------------------------------------- */
const FURNITURE_ITEMS = [
  // Bedroom area (top-left)
  { id: 'bed-queen',    src: bedQueenIcon,    label: 'Queen Bed',       top: '8%',  left: '5%',  w: '18%', h: '22%', delay: 0 },
  { id: 'wardrobe',     src: wardrobeIcon,    label: 'Wardrobe',        top: '8%',  left: '25%', w: '14%', h: '9%',  delay: 1 },
  // Living area (center/right)
  { id: 'sofa',         src: sofaIcon,        label: '2-Seater Sofa',   top: '42%', left: '5%',  w: '22%', h: '10%', delay: 2 },
  { id: 'armchair',     src: armchairIcon,    label: 'Armchair',        top: '38%', left: '30%', w: '11%', h: '11%', delay: 3 },
  { id: 'tv-unit',      src: tvUnitIcon,      label: 'TV Unit',         top: '55%', left: '5%',  w: '20%', h: '5%',  delay: 4 },
  // Work / desk area
  { id: 'desk',         src: deskIcon,        label: 'Study Desk',      top: '8%',  left: '55%', w: '16%', h: '8%',  delay: 5 },
  { id: 'chair',        src: chairIcon,       label: 'Chair',           top: '18%', left: '61%', w: '7%',  h: '8%',  delay: 6 },
  // Dining (bottom-right)
  { id: 'dining-table', src: diningTableIcon, label: 'Dining Table',    top: '62%', left: '50%', w: '20%', h: '18%', delay: 7 },
  // Decor
  { id: 'plant',        src: plantIcon,       label: 'Plant',           top: '33%', left: '44%', w: '6%',  h: '8%',  delay: 8 },
];

/* --------------------------------------------------------------------------
   Timing constants (seconds)
   Total loop = INTRO + n*STAGGER + HOLD + OUTRO
   -------------------------------------------------------------------------- */
const INTRO    = 0.8;   // room fade-in
const STAGGER  = 0.55;  // gap between each furniture item appearing
const HOLD     = 2.5;   // pause at fully-furnished state
const OUTRO    = 1.0;   // room fade-out
const ITEM_DUR = 0.5;   // each item's own entrance animation duration

const TOTAL_CYCLE =
  INTRO + FURNITURE_ITEMS.length * STAGGER + HOLD + OUTRO; // ≈ 20 s

/* --------------------------------------------------------------------------
   Build the dynamic <style> block once (avoids repeated string builds).
   We generate @keyframes for:
     • room-cycle  – outer fade wrapper
     • item-pop    – shared item entrance (scale+opacity)
   -------------------------------------------------------------------------- */
function buildStyles() {
  // room-cycle: fade-in at 0%, stay visible until OUTRO kicks in, then fade-out
  const visibleStart = (INTRO / TOTAL_CYCLE) * 100;
  const fadeOutStart = ((TOTAL_CYCLE - OUTRO) / TOTAL_CYCLE) * 100;

  // item-pop: item is invisible, then quickly scales up and opaque
  // We use a shared keyframe; each item's delay controls when it fires.
  // The item must remain visible for the rest of the cycle after it appears,
  // so we set fill-mode=forwards on it.

  return `
    @keyframes room-cycle {
      0%                       { opacity: 0; }
      ${visibleStart.toFixed(2)}% { opacity: 1; }
      ${fadeOutStart.toFixed(2)}% { opacity: 1; }
      100%                     { opacity: 0; }
    }

    @keyframes item-pop {
      0%   { opacity: 0; transform: scale(0.6) translateY(6px); }
      60%  { opacity: 1; transform: scale(1.06) translateY(-1px); }
      100% { opacity: 1; transform: scale(1)   translateY(0);    }
    }

    .anim-room {
      animation: room-cycle ${TOTAL_CYCLE}s ease-in-out infinite;
    }
  `;
}

const ROOM_STYLES = buildStyles();

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */
export default function AnimatedRoomDemo() {
  return (
    <>
      {/* Inject keyframes + shared class into the document head via a <style> tag */}
      <style>{ROOM_STYLES}</style>

      {/*
        Outer wrapper: drives the whole-room fade cycle.
        position:absolute so it fills the parent (Login/Signup left panel).
      */}
      <div className="anim-room absolute inset-0 w-full h-full">

        {/* Wood-floor background — matches the editor canvas */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/wood_floor.png)',
            backgroundSize: '200px 200px',
            backgroundRepeat: 'repeat',
            opacity: 0.85,
          }}
        />

        {/* Subtle dark tint so the text overlay stays readable */}
        <div className="absolute inset-0 bg-black/20" />

        {/*
          Room canvas — a proportional floor-plan box centered in the panel.
          We use percentage-based sizing so it scales with the panel height.
        */}
        <div
          className="absolute"
          style={{
            top: '8%', left: '6%', right: '6%', bottom: '8%',
            border: '2.5px solid rgba(255,255,255,0.55)',
            borderRadius: '4px',
            overflow: 'visible',
          }}
        >
          {/* ── Room label ── */}
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              color: 'rgba(255,255,255,0.18)',
              fontSize: '1.4rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            ROOM 1
          </span>

          {/* ── Width dimension label (top) ── */}
          <DimLabel axis="h" position="top" value="36.0 ft" />
          {/* ── Height dimension label (left side) ── */}
          <DimLabel axis="v" position="left" value="20.0 ft" />

          {/*
            Furniture items — each one has an animation-delay so it appears
            after its predecessor. We set animation-fill-mode=forwards so the
            item stays visible once it has appeared.

            Delay formula:
              item_delay = INTRO + index * STAGGER
            This ensures no item appears before the room itself has faded in.
          */}
          {FURNITURE_ITEMS.map((item) => {
            const delaySeconds = (INTRO + item.delay * STAGGER).toFixed(2);
            return (
              <div
                key={item.id}
                title={item.label}
                style={{
                  position: 'absolute',
                  top: item.top,
                  left: item.left,
                  width: item.w,
                  height: item.h,
                  opacity: 0,
                  // Each item uses the shared item-pop keyframe but fires at its own delay
                  animation: `item-pop ${ITEM_DUR}s cubic-bezier(0.34,1.56,0.64,1) ${delaySeconds}s 1 forwards`,
                }}
              >
                <img
                  src={item.src}
                  alt={item.label}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    // Slight drop-shadow to lift items off the floor
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   Helper: dimension label lines
   -------------------------------------------------------------------------- */
function DimLabel({ axis, position, value }) {
  const isHorizontal = axis === 'h';

  const baseStyle = {
    position: 'absolute',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.62rem',
    fontWeight: 500,
    letterSpacing: '0.05em',
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  };

  if (isHorizontal) {
    // Sits above or below the room box, centered horizontally
    return (
      <div
        style={{
          ...baseStyle,
          top: position === 'top' ? '-20px' : 'auto',
          bottom: position === 'bottom' ? '-20px' : 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <span style={{ width: '24px', height: '1px', background: 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
        {value}
        <span style={{ width: '24px', height: '1px', background: 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
      </div>
    );
  }

  // Vertical label — rotated 90°, centered on the left side
  return (
    <div
      style={{
        ...baseStyle,
        left: position === 'left' ? '-36px' : 'auto',
        right: position === 'right' ? '-36px' : 'auto',
        top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        transformOrigin: 'center center',
      }}
    >
      <span style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
      {value}
      <span style={{ width: '20px', height: '1px', background: 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
    </div>
  );
}
