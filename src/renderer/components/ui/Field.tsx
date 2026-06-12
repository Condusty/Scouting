import React from 'react';
import { cn } from '@renderer/lib/cn';

const controlBase =
  'w-full h-9 rounded-lg bg-zinc-900 border border-zinc-700 px-3 text-sm text-zinc-100 ' +
  'placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 ' +
  'focus:ring-sky-500/60 disabled:opacity-40';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, className)} {...props} />;
  },
);

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'h-auto min-h-[72px] resize-y py-2', className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, required, error, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-400">
        {label}
        {required && <span className="text-sky-400"> *</span>}
      </span>
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}
