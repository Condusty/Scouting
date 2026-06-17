# Team-Spieler-UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spieler-Tab wird team-bezogen (Team-Select + Roster-CRUD), LineupDialog bekommt Drag&Drop-Aufstellung statt Dropdowns.

**Architecture:** Datenvertrag vereinfachen (Referenzrotation entfällt), neue Roster-Dialoge (`RosterFields`, `RosterAddDialog`, `RosterEditDialog`) ersetzen `TeamRoster.tsx`, `PlayerList.tsx` wird team-scoped, `LineupDialog.tsx` neu mit nativem HTML5 Drag&Drop.

**Tech Stack:** React + TS (strict), Zustand, Tailwind, native HTML5 DnD (kein neues Package).

No TDD steps — keine `renderer/lib`-Logik betroffen (CLAUDE.md TDD-Pflicht gilt nur dort). Bestätigt: kein Test referenziert `LineupSelection`/`referenceRotation*`.

---

### Task 1: `LineupSelection` — Referenzrotation entfernen

**Modify:** `src/shared/types.ts:194-200`

```ts
export interface LineupSelection {
  homeLineup: number[];
  awayLineup: number[];
  servingTeam: TeamSide;
}
```

- [ ] Apply change
- [ ] Commit: `git add src/shared/types.ts && git commit -m "feat(scouting): drop reference rotation from LineupSelection"`

---

### Task 2: `scouting.store.ts` — `setLineup` hardcodes Rotation 1

**Modify:** `src/renderer/store/scouting.store.ts:110-132`

```ts
  setLineup: (selection) => {
    const { session } = get();
    if (session === null) return;

    set({
      session: {
        ...session,
        homeLineup: selection.homeLineup,
        awayLineup: selection.awayLineup,
        rotationHome: 1,
        rotationAway: 1,
        servingTeam: selection.servingTeam,
      },
      needsLineup: false,
      initialState: {
        homeScore: 0,
        awayScore: 0,
        rotationHome: 1,
        rotationAway: 1,
        servingTeam: selection.servingTeam,
      },
    });
  },
```

- [ ] Apply change
- [ ] Commit: `git add src/renderer/store/scouting.store.ts && git commit -m "feat(scouting): hardcode start rotation to 1 for new lineups"`

---

### Task 3: `RotationDisplay.tsx` simplify + `ScoutingView.tsx` Bugfix

**Modify:** `src/renderer/features/scouting/RotationDisplay.tsx` (full rewrite)

```tsx
import React from 'react';
import { cn } from '@renderer/lib/cn';

export interface RotationDisplayProps {
  homeLineup: number[]; // shirt numbers at positions 1-6, as entered at set start (rotation 1)
  awayLineup: number[];
  rotationHome: number; // current rotation, 1-6
  rotationAway: number;
}

const POSITIONS = [1, 2, 3, 4, 5, 6];

/**
 * Shirt number at court position `position` (1-6), given the set-start
 * `lineup` (rotation 1) and the team's `currentRotation`. Each rotation step
 * shifts every player by one position (P2->P1, ..., P1->P6).
 */
function shirtAtPosition(lineup: number[], currentRotation: number, position: number): number | null {
  if (lineup.length === 0) return null;
  const offset = ((currentRotation - 1) % 6 + 6) % 6;
  return lineup[(position - 1 + offset) % 6];
}

function RotationGrid({ label, lineup, rotation }: { label: string; lineup: number[]; rotation: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</h3>
      <div className="grid grid-cols-3 gap-1.5">
        {POSITIONS.map((pos) => {
          const shirt = shirtAtPosition(lineup, rotation, pos);
          const isCurrent = pos === 1;
          return (
            <div
              key={pos}
              className={cn(
                'flex flex-col items-center justify-center rounded border px-2 py-1.5',
                isCurrent ? 'border-sky-400 bg-sky-500/10' : 'border-zinc-700 bg-zinc-800/50'
              )}
            >
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">P{pos}</span>
              <span className={cn('text-lg font-bold tabular-nums', isCurrent ? 'text-sky-300' : 'text-zinc-200')}>
                {shirt ?? '–'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RotationDisplay({ homeLineup, awayLineup, rotationHome, rotationAway }: RotationDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-3">
      <RotationGrid label="Heim" lineup={homeLineup} rotation={rotationHome} />
      <RotationGrid label="Gast" lineup={awayLineup} rotation={rotationAway} />
    </div>
  );
}
```

