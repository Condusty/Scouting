import React from 'react';
import { cn } from '@renderer/lib/cn';
import { Dialog } from '@renderer/components/ui/Dialog';
import { CourtZoneDiagram } from './CourtZoneDiagram';
import {
  SKILL_REFERENCE,
  SERVE_SUBTYPE_REFERENCE,
  SPECIAL_CODE_REFERENCE,
  EXAMPLE_CODE_REFERENCE,
  PLANNED_CODES_NOTE,
} from './notation-reference-data';
import { EFFECT_LABELS_GENERIC, EFFECT_LABELS_BY_SKILL } from './rally-preview';
import type { Effect } from '@shared/types';

export interface NotationReferenceDialogProps {
  open: boolean;
  onClose: () => void;
}

type TabId = 'skills' | 'effekte' | 'zonen' | 'sonder' | 'beispiele';

const TABS: { id: TabId; label: string }[] = [
  { id: 'skills', label: 'Skills' },
  { id: 'effekte', label: 'Effekte' },
  { id: 'zonen', label: 'Zonen' },
  { id: 'sonder', label: 'Sonder-Codes' },
  { id: 'beispiele', label: 'Beispiele' },
];

const EFFECTS: Effect[] = ['#', '+', '!', '-', '/', '='];
const EFFECT_SKILL_COLS = ['S', 'R', 'B', 'D'] as const;

function TabBar({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  return (
    <div className="flex gap-1 border-b border-zinc-800 pb-3">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            active === t.id
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function RefTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full text-xs">
      <tbody>{children}</tbody>
    </table>
  );
}

function TR({ cells, mono }: { cells: React.ReactNode[]; mono?: boolean }) {
  return (
    <tr className="border-b border-zinc-800 last:border-0">
      {cells.map((cell, i) => (
        <td
          key={i}
          className={cn(
            'py-1.5 pr-4 align-top text-zinc-300 last:pr-0',
            i === 0 && mono && 'font-mono font-semibold text-sky-300'
          )}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </p>
  );
}

function SkillsTab() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Skill-Codes</SectionLabel>
        <RefTable>
          {SKILL_REFERENCE.map((e) => (
            <TR key={e.code} cells={[e.code, e.label]} mono />
          ))}
        </RefTable>
      </div>
      <div>
        <SectionLabel>Aufschlag-Subtypen (nur nach S)</SectionLabel>
        <RefTable>
          {SERVE_SUBTYPE_REFERENCE.map((e) => (
            <TR key={e.code} cells={[e.code, e.label]} mono />
          ))}
        </RefTable>
      </div>
    </div>
  );
}

function EffekteTab() {
  return (
    <div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-700">
            {['Symbol', 'Generisch', 'S', 'R', 'B', 'D'].map((h) => (
              <th
                key={h}
                className="pb-1.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500 last:pr-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EFFECTS.map((fx) => {
            const generic = EFFECT_LABELS_GENERIC[fx];
            return (
              <tr key={fx} className="border-b border-zinc-800 last:border-0">
                <td className="py-1.5 pr-4 font-mono font-semibold text-sky-300">{fx}</td>
                <td className="py-1.5 pr-4 text-zinc-300">{generic}</td>
                {EFFECT_SKILL_COLS.map((sk) => {
                  const specific = EFFECT_LABELS_BY_SKILL[sk]?.[fx];
                  return (
                    <td
                      key={sk}
                      className={cn(
                        'py-1.5 pr-4 last:pr-0',
                        specific ? 'text-zinc-300' : 'italic text-zinc-500'
                      )}
                    >
                      {specific ?? generic}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[10px] text-zinc-500">
        Angriff (A) und Zuspiel (E) nutzen die generischen Labels — im Manual nicht dokumentiert.
      </p>
    </div>
  );
}

function ZonenTab() {
  return (
    <div className="flex gap-6">
      <CourtZoneDiagram className="w-40 shrink-0" />
      <div className="text-xs text-zinc-400">
        <p className="mb-2 font-medium text-zinc-200">Zonen 1–9</p>
        <p className="mb-3 leading-relaxed">
          Ziffern 1–9 bezeichnen Feldbereiche. Start- und optional Endzone werden direkt
          an den Skill-Code angehängt. Zwei Ziffern = Flugbahn (Start→Ziel).
        </p>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Beispiele</p>
        <p className="font-mono text-zinc-300">10SQ#15</p>
        <p className="mb-2 text-zinc-500">Aufschlag aus Zone 1, landet in Zone 5</p>
        <p className="font-mono text-zinc-300">7R#1</p>
        <p className="text-zinc-500">Annahme, Zone 1</p>
      </div>
    </div>
  );
}

function SonderTab() {
  return (
    <div>
      <RefTable>
        {SPECIAL_CODE_REFERENCE.map((e) => (
          <TR key={e.code} cells={[e.code, e.description]} mono />
        ))}
      </RefTable>
      <p className="mt-4 text-[10px] text-zinc-500">{PLANNED_CODES_NOTE}</p>
    </div>
  );
}

function BeispieleTab() {
  return (
    <RefTable>
      {EXAMPLE_CODE_REFERENCE.map((e) => (
        <TR key={e.code} cells={[e.code, e.description]} mono />
      ))}
    </RefTable>
  );
}

const TAB_CONTENT: Record<TabId, React.ReactNode> = {
  skills: <SkillsTab />,
  effekte: <EffekteTab />,
  zonen: <ZonenTab />,
  sonder: <SonderTab />,
  beispiele: <BeispieleTab />,
};

export function NotationReferenceDialog({ open, onClose }: NotationReferenceDialogProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>('skills');

  return (
    <Dialog open={open} onClose={onClose} title="Notation-Referenz" className="max-w-3xl">
      <div className="flex flex-col gap-4">
        <TabBar active={activeTab} onSelect={setActiveTab} />
        <div className="min-h-48">{TAB_CONTENT[activeTab]}</div>
      </div>
    </Dialog>
  );
}
