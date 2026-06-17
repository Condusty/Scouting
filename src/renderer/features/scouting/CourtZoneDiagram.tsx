import { cn } from '@renderer/lib/cn';

export interface CourtZoneDiagramProps {
  className?: string;
}

// Display order matches the net-row-first layout used elsewhere (RotationDisplay):
// row 1 = net row (4-3-2), row 2 = mid row (7-8-9), row 3 = back row (5-6-1).
const ZONES = [4, 3, 2, 7, 8, 9, 5, 6, 1];

export function CourtZoneDiagram({ className }: CourtZoneDiagramProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-sky-400">Netz</span>
        <div className="h-0.5 flex-1 rounded bg-sky-500" />
      </div>
      <div className="grid grid-cols-3 overflow-hidden rounded border border-zinc-700 bg-zinc-900">
        {ZONES.map((zone, index) => (
          <div
            key={zone}
            className={cn(
              'flex items-center justify-center border border-zinc-700 bg-zinc-800 py-4 text-sm font-semibold text-zinc-300',
              index < 3 && 'border-t-0',
              index % 3 === 0 && 'border-l-0',
              index % 3 === 2 && 'border-r-0',
              index >= 6 && 'border-b-0'
            )}
          >
            {zone}
          </div>
        ))}
      </div>
    </div>
  );
}
