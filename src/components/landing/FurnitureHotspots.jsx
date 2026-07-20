/**
 * FurnitureHotspots.jsx
 *
 * Overlays animated "selection ring" indicators on top of the living-room.png
 * screenshot. Each ring pulses into view one at a time, mimicking a user clicking
 * to select a placed furniture item, then cycles to the next piece endlessly.
 *
 * Positions are tuned to match the actual furniture in the screenshot:
 *  Queen Bed (left top), Single Bed (next to it), Chairs (top centre),
 *  Study Desk (top right), Sofa-style (bottom left area), Dining (bottom-left),
 *  TV Unit / Storage (right centre), Sofa (bottom right).
 *
 * Animation technique — pure CSS, zero JS timers:
 *  • Each hotspot shares one @keyframes ("hotspot-blink") whose duration equals
 *    the FULL cycle length (NUM_ITEMS × PER_ITEM_SECONDS).
 *  • Each hotspot gets a unique animation-delay = index × PER_ITEM_SECONDS.
 *  • The keyframe encodes "be visible only during the first PER_ITEM% of the cycle".
 *  • Because every hotspot loops with the same total duration but a different delay,
 *    exactly one ring is active at any given moment.
 */

import React from 'react';

/* ─── Hotspot positions (% of the image container) ──────────────────────── */
// The image is used as object-cover on the left half panel.
// Positions were measured from the screenshot (1536×640 viewport).
// The canvas area inside the screenshot occupies roughly x: 24%–80%, y: 15%–90%.
const HOTSPOTS = [
  { id: 'queen-bed-1', label: 'Queen Bed',     top: '27%', left: '34%' },
  { id: 'queen-bed-2', label: 'Queen Bed',     top: '27%', left: '45%' },
  { id: 'chair-1',     label: 'Chair',         top: '22%', left: '56%' },
  { id: 'chair-2',     label: 'Chair',         top: '22%', left: '62%' },
  { id: 'study-desk',  label: 'Study Desk',    top: '28%', left: '74%' },
  { id: 'dining',      label: 'Dining Table',  top: '65%', left: '36%' },
  { id: 'sofa',        label: '2-Seater Sofa', top: '80%', left: '72%' },
  { id: 'storage',     label: 'TV Unit',       top: '52%', left: '76%' },
];

/* ─── Timing ────────────────────────────────────────────────────────────── */
const PER_ITEM   = 2.0;                        // seconds each ring is spotlighted
const TOTAL      = HOTSPOTS.length * PER_ITEM; // full loop length in seconds
const ACTIVE_PCT = (1.4  / PER_ITEM) * 100;   // % of total each ring is "on"
const FADE_PCT   = (1.65 / PER_ITEM) * 100;   // % where it fully fades out

/* Build the keyframe string once so it's not recreated on every render */
const KEYFRAME_CSS = `
@keyframes hotspot-blink {
  /* 0 → appear */
  0%                       { opacity: 0; transform: scale(0.55); }
  4%                       { opacity: 1; transform: scale(1.08); }
  8%                       { opacity: 1; transform: scale(1);    }

  /* hold visible */
  ${ACTIVE_PCT.toFixed(2)}% { opacity: 1; transform: scale(1);   }

  /* fade & shrink away */
  ${FADE_PCT.toFixed(2)}%  { opacity: 0; transform: scale(1.15); }

  /* stay invisible for the rest of the cycle so only one ring shows */
  100%                     { opacity: 0; transform: scale(1.15); }
}

/* Outer "ripple" pulse that runs independently on a shorter loop */
@keyframes hotspot-ripple {
  0%   { transform: scale(1);    opacity: 0.7; }
  100% { transform: scale(2.0);  opacity: 0;   }
}
`;

export default function FurnitureHotspots() {
  return (
    <>
      <style>{KEYFRAME_CSS}</style>

      {HOTSPOTS.map((spot, idx) => {
        const delay = `${(idx * PER_ITEM).toFixed(2)}s`;

        return (
          <div
            key={spot.id}
            style={{
              position: 'absolute',
              top: spot.top,
              left: spot.left,
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
              /* Each hotspot uses the shared keyframe but fires at its own delay */
              animation: `hotspot-blink ${TOTAL}s cubic-bezier(0.34,1.3,0.64,1) ${delay} infinite`,
              opacity: 0,               // start hidden (keyframe takes over)
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {/* ── Outer ripple ring (independent, faster loop) ── */}
            <div
              style={{
                position: 'absolute',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid #1bc650',
                animation: `hotspot-ripple 1.1s ease-out ${delay} infinite`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />

            {/* ── Main selection ring ── */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2.5px solid #1bc650',
                boxShadow: '0 0 0 3px rgba(27,198,80,0.25), 0 0 14px rgba(27,198,80,0.5)',
                background: 'rgba(27,198,80,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(1px)',
              }}
            >
              {/* Green dot in the center */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#1bc650',
                  boxShadow: '0 0 6px #1bc650',
                }}
              />
            </div>

            {/* ── Label pill ── */}
            <div
              style={{
                background: 'rgba(0,0,0,0.72)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(27,198,80,0.5)',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {spot.label}
            </div>
          </div>
        );
      })}
    </>
  );
}
