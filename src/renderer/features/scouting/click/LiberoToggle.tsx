import React, { useState } from 'react';
import type { ScoutingSession, TeamSide } from '@shared/types';
import { Dialog } from '@renderer/components/ui/Dialog';
import { Button } from '@renderer/components/ui/Button';
import { useScoutingStore } from '@renderer/store/scouting.store';

export function LiberoToggle({ session }: { session: ScoutingSession }) {
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
    const code = `${team === 'away' ? 'a' : ''}CL${out}:${inPlayer}`;
    const store = useScoutingStore.getState();
    store.setInput(code);
    await store.submitCode();
    reset();
    setOpen(false);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Libero
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Libero-Wechsel">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant={team === 'home' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setTeam('home');
                reset();
              }}
            >
              Heim
            </Button>
            <Button
              variant={team === 'away' ? 'primary' : 'secondary'}
              size="sm"
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
            <div className="flex flex-wrap gap-1.5">
              {lineup.map((shirt) => (
                <Button
                  key={shirt}
                  variant={out === shirt ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setOut(shirt)}
                >
                  #{shirt}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-400">Spieler rein (Bank, inkl. Libero)</p>
            <div className="flex flex-wrap gap-1.5">
              {bench.map((p) => (
                <Button
                  key={p.shirt_number}
                  variant={inPlayer === p.shirt_number ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setInPlayer(p.shirt_number)}
                >
                  #{p.shirt_number} {p.last_name}
                  {p.is_libero && ' (L)'}
                </Button>
              ))}
            </div>
          </div>
          <Button disabled={out === null || inPlayer === null} onClick={() => void confirm()}>
            Libero-Wechsel bestätigen
          </Button>
        </div>
      </Dialog>
    </>
  );
}
