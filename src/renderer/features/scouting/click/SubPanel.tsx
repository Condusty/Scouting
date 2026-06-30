import React, { useState } from 'react';
import type { ScoutingSession, TeamSide } from '@shared/types';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Button } from '@renderer/components/ui/Button';
import { useScoutingStore } from '@renderer/store/scouting.store';

export function SubPanel({ session }: { session: ScoutingSession }) {
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState<TeamSide>('home');
  const [out, setOut] = useState<number | null>(null);
  const [inPlayer, setInPlayer] = useState<number | null>(null);

  const lineup = team === 'home' ? session.homeLineup : session.awayLineup;
  const roster = team === 'home' ? session.homeRoster : session.awayRoster;
  const bench = roster.filter((p) => !lineup.includes(p.shirt_number));

  const reset = () => {
    setOut(null);
    setInPlayer(null);
  };

  const confirm = async () => {
    if (out === null || inPlayer === null) return;
    const code = `${team === 'away' ? 'a' : ''}C${out}:${inPlayer}`;
    const store = useScoutingStore.getState();
    store.setInput(code);
    await store.submitCode();
    reset();
    setOpen(false);
  };

  function roleTag(shirt: number) {
    const p = roster.find((r) => r.shirt_number === shirt);
    if (p?.is_libero) return ' L';
    if (p?.is_setter) return ' Z';
    return '';
  }

  return (
    <>
      <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
        Wechsel
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Spielerwechsel">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant={team === 'home' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => {
                setTeam('home');
                reset();
              }}
            >
              Heim
            </Button>
            <Button
              variant={team === 'away' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => {
                setTeam('away');
                reset();
              }}
            >
              Gast
            </Button>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-400">Spieler raus (auf dem Feld)</p>
            <div className="flex flex-wrap gap-2">
              {lineup.map((shirt) => (
                <Button
                  key={shirt}
                  variant={out === shirt ? 'primary' : 'secondary'}
                  size="md"
                  onClick={() => setOut(shirt)}
                >
                  #{shirt}{roleTag(shirt)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-400">Spieler rein (Bank)</p>
            <div className="flex flex-wrap gap-2">
              {bench.map((p) => (
                <Button
                  key={p.shirt_number}
                  variant={inPlayer === p.shirt_number ? 'primary' : 'secondary'}
                  size="md"
                  onClick={() => setInPlayer(p.shirt_number)}
                >
                  #{p.shirt_number} {p.last_name}{p.is_libero ? ' L' : p.is_setter ? ' Z' : ''}
                </Button>
              ))}
            </div>
          </div>
          <Button disabled={out === null || inPlayer === null} onClick={() => void confirm()}>
            Wechsel bestätigen
          </Button>
        </div>
      </Dialog>
    </>
  );
}
