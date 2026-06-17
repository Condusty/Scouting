import { cn } from '@renderer/lib/cn';

interface SetFilterProps {
  sets: number[];
  active: number | null;
  onChange: (n: number | null) => void;
}

export function SetFilter({ sets, active, onChange }: SetFilterProps) {
  if (sets.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-zinc-500">Filter:</span>
      <button
        onClick={() => onChange(null)}
        className={cn(
          'no-drag rounded px-2.5 py-0.5 text-xs font-medium transition-colors',
          active === null
            ? 'bg-sky-600 text-white'
            : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200',
        )}
      >
        Alle
      </button>
      {sets.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'no-drag rounded px-2.5 py-0.5 text-xs font-medium transition-colors',
            active === s
              ? 'bg-sky-600 text-white'
              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200',
          )}
        >
          S{s}
        </button>
      ))}
    </div>
  );
}
