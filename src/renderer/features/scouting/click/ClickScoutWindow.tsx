import React, { useState } from 'react';
import type { ScoutingSession } from '@shared/types';
import { Button } from '@renderer/components/ui/Button';
import { useScoutingStore } from '@renderer/store/scouting.store';
import { shirtAtPosition } from '@renderer/features/scouting/RotationDisplay';
import { createClickRallyBuilder, type ClickRallyBuilder, type ClickStep } from '@renderer/lib/click-rally-builder';
import { CourtClickArea } from '@renderer/features/scouting/click/CourtClickArea';
import { EvaluationBar } from '@renderer/features/scouting/click/EvaluationBar';
import { ServeTypeBar } from '@renderer/features/scouting/click/ServeTypeBar';
import { BlockCountBar } from '@renderer/features/scouting/click/BlockCountBar';
import { SubPanel } from '@renderer/features/scouting/click/SubPanel';
import { LiberoToggle } from '@renderer/features/scouting/click/LiberoToggle';

const TEAM_LABEL = { home: 'Heim', away: 'Gast' } as const;

const ZONE_STEPS = new Set<ClickStep['kind']>([
  'SERVE_START',
  'SERVE_LANDING',
  'ATTACK_START',
  'ATTACK_LANDING',
  'BLOCK_TOUCH',
  'BLOCK_LANDING',
]);
const SUBTYPE_STEPS = new Set<ClickStep['kind']>(['SERVE_START', 'SERVE_LANDING', 'SERVE_GRADE']);
const GRADE_STEPS = new Set<ClickStep['kind']>(['SERVE_GRADE', 'RECEPTION_GRADE', 'ATTACK_GRADE', 'BLOCK_GRADE']);

function promptFor(step: ClickStep): string {
  switch (step.kind) {
    case 'SERVE_START':
      return 'Klick Aufschlag-Startpunkt';
    case 'SERVE_LANDING':
      return 'Klick Aufschlag-Landepunkt';
    case 'SERVE_GRADE':
      return 'Bewertung Aufschlag (optional)';
    case 'RECEPTION':
      return `Klick Annahmespieler (${TEAM_LABEL[step.team]})`;
    case 'RECEPTION_GRADE':
      return 'Bewertung Annahme (optional)';
    case 'ATTACK_PLAYER':
      return `Klick angreifenden Spieler (${TEAM_LABEL[step.team]})`;
    case 'ATTACK_START':
      return 'Optional: Startposition des Angriffs';
    case 'ATTACK_LANDING':
      return 'Klick Landepunkt des Angriffs';
    case 'ATTACK_GRADE':
      return 'Bewertung Angriff (optional)';
    case 'BLOCK_COUNT':
      return `Anzahl Blockspieler (${TEAM_LABEL[step.team]})`;
    case 'BLOCK_PLAYER':
      return `Klick Blockspieler (${TEAM_LABEL[step.team]})`;
    case 'BLOCK_TOUCH':
      return 'Klick Berührpunkt am Netz';
    case 'BLOCK_LANDING':
      return 'Klick Landepunkt nach Block';
    case 'BLOCK_GRADE':
      return 'Bewertung Block (optional)';
    case 'RALLY_DONE':
      return 'Ballwechsel abgeschlossen …';
  }
}

function freshBuilder(session: ScoutingSession): ClickRallyBuilder {
  const lineup = session.servingTeam === 'home' ? session.homeLineup : session.awayLineup;
  const rotation = session.servingTeam === 'home' ? session.rotationHome : session.rotationAway;
  const server = shirtAtPosition(lineup, rotation, 1) ?? 0;
  return createClickRallyBuilder(session.servingTeam, server);
}

export function ClickScoutWindow() {
  const session = useScoutingStore((s) => s.session);
  const rallies = useScoutingStore((s) => s.rallies);
  const error = useScoutingStore((s) => s.error);
  const undoLastRally = useScoutingStore((s) => s.undoLastRally);
  const [builder, setBuilder] = useState<ClickRallyBuilder | null>(() => (session ? freshBuilder(session) : null));

  if (session === null || builder === null) return null;

  const step = builder.step;

  function apply(updated: ClickRallyBuilder) {
    if (updated.step.kind === 'RALLY_DONE') {
      const codeString = updated.step.codeString;
      const store = useScoutingStore.getState();
      store.setInput(codeString);
      void store.submitCode().then(() => {
        const latestSession = useScoutingStore.getState().session;
        setBuilder(latestSession ? freshBuilder(latestSession) : updated);
      });
      return;
    }
    setBuilder(updated);
  }

  const zoneClickActive = ZONE_STEPS.has(step.kind);
  const activePlayerSide =
    step.kind === 'RECEPTION' || step.kind === 'ATTACK_PLAYER' || step.kind === 'BLOCK_PLAYER' ? step.team : null;

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-700 bg-zinc-900 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sky-300">{promptFor(step)}</span>
        <div className="flex items-center gap-2">
          <SubPanel session={session} />
          <LiberoToggle session={session} />
          <Button variant="secondary" size="sm" onClick={() => void undoLastRally()} disabled={rallies.length === 0}>
            Rückgängig
          </Button>
        </div>
      </div>

      <CourtClickArea
        homeLineup={session.homeLineup}
        awayLineup={session.awayLineup}
        rotationHome={session.rotationHome}
        rotationAway={session.rotationAway}
        zoneClickActive={zoneClickActive}
        activePlayerSide={activePlayerSide}
        onZoneClick={(zone, subzone) => apply(builder.clickZone(zone, subzone))}
        onOutOfBounds={() => apply(builder.clickOutOfBounds())}
        onPlayerClick={(_team, shirt) => apply(builder.clickPlayer(shirt))}
      />

      <div className="flex flex-wrap items-center gap-3">
        {step.kind === 'ATTACK_START' && (
          <Button variant="ghost" size="sm" onClick={() => apply(builder.skipZone())}>
            Startposition überspringen
          </Button>
        )}
        {SUBTYPE_STEPS.has(step.kind) && <ServeTypeBar onPick={(subtype) => apply(builder.clickSubtype(subtype))} />}
        {GRADE_STEPS.has(step.kind) && (
          <EvaluationBar onPick={(effect) => apply(builder.clickGrade(effect))} onSkip={() => apply(builder.skipGrade())} />
        )}
        {step.kind === 'BLOCK_COUNT' && <BlockCountBar onPick={(n) => apply(builder.clickBlockCount(n))} />}
      </div>

      {error !== null && <div className="px-1 text-xs text-red-400">{error}</div>}
    </div>
  );
}
