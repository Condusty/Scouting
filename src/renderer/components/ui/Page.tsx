import React from 'react';

export interface PageProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function Page({ title, actions, children }: PageProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
        <div className="flex items-center gap-2">{actions}</div>
      </header>
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
