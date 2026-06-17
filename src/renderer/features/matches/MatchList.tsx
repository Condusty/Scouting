import React from 'react';
import { BarChart2, ClipboardList, PlayCircle, Plus, Trash2 } from 'lucide-react';
import type { MatchRow } from '@shared/types';
import { useMatchesStore } from '@renderer/store/matches.store';
import { useTeamsStore } from '@renderer/store/teams.store';
import { useUIStore } from '@renderer/store/ui.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog';
import { MatchForm, emptyMatch, type MatchFormValues } from './MatchForm';
import { matchesApi } from '@renderer/api/matches.api';

export function MatchList() {
  const { matches, load, create, update, remove, error } = useMatchesStore();
  const { teams, load: loadTeams } = useTeamsStore();
  const openTab = useUIStore((s) => s.openTab);
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<MatchFormValues>(emptyMatch());
  const [deleteTarget, setDeleteTarget] = React.useState<MatchRow | null>(null);

  React.useEffect(() => {
    load();
    loadTeams();
  }, [load, loadTeams]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyMatch());
    setOpen(true);
  };
  const openEdit = async (m: MatchRow) => {
    const detail = await matchesApi.get(m.id);
    setEditId(m.id);
    setForm({
      season_id: detail.season_id,
      home_team_id: detail.home_team_id,
      away_team_id: detail.away_team_id,
      match_date: detail.match_date,
      venue: detail.venue,
      video_path: detail.video_path,
      video_offset_ms: detail.video_offset_ms,
      comment: detail.comment,
      dvw_source_file: detail.dvw_source_file,
    });
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  const valid = form.home_team_id > 0 && form.away_team_id > 0 && form.home_team_id !== form.away_team_id;

  return (
    <Page
      title="Spiele"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neues Spiel
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {matches.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title="Noch keine Spiele"
          description="Lege ein Spiel an, um es anschließend zu scouten."
          actionLabel="Neues Spiel"
          onAction={openCreate}
        />
      ) : (
        <DataTable<MatchRow>
          rows={matches}
          rowKey={(m) => m.id}
          onRowClick={openEdit}
          columns={[
            {
              key: 'teams',
              header: 'Begegnung',
              render: (m) => (
                <span className="font-medium">
                  {m.home_team_name} <span className="text-zinc-500">vs</span> {m.away_team_name}
                </span>
              ),
            },
            { key: 'date', header: 'Datum', render: (m) => m.match_date ?? '—' },
            { key: 'venue', header: 'Halle', render: (m) => m.venue ?? '—' },
            {
              key: 'actions',
              header: '',
              className: 'w-20 text-right',
              render: (m) => (
                <div className="flex items-center justify-end gap-1">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      openTab({
                        type: 'scouting',
                        label: `${m.home_team_name} vs ${m.away_team_name}`,
                        params: { matchId: m.id },
                      });
                    }}
                    aria-label="Scouten"
                  >
                    <PlayCircle size={15} />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      openTab({
                        type: 'report',
                        label: `Report: ${m.home_team_name} vs ${m.away_team_name}`,
                        params: { matchId: m.id },
                      });
                    }}
                    aria-label="Report"
                  >
                    <BarChart2 size={15} />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(m);
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
        title={editId == null ? 'Neues Spiel' : 'Spiel bearbeiten'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={!valid}>
              Speichern
            </Button>
          </>
        }
      >
        <MatchForm values={form} teams={teams} onChange={setForm} />
      </Dialog>
      <ConfirmDialog
        open={deleteTarget != null}
        title="Spiel löschen"
        description={
          deleteTarget
            ? `Spiel „${deleteTarget.home_team_name} vs ${deleteTarget.away_team_name}" wirklich löschen?`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </Page>
  );
}
