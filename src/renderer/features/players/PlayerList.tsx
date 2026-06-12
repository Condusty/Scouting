import React from 'react';
import { User, Plus, Trash2 } from 'lucide-react';
import type { Player } from '@shared/types';
import { usePlayersStore } from '@renderer/store/players.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { PlayerForm, emptyPlayer, playerToForm, type PlayerFormValues } from './PlayerForm';

export function PlayerList() {
  const { players, load, create, update, remove, error } = usePlayersStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<PlayerFormValues>(emptyPlayer());

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyPlayer());
    setOpen(true);
  };
  const openEdit = (p: Player) => {
    setEditId(p.id);
    setForm(playerToForm(p));
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  return (
    <Page
      title="Spieler"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neuer Spieler
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {players.length === 0 ? (
        <EmptyState
          icon={<User size={32} />}
          title="Noch keine Spieler"
          description="Lege Spieler an, um sie Teams zuzuordnen."
          actionLabel="Neuer Spieler"
          onAction={openCreate}
        />
      ) : (
        <DataTable<Player>
          rows={players}
          rowKey={(p) => p.id}
          onRowClick={openEdit}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (p) => (
                <span className="font-medium">
                  {p.last_name}, {p.first_name}
                </span>
              ),
            },
            { key: 'code', header: 'Code', render: (p) => p.code },
            { key: 'pos', header: 'Position', render: (p) => p.position ?? '—' },
            { key: 'height', header: 'Größe', render: (p) => (p.height_cm ? `${p.height_cm} cm` : '—') },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              render: (p) => (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Spieler „${p.last_name}" löschen?`)) remove(p.id);
                  }}
                  aria-label="Löschen"
                >
                  <Trash2 size={15} />
                </IconButton>
              ),
            },
          ]}
        />
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editId == null ? 'Neuer Spieler' : 'Spieler bearbeiten'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={save} disabled={!form.first_name || !form.last_name || !form.code}>
              Speichern
            </Button>
          </>
        }
      >
        <PlayerForm values={form} onChange={setForm} />
      </Dialog>
    </Page>
  );
}
