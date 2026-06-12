import React from 'react';
import { Trash2 } from 'lucide-react';
import type { TeamRecord } from '@shared/types';
import { useRosterStore } from '@renderer/store/roster.store';
import { usePlayersStore } from '@renderer/store/players.store';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { Field, Input, Select } from '@renderer/components/ui/Field';

export function TeamRoster({ team, onClose }: { team: TeamRecord; onClose: () => void }) {
  const { roster, load, add, update, remove, error } = useRosterStore();
  const { players, load: loadPlayers } = usePlayersStore();
  const [playerId, setPlayerId] = React.useState<string>('');
  const [shirt, setShirt] = React.useState<string>('');

  React.useEffect(() => {
    load(team.id);
    loadPlayers();
  }, [team.id, load, loadPlayers]);

  const rosterIds = new Set(roster.map((r) => r.id));
  const available = players.filter((p) => !rosterIds.has(p.id));

  const addPlayer = async () => {
    if (!playerId || !shirt) return;
    await add({
      team_id: team.id,
      player_id: Number(playerId),
      shirt_number: Number(shirt),
      is_libero: false,
      is_setter: false,
    });
    setPlayerId('');
    setShirt('');
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Kader — ${team.name}`}
      className="max-w-2xl"
      footer={<Button onClick={onClose}>Fertig</Button>}
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="mb-4 grid grid-cols-[1fr_120px_auto] items-end gap-2">
        <Field label="Spieler">
          <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            <option value="">Auswählen…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.last_name}, {p.first_name} ({p.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nr.">
          <Input type="number" value={shirt} onChange={(e) => setShirt(e.target.value)} />
        </Field>
        <Button onClick={addPlayer} disabled={!playerId || !shirt}>
          Hinzufügen
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 text-left text-xs text-zinc-400">
              <th className="px-3 py-2">Nr.</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-center">Libero</th>
              <th className="px-3 py-2 text-center">Setter</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {roster.map((p) => (
              <tr key={p.id} className="border-b border-zinc-800/60 last:border-0">
                <td className="px-3 py-2 font-medium text-zinc-100">{p.shirt_number}</td>
                <td className="px-3 py-2 text-zinc-200">
                  {p.last_name}, {p.first_name}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={p.is_libero}
                    onChange={(e) => update(team.id, p.id, { is_libero: e.target.checked })}
                    className="accent-sky-500"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={p.is_setter}
                    onChange={(e) => update(team.id, p.id, { is_setter: e.target.checked })}
                    className="accent-sky-500"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <IconButton onClick={() => remove(team.id, p.id)} aria-label="Entfernen">
                    <Trash2 size={15} />
                  </IconButton>
                </td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs text-zinc-500">
                  Noch keine Spieler im Kader.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
