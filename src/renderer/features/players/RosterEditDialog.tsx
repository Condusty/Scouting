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