**Modify:** `src/renderer/features/scouting/ScoutingView.tsx:53-54` — fix undefined identifiers (pre-existing bug):

```tsx
            homeTeamName={session.homeTeamName}
            awayTeamName={session.awayTeamName}
```

- [ ] Apply both changes
- [ ] Commit: `git add src/renderer/features/scouting/RotationDisplay.tsx src/renderer/features/scouting/ScoutingView.tsx && git commit -m "fix(scouting): simplify RotationDisplay, fix ScoreBoard team-name props"`

---

### Task 4: `LineupDialog.tsx` — Drag & Drop rewrite

**Modify:** `src/renderer/features/scouting/LineupDialog.tsx` (full rewrite)

```tsx
import React from 'react';
import type { TeamPlayer, LineupSelection, TeamSide } from '@shared/types';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Field } from '@renderer/components/ui/Field';
import { Button } from '@renderer/components/ui/Button';
import { cn } from '@renderer/lib/cn';

export interface LineupDialogProps {
  open: boolean;
  homeRoster: TeamPlayer[];
  awayRoster: TeamPlayer[];
  onConfirm: (selection: LineupSelection) => void;
  onCancel: () => void;
}

// Display order: net at top (4-3-2), back row below (5-6-1). Index = position - 1.
const GRID_POSITIONS = [4, 3, 2, 5, 6, 1];

function SetterBadge() {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500/20 px-1 text-[9px] font-semibold text-sky-300">
      S
    </span>
  );
}

function LiberoBadge() {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[9px] font-semibold text-amber-300">
      L
    </span>
  );
}

function LineupColumn({
  label,
  roster,
  lineup,
  onPlace,
  onClear,
}: {
  label: string;
  roster: TeamPlayer[];
  lineup: (number | null)[];
  onPlace: (position: number, shirt: number) => void;
  onClear: (position: number) => void;
}) {
  const placed = new Set(lineup.filter((v): v is number => v !== null));
  const bench = roster.filter((p) => !placed.has(p.shirt_number));

  const handleDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    const shirt = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(shirt)) onPlace(position, shirt);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-zinc-200">{label}</h3>
      <div>
        <span className="mb-1.5 block text-xs font-medium text-zinc-400">Kader</span>
        <div className="flex min-h-9 flex-wrap gap-1.5">
          {bench.map((p) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(p.shirt_number))}
              className="flex cursor-grab items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 active:cursor-grabbing"
            >
              <span className="font-semibold">#{p.shirt_number}</span> {p.last_name}
              {p.is_setter && <SetterBadge />}
              {p.is_libero && <LiberoBadge />}
            </div>
          ))}
          {bench.length === 0 && <span className="text-xs text-zinc-500">—</span>}
        </div>
      </div>
      <div>
        <span className="mb-1.5 block text-center text-[10px] uppercase tracking-wide text-zinc-500">
          Netz ────────────
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {GRID_POSITIONS.map((pos) => {
            const shirt = lineup[pos - 1];
            const player = roster.find((p) => p.shirt_number === shirt);
            return (
              <div
                key={pos}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, pos)}
                onClick={() => player && onClear(pos)}
                className={cn(
                  'flex h-16 flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-center',
                  player
                    ? 'cursor-pointer border-sky-500/60 bg-sky-500/10'
                    : 'border-dashed border-zinc-700 bg-zinc-800/40'
                )}
              >
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">Position {pos}</span>
                {player ? (
                  <span className="text-sm font-semibold text-zinc-100">
                    #{player.shirt_number} {player.last_name}
                    {player.is_setter && <SetterBadge />}
                    {player.is_libero && <LiberoBadge />}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">leer</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LineupDialog({ open, homeRoster, awayRoster, onConfirm, onCancel }: LineupDialogProps) {
  const [homeLineup, setHomeLineup] = React.useState<(number | null)[]>(Array(6).fill(null));
  const [awayLineup, setAwayLineup] = React.useState<(number | null)[]>(Array(6).fill(null));
  const [servingTeam, setServingTeam] = React.useState<TeamSide | null>(null);

  const placeAt =
    (setLineup: React.Dispatch<React.SetStateAction<(number | null)[]>>) =>
    (position: number, shirt: number) => {
      setLineup((prev) => {
        const next = prev.map((v) => (v === shirt ? null : v));
        next[position - 1] = shirt;
        return next;
      });
    };

  const clearAt =
    (setLineup: React.Dispatch<React.SetStateAction<(number | null)[]>>) => (position: number) => {
      setLineup((prev) => {
        const next = [...prev];
        next[position - 1] = null;
        return next;
      });
    };

  const isFull = (lineup: (number | null)[]) => lineup.every((v) => v !== null);
  const isValid = isFull(homeLineup) && isFull(awayLineup) && servingTeam !== null;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      homeLineup: homeLineup as number[],
      awayLineup: awayLineup as number[],
      servingTeam: servingTeam!,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Aufstellung"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!isValid}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <LineupColumn label="Heim" roster={homeRoster} lineup={homeLineup} onPlace={placeAt(setHomeLineup)} onClear={clearAt(setHomeLineup)} />
          <LineupColumn label="Gast" roster={awayRoster} lineup={awayLineup} onPlace={placeAt(setAwayLineup)} onClear={clearAt(setAwayLineup)} />
        </div>
        <Field label="Aufschlag">
          <div className="flex gap-2">
            <Button variant={servingTeam === 'home' ? 'primary' : 'secondary'} onClick={() => setServingTeam('home')}>
              Aufschlag Heim
            </Button>
            <Button variant={servingTeam === 'away' ? 'primary' : 'secondary'} onClick={() => setServingTeam('away')}>
              Aufschlag Gast
            </Button>
          </div>
        </Field>
      </div>
    </Dialog>
  );
}
```

