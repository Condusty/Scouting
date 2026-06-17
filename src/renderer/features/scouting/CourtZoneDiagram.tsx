import { cn } from '@renderer/lib/cn';

export interface CourtZoneDiagramProps {
  className?: string;
  showSubzones?: boolean;
}

// Display order matches the net-row-first layout used elsewhere (RotationDisplay):
// row 1 = net row (4-3-2), row 2 = mid row (7-8-9), row 3 = back row (5-6-1).
const ZONES = [4, 3, 2, 7, 8, 9, 5, 6, 1];

const SUBZONES = ['a', 'b', 'c', 'd'];

export function CourtZoneDiagram({ className, showSubzones }: CourtZoneDiagramProps) {
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
              'flex items-center justify-center border border-zinc-700 bg-zinc-800 text-sm font-semibold text-zinc-300',
              showSubzones ? 'p-0' : 'py-4',
              index < 3 && 'border-t-0',
              index % 3 === 0 && 'border-l-0',
              index % 3 === 2 && 'border-r-0',
              index >= 6 && 'border-b-0'
            )}
          >
            {showSubzones ? (
              <div className="flex w-full flex-col">
                <div className="py-0.5 text-center text-[10px] text-zinc-500">{zone}</div>
                <div className="grid grid-cols-2 border-t border-zinc-700">
                  {SUBZONES.map((sz) => (
                    <div
                      key={sz}
                      className="border border-zinc-700/50 px-1 py-1.5 text-center text-[10px] text-zinc-500"
                    >
                      {zone}{sz}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              zone
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
