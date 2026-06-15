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