- [ ] Apply rewrite
- [ ] Commit: `git add src/renderer/features/scouting/LineupDialog.tsx && git commit -m "feat(scouting): drag-and-drop lineup grid replaces dropdowns"`

---

### Task 5: `RosterFields.tsx` (new) — shared shirt/libero/setter inputs

**Create:** `src/renderer/features/players/RosterFields.tsx`

```tsx
import React from 'react';
import type { TeamPlayer } from '@shared/types';
import { Field, Input } from '@renderer/components/ui/Field';

export interface RosterFieldsValues {
  shirt_number: number | null;
  is_libero: boolean;
  is_setter: boolean;
}

export function emptyRosterFields(): RosterFieldsValues {
  return { shirt_number: null, is_libero: false, is_setter: false };
}

export function rosterFieldsFromTeamPlayer(tp: TeamPlayer): RosterFieldsValues {
  return { shirt_number: tp.shirt_number, is_libero: tp.is_libero, is_setter: tp.is_setter };
}

export function RosterFields({
  values,
  onChange,
}: {
  values: RosterFieldsValues;
  onChange: (v: RosterFieldsValues) => void;
}) {
  const set = (patch: Partial<RosterFieldsValues>) => onChange({ ...values, ...patch });
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Trikotnummer" required>
        <Input
          type="number"
          value={values.shirt_number ?? ''}
          onChange={(e) => set({ shirt_number: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </Field>
      <Field label="Libero">
        <label className="flex h-9 items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={values.is_libero} onChange={(e) => set({ is_libero: e.target.checked })} className="h-4 w-4 accent-sky-500" />
          Libero
        </label>
      </Field>
      <Field label="Setter">
        <label className="flex h-9 items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" checked={values.is_setter} onChange={(e) => set({ is_setter: e.target.checked })} className="h-4 w-4 accent-sky-500" />
          Setter
        </label>
      </Field>
    </div>
  );
}
```

- [ ] Create file
- [ ] Commit: `git add src/renderer/features/players/RosterFields.tsx && git commit -m "feat(players): add shared roster fields component"`

---

### Task 6: `RosterAddDialog.tsx` (new) — "Neu anlegen" / "Vorhandenen hinzufügen"

