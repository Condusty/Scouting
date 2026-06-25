import React, { useState } from 'react';
import type { ScoutingSession, TeamSide } from '@shared/types';
import { cn } from '@renderer/lib/cn';
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

// Main 9-zone court grid is clickable for these — SERVE_START and BLOCK_TOUCH have their
// own dedicated strips (behind-the-baseline / along-the-net) instead, see CourtClickArea.
const ZONE_STEPS = new Set<ClickStep['kind']>(['SERVE_LANDING', 'ATTACK_START', 'ATTACK_LANDING', 'BLOCK_LANDING']);
const SUBTYPE_STEPS = new Set<ClickStep['kind']>(['SERVE_START', 'SERVE_LANDING', 'SERVE_GRADE']);
const GRADE_STEPS = new Set<ClickStep['kind']>(['SERVE_GRADE', 'RECEPTION_GRADE', 'ATTACK_GRADE', 'BLOCK_GRADE']);
// Evaluation buttons are visible the whole time an action is in progress, not just at its
// dedicated "_GRADE" step — these are the only steps with no action in flight to grade.
const NO_PENDING_STEPS = new Set<ClickStep['kind']>(['RECEPTION', 'ATTACK_PLAYER', 'BLOCK_PLAYER', 'RALLY_DONE']);
// Pairs that get a connecting arrow drawn once both points are clicked.
const START_CLICK_KINDS = new Set<ClickStep['kind']>(['SERVE_START', 'ATTACK_START', 'BLOCK_TOUCH']);
const END_CLICK_KINDS = new Set<ClickStep['kind']>(['SERVE_LANDING', 'ATTACK_LANDING', 'BLOCK_LANDING']);
const ATTACK_IN_PROGRESS_KINDS = new Set<ClickStep['kind']>(['ATTACK_START', 'ATTACK_LANDING']);

function opposite(team: TeamSide): TeamSide {
  return team === 'home' ? 'away' : 'home';
}

/** Reverse-lookup: which rotational position (1–6, same numbering as DataVolley zones) is this shirt at right now? */
function reverseZoneForShirt(lineup: number[], rotation: number, shirt: number): number | null {
  for (let position = 1; position <= 6; position++) {
    if (shirtAtPosition(lineup, rotation, position) === shirt) return position;
  }
  return null;
}

