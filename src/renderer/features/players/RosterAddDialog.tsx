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