**Create:** `src/renderer/features/players/RosterAddDialog.tsx`

```tsx
import React from 'react';
import type { Player, TeamPlayer } from '@shared/types';
import { usePlayersStore } from '@renderer/store/players.store';
import { useRosterStore } from '@renderer/store/roster.store';
import { playersApi } from '@renderer/api/players.api';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Button } from '@renderer/components/ui/Button';
import { Field, Select } from '@renderer/components/ui/Field';
import { PlayerForm, emptyPlayer, type PlayerFormValues } from './PlayerForm';
import { RosterFields, emptyRosterFields, type RosterFieldsValues } from './RosterFields';

export interface RosterAddDialogProps {
  open: boolean;
  teamId: number;
  roster: TeamPlayer[];
  onClose: () => void;
}

type Mode = 'new' | 'existing';

export function RosterAddDialog({ open, teamId, roster, onClose }: RosterAddDialogProps) {
  const { players, load: loadPlayers } = usePlayersStore();
  const { add: addToRoster } = useRosterStore();
  const [mode, setMode] = React.useState<Mode>('new');
  const [playerForm, setPlayerForm] = React.useState<PlayerFormValues>(emptyPlayer());
  const [rosterFields, setRosterFields] = React.useState<RosterFieldsValues>(emptyRosterFields());
  const [existingId, setExistingId] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) loadPlayers();
  }, [open, loadPlayers]);

  React.useEffect(() => {
    if (!open) {
      setMode('new');
      setPlayerForm(emptyPlayer());
      setRosterFields(emptyRosterFields());
      setExistingId('');
      setLocalError(null);
    }
  }, [open]);

  const rosterIds = new Set(roster.map((p) => p.id));
  const available = players.filter((p) => !rosterIds.has(p.id));

  const isNewValid = !!(playerForm.first_name && playerForm.last_name && playerForm.code && rosterFields.shirt_number !== null);
  const isExistingValid = existingId !== '' && rosterFields.shirt_number !== null;
  const isValid = mode === 'new' ? isNewValid : isExistingValid;

  const save = async () => {
    setLocalError(null);
    if (mode === 'new') {
      let created: Player;
      try {
        created = await playersApi.create(playerForm);
      } catch (e) {
        setLocalError((e as Error).message);
        return;
      }
      await loadPlayers();
      await addToRoster({
        team_id: teamId,
        player_id: created.id,
        shirt_number: rosterFields.shirt_number!,
        is_libero: rosterFields.is_libero,
        is_setter: rosterFields.is_setter,
      });
      const rosterError = useRosterStore.getState().error;
      if (rosterError) {
        setLocalError(`Spieler „${created.last_name}, ${created.first_name}" wurde angelegt, aber nicht zum Kader hinzugefügt: ${rosterError}`);
        return;
      }
    } else {
      await addToRoster({
        team_id: teamId,
        player_id: Number(existingId),
        shirt_number: rosterFields.shirt_number!,
        is_libero: rosterFields.is_libero,
        is_setter: rosterFields.is_setter,
      });
      const rosterError = useRosterStore.getState().error;
      if (rosterError) {
        setLocalError(rosterError);
        return;
      }
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Spieler hinzufügen"
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={save} disabled={!isValid}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button variant={mode === 'new' ? 'primary' : 'secondary'} onClick={() => setMode('new')} className="flex-1">
            Neu anlegen
          </Button>
          <Button variant={mode === 'existing' ? 'primary' : 'secondary'} onClick={() => setMode('existing')} className="flex-1">
            Vorhandenen hinzufügen
          </Button>
        </div>

        {localError && <p className="text-sm text-red-400">{localError}</p>}

        {mode === 'new' ? (
          <PlayerForm values={playerForm} onChange={setPlayerForm} />
        ) : (
          <Field label="Spieler" required>
            <Select value={existingId} onChange={(e) => setExistingId(e.target.value)}>
              <option value="">Auswählen…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.last_name}, {p.first_name} ({p.code})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <RosterFields values={rosterFields} onChange={setRosterFields} />
      </div>
    </Dialog>
  );
}
```

- [ ] Create file
- [ ] Commit: `git add src/renderer/features/players/RosterAddDialog.tsx && git commit -m "feat(players): add roster add dialog (new/existing player)"`

---

### Task 7: `RosterEditDialog.tsx` (new) — Edit + entfernen/löschen

**Create:** `src/renderer/features/players/RosterEditDialog.tsx`

```tsx
import React from 'react';
import type { TeamPlayer } from '@shared/types';
import { usePlayersStore } from '@renderer/store/players.store';
import { useRosterStore } from '@renderer/store/roster.store';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Button } from '@renderer/components/ui/Button';
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog';
import { PlayerForm, playerToForm, type PlayerFormValues } from './PlayerForm';
import { RosterFields, rosterFieldsFromTeamPlayer, type RosterFieldsValues } from './RosterFields';

