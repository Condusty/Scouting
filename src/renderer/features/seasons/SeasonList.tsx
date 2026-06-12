import React from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import type { Season } from '@shared/types';
import { useSeasonsStore } from '@renderer/store/seasons.store';
import { Page } from '@renderer/components/ui/Page';
import { Button, IconButton } from '@renderer/components/ui/Button';
import { DataTable } from '@renderer/components/ui/DataTable';
import { EmptyState } from '@renderer/components/ui/EmptyState';
import { Dialog } from '@renderer/components/ui/Dialog';
import { SeasonForm, emptySeason, seasonToForm, type SeasonFormValues } from './SeasonForm';

export function SeasonList() {
  const { seasons, load, create, update, remove, error } = useSeasonsStore();
  const [open, setOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<SeasonFormValues>(emptySeason());

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptySeason());
    setOpen(true);
  };
  const openEdit = (s: Season) => {
    setEditId(s.id);
    setForm(seasonToForm(s));
    setOpen(true);
  };
  const save = async () => {
    if (editId == null) await create(form);
    else await update(editId, form);
    setOpen(false);
  };

  return (
    <Page
      title="Saisons"
      actions={
        <Button onClick={openCreate}>
          <Plus size={16} /> Neue Saison
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {seasons.length === 0 ? (
        <EmptyState
          icon={<Calendar size={32} />}
          title="Noch keine Saison"
          description="Lege eine Saison an, um Teams und Spiele zuzuordnen."
          actionLabel="Neue Saison"
          onAction={openCreate}
        />
      ) : (
        <DataTable<Season>
          rows={seasons}
          rowKey={(s) => s.id}
          onRowClick={openEdit}
          columns={[
            { key: 'name', header: 'Name', render: (s) => <span className="font-medium">{s.name}</span> },
            { key: 'code', header: 'Code', render: (s) => s.code },
            { key: 'start', header: 'Start', render: (s) => s.start_date ?? '—' },
            { key: 'end', header: 'Ende', render: (s) => s.end_date ?? '—' },
            {
              key: 'actions',
              header: '',
              className: 'w-12 text-right',
              render: (s) => (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Saison „${s.name}" löschen?`)) remove(s.id);
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
        title={editId == null ? 'Neue Saison' : 'Saison bearbeiten'}
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
        <SeasonForm values={form} onChange={setForm} />
      </Dialog>
    </Page>
  );
}
