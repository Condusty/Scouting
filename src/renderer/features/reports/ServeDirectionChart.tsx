import React from 'react';
import type { ServeZoneFlow } from '@renderer/lib/stats-engine';

type ZoneId = 1 | 2 | 3 | 4 | 5 | 6;

const ZONE_POS: Record<ZoneId, [number, number]> = {
  4: [87, 120], 3: [220, 120], 2: [353, 120],
  5: [87, 235], 6: [220, 235], 1: [353, 235],
};

// Subzone offsets within a cell (half-width ~66, half-height ~57)
const SUBZONE_OFFSET: Record<string, [number, number]> = {
  a: [-33, -28], b: [33, -28],
  c: [-33,  28], d: [33,  28],
};

function zoneCenter(zone: ZoneId, subzone: string | null): [number, number] {
  const [x, y] = ZONE_POS[zone];
  if (!subzone || !SUBZONE_OFFSET[subzone]) return [x, y];
  const [dx, dy] = SUBZONE_OFFSET[subzone];
  return [x + dx, y + dy];
}

const ZONE_CELLS: { id: ZoneId; x: number; y: number; w: number; h: number }[] = [
  { id: 4, x: 20,  y: 60,  w: 133, h: 115 },
  { id: 3, x: 153, y: 60,  w: 134, h: 115 },
  { id: 2, x: 287, y: 60,  w: 133, h: 115 },
  { id: 5, x: 20,  y: 175, w: 133, h: 115 },
  { id: 6, x: 153, y: 175, w: 134, h: 115 },
  { id: 1, x: 287, y: 175, w: 133, h: 115 },
];

const ORIGIN: [number, number] = [220, 18];

function arrowColor(flow: ServeZoneFlow): 'red' | 'green' | 'gray' {
  if (flow.errorCount / flow.count > 0.5) return 'red';
  if (flow.excellentCount / flow.count > 0.5) return 'green';
  return 'gray';
}

export function ServeDirectionChart({ flows }: { flows: ServeZoneFlow[] }) {
  if (flows.length === 0)
    return <p className="py-6 text-center text-sm text-zinc-500">Keine Aufschlag-Daten.</p>;

  const maxCount = Math.max(...flows.map((f) => f.count));

  return (
    <svg viewBox="0 0 440 300" className="w-full">
      <defs>
        <marker id="ah-red"   markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" /></marker>
        <marker id="ah-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" /></marker>
        <marker id="ah-gray"  markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#71717a" /></marker>
      </defs>

      {/* court cells */}
      {ZONE_CELLS.map(({ id, x, y, w, h }) => (
        <g key={id}>
          <rect x={x} y={y} width={w} height={h} fill="#18181b" stroke="#3f3f46" strokeWidth="1" rx="2" />
          <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="22" fill="#3f3f46" fontWeight="bold">{id}</text>
        </g>
      ))}

      {/* net */}
      <line x1="20" y1="60" x2="420" y2="60" stroke="#52525b" strokeWidth="2.5" strokeDasharray="6 3" />
      <text x="220" y="52" textAnchor="middle" fontSize="9" fill="#52525b" letterSpacing="2">NETZ</text>

      {/* arrows */}
      {flows.map((flow, i) => {
        const endId = flow.endZone as ZoneId;
        if (!ZONE_POS[endId]) return null;
        const [x1, y1] = ORIGIN;
        const [x2, y2] = zoneCenter(endId, flow.endSubzone);
        const sw = 1.5 + (flow.count / maxCount) * 4.5;
        const c = arrowColor(flow);
        const colors = { red: '#ef4444', green: '#22c55e', gray: '#71717a' };
        const stroke = colors[c];
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2 - 10}
            stroke={stroke} strokeWidth={sw}
            markerEnd={`url(#ah-${c})`}
            opacity={0.75}
          >
            <title>{`Zone ${flow.endZone ?? '?'} — ${flow.count}× | # ${flow.excellentCount} | = ${flow.errorCount}`}</title>
          </line>
        );
      })}

      {/* origin */}
      <circle cx={ORIGIN[0]} cy={ORIGIN[1]} r="5" fill="#a1a1aa" />
      <text x={ORIGIN[0]} y={ORIGIN[1] - 9} textAnchor="middle" fontSize="9" fill="#71717a">Aufschlag</text>
    </svg>
  );
}
