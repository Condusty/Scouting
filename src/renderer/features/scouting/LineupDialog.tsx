import React from 'react';
import type { TeamPlayer, LineupSelection, TeamSide } from '@shared/types';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Field, Select } from '@renderer/components/ui/Field';
import { Button } from '@renderer/components/ui/Button';

export interface LineupDialogProps {
  open: boolean;
  homeRoster: TeamPlayer[];
  awayRoster: TeamPlayer[];
  onConfirm: (selection: LineupSelection) => void;
  onCancel: () => void;
}

const POSITIONS = [1, 2, 3, 4, 5, 6];
const ROTATIONS = [1, 2, 3, 4, 5, 6];

function SetterBadge() {
  return (
    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500/20 px-1.5 text-[10px] font-semibold text-sky-300">
      S
    </span>
  );
}

function LineupColumn({
  label,
  roster,
  lineup,
  onChangeLineup,
  rotation,
  onChangeRotation,
}: {
  label: string;
  roster: TeamPlayer[];
  lineup: string[];
  onChangeLineup: (lineup: string[]) => void;
  rotation: number;
  onChangeRotation: (rotation: number) => void;
}) {
  const setPosition = (index: number, value: string) => {
    const next = [...lineup];
    next[index] = value;
    onChangeLineup(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-zinc-200">{label}</h3>
      {POSITIONS.map((pos, idx) => {
        const selectedShirt = lineup[idx];
        const selectedPlayer = roster.find((p) => String(p.shirt_number) === selectedShirt);
        return (
          <Field key={pos} label={`Position ${pos}`}>
            <div className="flex items-center gap-2">
              <Select value={selectedShirt} onChange={(e) => setPosition(idx, e.target.value)}>
                <option value="">–</option>
                {roster.map((p) => (
                  <option key={p.id} value={p.shirt_number}>
                    {`#${p.shirt_number} ${p.first_name} ${p.last_name}`}
                  </option>
                ))}
              </Select>
              {selectedPlayer?.is_setter && <SetterBadge />}
            </div>
          </Field>
        );
      })}
      <Field label="Startrotation">
        <Select value={rotation} onChange={(e) => onChangeRotation(Number(e.target.value))}>
          {ROTATIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

export function LineupDialog({ open, homeRoster, awayRoster, onConfirm, onCancel }: LineupDialogProps) {
  const [homeLineup, setHomeLineup] = React.useState<string[]>(['', '', '', '', '', '']);
  const [awayLineup, setAwayLineup] = React.useState<string[]>(['', '', '', '', '', '']);
  const [rotationHome, setRotationHome] = React.useState(1);
  const [rotationAway, setRotationAway] = React.useState(1);
  const [servingTeam, setServingTeam] = React.useState<TeamSide | null>(null);

  const isLineupValid = (lineup: string[]) =>
    lineup.length === 6 && lineup.every((v) => v !== '') && new Set(lineup).size === 6;

  const isValid = isLineupValid(homeLineup) && isLineupValid(awayLineup) && servingTeam !== null;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      homeLineup: homeLineup.map(Number),
      awayLineup: awayLineup.map(Number),
      rotationHome,
      rotationAway,
      servingTeam: servingTeam!,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Aufstellung"
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
          <LineupColumn
            label="Heim"
            roster={homeRoster}
            lineup={homeLineup}
            onChangeLineup={setHomeLineup}
            rotation={rotationHome}
            onChangeRotation={setRotationHome}
          />
          <LineupColumn
            label="Gast"
            roster={awayRoster}
            lineup={awayLineup}
            onChangeLineup={setAwayLineup}
            rotation={rotationAway}
            onChangeRotation={setRotationAway}
          />
        </div>
        <Field label="Aufschlag">
          <div className="flex gap-2">
            <Button
              variant={servingTeam === 'home' ? 'primary' : 'secondary'}
              onClick={() => setServingTeam('home')}
            >
              Aufschlag Heim
            </Button>
            <Button
              variant={servingTeam === 'away' ? 'primary' : 'secondary'}
              onClick={() => setServingTeam('away')}
            >
              Aufschlag Gast
            </Button>
          </div>
        </Field>
      </div>
    </Dialog>
  );
}