function promptFor(step: ClickStep): string {
  switch (step.kind) {
    case 'SERVE_START':
      return 'Klick Aufschlag-Startpunkt';
    case 'SERVE_LANDING':
      return 'Klick Aufschlag-Landepunkt';
    case 'SERVE_GRADE':
      return 'Bewertung Aufschlag (optional — weiterklicken übernimmt Standardwert)';
    case 'RECEPTION':
      return `Klick Annahmespieler (${TEAM_LABEL[step.team]})`;
    case 'RECEPTION_GRADE':
      return 'Bewertung Annahme (optional — weiterklicken übernimmt Standardwert)';
    case 'ATTACK_PLAYER':
      return `Klick angreifenden Spieler (${TEAM_LABEL[step.team]})`;
    case 'ATTACK_START':
      return 'Optional: Startposition des Angriffs';
    case 'ATTACK_LANDING':
      return 'Klick Landepunkt des Angriffs';
    case 'ATTACK_GRADE':
      return 'Bewertung Angriff (optional — weiterklicken übernimmt Standardwert)';
    case 'BLOCK_PLAYER':
      return `Klick Blockspieler (${TEAM_LABEL[step.team]})`;
    case 'BLOCK_TOUCH':
      return 'Klick Berührpunkt am Netz';
    case 'BLOCK_LANDING':
      return 'Klick Landepunkt nach Block';
    case 'BLOCK_GRADE':
      return 'Bewertung Block (optional — weiterklicken übernimmt Standardwert)';
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
  const [history, setHistory] = useState<ClickRallyBuilder[]>([]);
  const [pointFlash, setPointFlash] = useState<TeamSide | null>(null);

  if (session === null || builder === null) return null;
  // Re-bind as non-null locals: TS doesn't retain narrowing of outer `const`s
  // inside nested function declarations defined further down in this component.
  const activeSession: ScoutingSession = session;
  const activeBuilder: ClickRallyBuilder = builder;

  const step = activeBuilder.step;
  // Grades are optional: clicking the *next* action's target (instead of a grade button)
  // implicitly defaults the pending grade to "no value" and proceeds, same as pressing
  // "Überspringen" — `target` is what court/player clicks should actually apply to.
  const isGradeStep = GRADE_STEPS.has(step.kind);
  const target = isGradeStep ? activeBuilder.skipGrade() : activeBuilder;
  const targetStep = target.step;

  function apply(updated: ClickRallyBuilder) {
    if (updated.step.kind === 'RALLY_DONE') {
      const codeString = updated.step.codeString;
      const prevHome = activeSession.homeScore;
      const prevAway = activeSession.awayScore;
      const store = useScoutingStore.getState();
      store.setInput(codeString);
      void store.submitCode().then(() => {
        const latestSession = useScoutingStore.getState().session;
        if (latestSession) {
          if (latestSession.homeScore > prevHome) flashPoint('home');
          else if (latestSession.awayScore > prevAway) flashPoint('away');
          setBuilder(freshBuilder(latestSession));
        } else {
          setBuilder(updated);
        }
      });
      setHistory([]);
      return;
    }
    setHistory((h) => [...h, activeBuilder]);
    setBuilder(updated);
  }

  function flashPoint(team: TeamSide) {
    setPointFlash(team);
    window.setTimeout(() => setPointFlash(null), 700);
  }

  function undo() {
    if (history.length > 0) {
      setBuilder(history[history.length - 1]);
      setHistory((h) => h.slice(0, -1));
      return;
    }
    void undoLastRally();
  }

  const zoneClickActive = ZONE_STEPS.has(targetStep.kind);
  const activePlayerSide =
    targetStep.kind === 'RECEPTION' || targetStep.kind === 'ATTACK_PLAYER' || targetStep.kind === 'BLOCK_PLAYER'
      ? targetStep.team
      : null;
  const serveStartTeam = targetStep.kind === 'SERVE_START' ? session.servingTeam : undefined;
  // Block area is live the whole time an attack is in progress (defending team's strip), exactly
  // like Click&Scout — not gated behind a separate step reached only after grading the attack.
  const attackInProgress = ATTACK_IN_PROGRESS_KINDS.has(targetStep.kind);
  const blockAreaTeam =
    attackInProgress && 'team' in targetStep
      ? opposite(targetStep.team)
      : targetStep.kind === 'BLOCK_TOUCH'
        ? targetStep.team
        : undefined;
  const clickRole = START_CLICK_KINDS.has(targetStep.kind) ? 'start' : END_CLICK_KINDS.has(targetStep.kind) ? 'end' : null;
  const showEvaluationBar = !NO_PENDING_STEPS.has(step.kind);

  return (
    <div className="relative flex h-full w-full flex-col gap-4">
      {pointFlash !== null && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-10 flex animate-pulse items-center justify-center rounded-lg',
            pointFlash === 'home' ? 'bg-sky-500/20' : 'bg-amber-500/20',
          )}
        >
          <span className="text-3xl font-bold text-zinc-100">
            Punkt {pointFlash === 'home' ? session.homeTeamName : session.awayTeamName}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-sky-300">{promptFor(step)}</span>
        <div className="flex items-center gap-2">
          <SubPanel session={session} />
          <LiberoToggle session={session} />
          <Button variant="secondary" size="sm" onClick={undo} disabled={history.length === 0 && rallies.length === 0}>
            Rückgängig
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <CourtClickArea
          homeLineup={session.homeLineup}
          awayLineup={session.awayLineup}
          rotationHome={session.rotationHome}
          rotationAway={session.rotationAway}
          zoneClickActive={zoneClickActive}
          clickRole={clickRole}
          serveStartTeam={serveStartTeam}
          blockAreaTeam={blockAreaTeam}
          activePlayerSide={activePlayerSide}
          onZoneClick={(zone, subzone, clickedTeam) => {
            // First click of an attack already landing in the opponent's court: use the attacker's
            // own rotational position as the (skipped) start zone instead of demanding a second click.
            if (targetStep.kind === 'ATTACK_START' && clickedTeam !== targetStep.team && target.pendingPlayer !== null) {
              const lineup = targetStep.team === 'home' ? session.homeLineup : session.awayLineup;
              const rotation = targetStep.team === 'home' ? session.rotationHome : session.rotationAway;
              const startZone = reverseZoneForShirt(lineup, rotation, target.pendingPlayer);
              const withStart = startZone !== null ? target.clickZone(startZone) : target;
              apply(withStart.clickZone(zone, subzone));
              return;
            }
            apply(target.clickZone(zone, subzone));
          }}
          onBlockAreaClick={(zone, subzone) =>
            apply(attackInProgress ? activeBuilder.clickBlockTouch(zone, subzone) : target.clickZone(zone, subzone))
          }
          onOutOfBounds={() => apply(target.clickOutOfBounds())}
          onPlayerClick={(_team, shirt) => apply(target.clickPlayer(shirt))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {step.kind === 'ATTACK_START' && (
          <Button variant="ghost" size="sm" onClick={() => apply(builder.skipZone())}>
            Startposition überspringen
          </Button>
        )}
        {SUBTYPE_STEPS.has(step.kind) && <ServeTypeBar onPick={(subtype) => apply(activeBuilder.clickSubtype(subtype))} />}
        {showEvaluationBar && (
          <EvaluationBar
            onPick={(effect) => apply(activeBuilder.clickGrade(effect))}
            onSkip={() => apply(activeBuilder.skipGrade())}
          />
        )}
        {activeBuilder.blockersRemaining > 0 && (
          <BlockCountBar onPick={(n) => apply(activeBuilder.clickBlockCount(n))} />
        )}
      </div>

      {error !== null && <div className="px-1 text-xs text-red-400">{error}</div>}
    </div>
  );
}