export interface RosterEditDialogProps {
  open: boolean;
  teamId: number;
  player: TeamPlayer | null;
  onClose: () => void;
}

export function RosterEditDialog({ open, teamId, player, onClose }: RosterEditDialogProps) {
  const { update: updatePlayer, remove: removePlayer, error: playersError } = usePlayersStore();
  const { update: updateRoster, remove: removeFromRoster, error: rosterError } = useRosterStore();
  const [playerForm, setPlayerForm] = React.useState<PlayerFormValues | null>(null);
  const [rosterFields, setRosterFields] = React.useState<RosterFieldsValues | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (player) {
      setPlayerForm(playerToForm(player));
      setRosterFields(rosterFieldsFromTeamPlayer(player));
    }
  }, [player]);

  if (!open || !player || !playerForm || !rosterFields) return null;

  const isValid = !!(playerForm.first_name && playerForm.last_name && playerForm.code && rosterFields.shirt_number !== null);

  const save = async () => {
    await updatePlayer(player.id, playerForm);
    await updateRoster(teamId, player.id, {
      shirt_number: rosterFields.shirt_number!,
      is_libero: rosterFields.is_libero,
      is_setter: rosterFields.is_setter,
    });
    if (!usePlayersStore.getState().error && !useRosterStore.getState().error) onClose();
  };

  const removeFromRosterOnly = async () => {
    await removeFromRoster(teamId, player.id);
    if (!useRosterStore.getState().error) onClose();
  };

  const deletePlayer = async () => {
    await removePlayer(player.id);
    setConfirmDelete(false);
    if (!usePlayersStore.getState().error) onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Spieler bearbeiten"
        className="max-w-xl"
        footer={
          <>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Komplett löschen
            </Button>
            <Button variant="secondary" onClick={removeFromRosterOnly}>
              Aus Kader entfernen
            </Button>
            <Button onClick={save} disabled={!isValid}>
              Speichern
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {(playersError || rosterError) && <p className="text-sm text-red-400">{playersError ?? rosterError}</p>}
          <PlayerForm values={playerForm} onChange={setPlayerForm} />
          <RosterFields values={rosterFields} onChange={setRosterFields} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        title="Spieler komplett löschen"
        description={`Spieler „${player.last_name}, ${player.first_name}" wirklich vollständig löschen? Betrifft alle Teams, nicht rückgängig.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deletePlayer}
      />
    </>
  );
}
```

- [ ] Create file
- [ ] Commit: `git add src/renderer/features/players/RosterEditDialog.tsx && git commit -m "feat(players): add roster edit dialog with remove/delete actions"`

---

### Task 8: `PlayerList.tsx` — team-bezogen

**Modify:** `src/renderer/features/players/PlayerList.tsx` (full rewrite)

```tsx
import React from 'react';
import { Trash2, Users2 } from 'lucide-react';
import type { TeamPlayer } from '@shared/types';
import { useTeamsStore } from '@renderer/store/teams.store';
import { useRosterStore } from '@renderer/store/roster.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Field, Select } from '@renderer/components/ui/Field';
import { RosterAddDialog } from './RosterAddDialog';
import { RosterEditDialog } from './RosterEditDialog';

export interface PlayerListProps {
  teamId?: number;
}

export function PlayerList({ teamId }: PlayerListProps) {
  const { teams, load: loadTeams } = useTeamsStore();
  const { roster, load: loadRoster, error } = useRosterStore();
  const [selectedTeamId, setSelectedTeamId] = React.useState<number | null>(teamId ?? null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editPlayer, setEditPlayer] = React.useState<TeamPlayer | null>(null);

  React.useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  React.useEffect(() => {
    if (selectedTeamId === null && teams.length > 0) {
      setSelectedTeamId(teamId !== undefined && teams.some((t) => t.id === teamId) ? teamId : teams[0].id);
    }
  }, [teams, teamId, selectedTeamId]);

  React.useEffect(() => {
    if (selectedTeamId !== null) loadRoster(selectedTeamId);
  }, [selectedTeamId, loadRoster]);

  return (
    <Page
      title="Spieler"
      actions={
        selectedTeamId !== null ? (
          <Button onClick={() => setAddOpen(true)}>+ Spieler</Button>
        ) : undefined
      }
    >
      {teams.length === 0 ? (
        <EmptyState icon={<Users2 size={32} />} title="Noch keine Teams" description="Lege zuerst ein Team an." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="max-w-xs">
            <Field label="Team">
              <Select value={selectedTeamId ?? ''} onChange={(e) => setSelectedTeamId(Number(e.target.value))}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {roster.length === 0 ? (
            <EmptyState
              icon={<Users2 size={32} />}
              title="Noch keine Spieler im Kader"
              description="Füge Spieler zu diesem Team hinzu."
              actionLabel="+ Spieler"
              onAction={() => setAddOpen(true)}
            />
          ) : (
            <DataTable<TeamPlayer>
              rows={roster}
              rowKey={(p) => p.id}
              onRowClick={setEditPlayer}
              columns={[
                { key: 'nr', header: 'Nr.', className: 'w-12', render: (p) => p.shirt_number },
                { key: 'name', header: 'Name', render: (p) => <span className="font-medium">{p.last_name}, {p.first_name}</span> },
                { key: 'code', header: 'Code', render: (p) => p.code },
                { key: 'pos', header: 'Position', render: (p) => p.position ?? '—' },
                { key: 'height', header: 'Größe', render: (p) => (p.height_cm ? `${p.height_cm} cm` : '—') },
                { key: 'weight', header: 'Gewicht', render: (p) => (p.weight_kg ? `${p.weight_kg} kg` : '—') },
                { key: 'reach', header: 'Reichweite', render: (p) => (p.reach_cm ? `${p.reach_cm} cm` : '—') },
                { key: 'libero', header: 'Libero', className: 'text-center w-16', render: (p) => (p.is_libero ? '✓' : '') },
                { key: 'setter', header: 'Setter', className: 'text-center w-16', render: (p) => (p.is_setter ? '✓' : '') },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-12 text-right',
                  render: (p) => (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedTeamId !== null) useRosterStore.getState().remove(selectedTeamId, p.id);
                      }}
                      aria-label="Aus Kader entfernen"
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}

      {selectedTeamId !== null && (
        <>
          <RosterAddDialog open={addOpen} teamId={selectedTeamId} roster={roster} onClose={() => setAddOpen(false)} />
          <RosterEditDialog open={editPlayer !== null} teamId={selectedTeamId} player={editPlayer} onClose={() => setEditPlayer(null)} />
        </>
      )}
    </Page>
  );
}
```

- [ ] Apply rewrite
- [ ] Commit: `git add src/renderer/features/players/PlayerList.tsx && git commit -m "feat(players): team-scoped player list with roster CRUD"`

---

### Task 9: `TabContent.tsx` — `teamId`-Param durchreichen

**Modify:** `src/renderer/features/layout/TabContent.tsx:25-26`

```tsx
    case 'player':
      return <PlayerList teamId={active.params.teamId as number | undefined} />;
```

- [ ] Apply change
- [ ] Commit: `git add src/renderer/features/layout/TabContent.tsx && git commit -m "feat(players): pass teamId tab param to PlayerList"`

---

### Task 10: `TeamList.tsx` — "Kader" öffnet Spieler-Tab; `TeamRoster.tsx` entfällt

**Modify:** `src/renderer/features/teams/TeamList.tsx` (full rewrite)

```tsx
import React from 'react';
import { Users, Plus, Trash2, ListChecks } from 'lucide-react';
import type { TeamRecord } from '@shared/types';
import { useTeamsStore } from '@renderer/store/teams.store';
import { useUIStore } from '@renderer/store/ui.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog';
import { TeamForm, emptyTeam, teamToForm, type TeamFormValues } from './TeamForm';

export function TeamList() {
  const { teams, load, create, update, remove, error } = useTeamsStore();
  const { openTab } = useUIStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<TeamFormValues>(emptyTeam());
  const [deleteTarget, setDeleteTarget] = React.useState<TeamRecord | null>(null);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyTeam());
    setOpen(true);
  };
  const openEdit = (t: TeamRecord) => {
    setEditId(t.id);
    setForm(teamToForm(t));
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  return (
    <Page
      title="Teams"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neues Team
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {teams.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="Noch keine Teams"
          description="Lege ein Team an und stelle anschließend den Kader auf."
          actionLabel="Neues Team"
          onAction={openCreate}
        />
      ) : (
        <DataTable<TeamRecord>
          rows={teams}
          rowKey={(t) => t.id}
          onRowClick={openEdit}
          columns={[
            { key: 'name', header: 'Name', render: (t) => <span className="font-medium">{t.name}</span> },
            { key: 'code', header: 'Code', render: (t) => t.code },
            { key: 'coach', header: 'Trainer', render: (t) => t.coach ?? '—' },
            {
              key: 'actions',
              header: '',
              className: 'w-24 text-right',
              render: (t) => (
                <div className="flex justify-end gap-1">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      openTab({ type: 'player', label: 'Spieler', params: { teamId: t.id } });
                    }}
                    aria-label="Kader"
                  >
                    <ListChecks size={15} />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(t);
                    }}
                    aria-label="Löschen"
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editId == null ? 'Neues Team' : 'Team bearbeiten'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={!form.name || !form.code}>
              Speichern
            </Button>
          </>
        }
      >
        <TeamForm values={form} onChange={setForm} />
      </Dialog>
      <ConfirmDialog
        open={deleteTarget != null}
        title="Team löschen"
        description={`Team „${deleteTarget?.name}" wirklich löschen?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </Page>
  );
}
```

**Delete:** `src/renderer/features/teams/TeamRoster.tsx`

- [ ] Apply rewrite, delete `TeamRoster.tsx`
- [ ] Commit: `git add -A src/renderer/features/teams && git commit -m "feat(teams): Kader button opens team-scoped player tab, remove TeamRoster dialog"`

---

### Task 11: Verifikation

- [ ] `npx tsc --noEmit -p tsconfig.json` → keine Fehler
- [ ] `npm test` → grün
- [ ] `npm run dev` → manuell: Spieler-Tab Team-Wechsel, „+ Spieler" beide Modi, Edit (Speichern/Aus Kader entfernen/Komplett löschen inkl. FK-Fehler), TeamList „Kader"-Button öffnet Spieler-Tab mit Team vorausgewählt, LineupDialog Drag&Drop beide Teams + Klick-Entfernen + Validierung, RotationDisplay nach Lineup-Bestätigung korrekt

---

## Self-Review

- **Spec coverage:** Teil A (2.1–2.4) → Tasks 5–10; Teil B (3.1–3.4) → Tasks 1–4. Leere Zustände (2.2) abgedeckt in Task 8. DoD-Punkte alle durch Tasks 8/10/4/11 erfüllt.
- **Placeholder scan:** keine TBD/TODO, alle Code-Blöcke vollständig.
- **Type consistency:** `LineupSelection` (Task 1) ↔ `LineupDialog.onConfirm` (Task 4) ↔ `setLineup` (Task 2) — Felder `homeLineup/awayLineup/servingTeam` durchgängig. `RosterFieldsValues`/`emptyRosterFields`/`rosterFieldsFromTeamPlayer` (Task 5) konsistent in Tasks 6+7 importiert. `PlayerListProps.teamId` (Task 8) ↔ `TabContent` Aufruf (Task 9) ↔ `openTab({ params: { teamId } })` (Task 10).
