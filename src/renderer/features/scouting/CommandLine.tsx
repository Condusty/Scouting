import React, { useRef } from 'react';
import type { Effect, ParsedAction, ParsedRally, ParsedSub, Skill, TeamSide } from '@shared/types';
import { Input } from '@renderer/components/ui/Field';
import { Button } from '@renderer/components/ui/Button';
import { useScoutingStore } from '@renderer/store/scouting.store';
import { ValidationErrors } from '@renderer/features/scouting/ValidationErrors';

const SKILL_LABELS: Record<Skill, string> = {
  S: 'Aufschlag',
  R: 'Annahme',
  A: 'Angriff',
  B: 'Block',
  D: 'Abwehr',
  E: 'Zuspiel',
  F: 'Freeball',
};

const EFFECT_LABELS: Record<Effect, string> = {
  '#': 'perfekt',
  '+': 'positiv',
  '!': 'neutral',
  '-': 'negativ',
  '/': 'Overpass',
  '=': 'Fehler',
};

const TEAM_LABELS: Record<TeamSide, string> = {
  home: 'Heim',
  away: 'Gast',
};

function describeAction(action: ParsedAction): string {
  const parts = [`${TEAM_LABELS[action.team]} #${action.playerNumber}`, SKILL_LABELS[action.skill]];

  if (action.effect !== null) {
    parts.push(`(${EFFECT_LABELS[action.effect]})`);
  }

  if (action.startZone !== null) {
    const zone =
      action.endZone !== null ? `Zone ${action.startZone}→${action.endZone}` : `Zone ${action.startZone}`;
    parts.push(zone);
  }

  return parts.join(' ');
}

function describeSub(sub: ParsedSub): string {
  return `${TEAM_LABELS[sub.team]} Wechsel: #${sub.out} → #${sub.in}`;
}

function describePendingRally(rally: ParsedRally): string[] {
  const parts: string[] = [];

  for (const action of rally.actions) {
    parts.push(describeAction(action));
  }

  for (const sub of rally.subs) {
    parts.push(describeSub(sub));
  }

  for (const timeout of rally.timeouts) {
    parts.push(`${TEAM_LABELS[timeout.team]} Auszeit`);
  }

  if (rally.pointTeam !== null) {
    parts.push(`Punkt ${TEAM_LABELS[rally.pointTeam]}`);
  }

  if (rally.rotationSet !== null) {
    parts.push(`Rotation → ${rally.rotationSet}`);
  }

  if (rally.sideSwitch !== null) {
    parts.push(`Seitenwechsel → Seite ${rally.sideSwitch}`);
  }

  return parts;
}

export function CommandLine() {
  const currentInput = useScoutingStore((s) => s.currentInput);
  const pendingRally = useScoutingStore((s) => s.pendingRally);
  const validationErrors = useScoutingStore((s) => s.validationErrors);
  const rallies = useScoutingStore((s) => s.rallies);
  const error = useScoutingStore((s) => s.error);
  const setInput = useScoutingStore((s) => s.setInput);
  const submitCode = useScoutingStore((s) => s.submitCode);
  const undoLastRally = useScoutingStore((s) => s.undoLastRally);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      await submitCode();
      inputRef.current?.focus();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      await undoLastRally();
    }
  };

  const previewParts = pendingRally !== null ? describePendingRally(pendingRally) : [];
  const showNoMatch = currentInput.length > 0 && previewParts.length === 0;

  return (
    <div className="flex flex-col gap-1.5 border-t border-zinc-700 bg-zinc-900 px-3 py-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={currentInput}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="z.B. 14A#5.a3B="
          className="font-mono"
          autoFocus
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void undoLastRally()}
          disabled={rallies.length === 0}
        >
          Rückgängig
        </Button>
      </div>

      {currentInput.length > 0 && (
        <div className="px-1 text-xs text-zinc-400">
          {showNoMatch ? (
            <span className="text-zinc-500">Kein gültiger Code</span>
          ) : (
            <span>{previewParts.join(' · ')}</span>
          )}
        </div>
      )}

      <ValidationErrors errors={validationErrors} />

      {error !== null && <div className="px-1 text-xs text-red-400">{error}</div>}
    </div>
  );
}
