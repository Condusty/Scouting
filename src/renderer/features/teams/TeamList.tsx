import React from 'react';
import { Users, Plus, Trash2, ListChecks } from 'lucide-react';
import type { TeamRecord } from '@shared/types';
import { useTeamsStore } from '@renderer/store/teams.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog';
import { TeamForm, emptyTeam, teamToForm, type TeamFormValues } from './TeamForm';
import { TeamRoster } from './TeamRoster';

export function TeamList() {
  const { teams, load, create, update, remove, error } = useTeamsStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<TeamFormValues>(emptyTeam());
  const [rosterTeam, setRosterTeam] = React.useState<TeamRecord | null>(null);
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
                      setRosterTeam(t);
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
      {rosterTeam && <TeamRoster team={rosterTeam} onClose={() => setRosterTeam(null)} />}
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
