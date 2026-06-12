import React from 'react';
import { cn } from '@renderer/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick }: DataTableProps<T>) {
  return (
    <div className="overflow-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn('px-3 py-2.5 text-left text-xs font-medium text-zinc-400', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-zinc-800/60 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-zinc-800/40',
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2.5 text-zinc-200', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
