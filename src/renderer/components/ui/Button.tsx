import React from 'react';
import { cn } from '@renderer/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ' +
  'disabled:opacity-40 disabled:pointer-events-none select-none';

const variants: Record<Variant, string> = {
  primary:   'bg-sky-600 text-white hover:bg-sky-500 active:bg-sky-700',
  secondary: 'bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 active:bg-zinc-600',
  ghost:     'text-zinc-300 hover:bg-zinc-800 hover:text-white',
  danger:    'bg-red-600/90 text-white hover:bg-red-500 active:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function IconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors',
        'hover:bg-zinc-800 hover:text-white disabled:opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60',
        className,
      )}
      {...props}
    />
  );
}
