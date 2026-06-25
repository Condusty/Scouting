import type { Effect, TeamSide } from '@shared/types';
import { parseCode } from './code-parser';
import { computeRallyOutcome } from './scoring';

type Subzone = 'a' | 'b' | 'c' | 'd';
type Skill = 'S' | 'R' | 'A' | 'B';

export type ClickStep =
  | { kind: 'SERVE_START' }
  | { kind: 'SERVE_LANDING' }
  | { kind: 'SERVE_GRADE' }
  | { kind: 'RECEPTION'; team: TeamSide }
  | { kind: 'RECEPTION_GRADE'; team: TeamSide }
  | { kind: 'ATTACK_PLAYER'; team: TeamSide }
  | { kind: 'ATTACK_START'; team: TeamSide }
  | { kind: 'ATTACK_LANDING'; team: TeamSide }
  | { kind: 'ATTACK_GRADE'; team: TeamSide }
  | { kind: 'BLOCK_COUNT'; team: TeamSide }
  | { kind: 'BLOCK_PLAYER'; team: TeamSide }
  | { kind: 'BLOCK_TOUCH'; team: TeamSide }
  | { kind: 'BLOCK_LANDING'; team: TeamSide }
  | { kind: 'BLOCK_GRADE'; team: TeamSide }
  | { kind: 'RALLY_DONE'; codeString: string };

interface PendingToken {
  team: TeamSide;
  player: number;
  skill: Skill;
  subtype: string | null;
  effect: Effect | null;
  zone1: number | null;
  subzone1: Subzone | null;
  zone2: number | null;
  subzone2: Subzone | null;
}

interface Ctx {
  step: ClickStep;
  tokens: string[];
  pending: PendingToken | null;
  servingTeam: TeamSide;
  blockersRemaining: number;
}

export interface ClickRallyBuilder {
  readonly step: ClickStep;
  clickZone(zone: number, subzone?: Subzone): ClickRallyBuilder;
  skipZone(): ClickRallyBuilder;
  clickOutOfBounds(): ClickRallyBuilder;
  clickPlayer(shirtNumber: number): ClickRallyBuilder;
  clickGrade(effect: Effect): ClickRallyBuilder;
  skipGrade(): ClickRallyBuilder;
  clickSubtype(subtype: string): ClickRallyBuilder;
  clickBlockCount(n: 0 | 1 | 2): ClickRallyBuilder;
}

function opposite(team: TeamSide): TeamSide {
  return team === 'home' ? 'away' : 'home';
}

function tokenToString(t: PendingToken): string {
  const teamPrefix = t.team === 'away' ? 'a' : '';
  const subtype = t.subtype ?? '';
  const effect = t.effect ?? '';
  const z1 = t.zone1 !== null ? String(t.zone1) + (t.subzone1 ?? '') : '';
  const z2 = t.zone2 !== null ? String(t.zone2) + (t.subzone2 ?? '') : '';
  return `${teamPrefix}${t.player}${t.skill}${subtype}${effect}${z1}${z2}`;
}

const POINT_SKILLS = new Set<Skill>(['S', 'A', 'B']);

/** Point-team for the *current* token list, using the same rule scoring.ts already applies. */
function rallyPointTeam(tokens: string[]): TeamSide | null {
  if (tokens.length === 0) return null;
  const parsed = parseCode(tokens.join('.'));
  const outcome = computeRallyOutcome(parsed, {
    homeScore: 0,
    awayScore: 0,
    rotationHome: 1,
    rotationAway: 1,
    servingTeam: 'home',
  });
  return outcome.pointTeam;
}

function startToken(team: TeamSide, skill: Skill, player: number, subtype: string | null = null): PendingToken {
  return { team, skill, player, subtype, effect: null, zone1: null, subzone1: null, zone2: null, subzone2: null };
}

function wrap(ctx: Ctx): ClickRallyBuilder {
  function next(patch: Partial<Ctx>): ClickRallyBuilder {
    return wrap({ ...ctx, ...patch });
  }

  /** Finalizes `pending` (pushing its string form onto `tokens`) and returns the updated token list. */
  function finalize(effect: Effect | null): string[] {
    if (ctx.pending === null) return ctx.tokens;
    const token = tokenToString({ ...ctx.pending, effect });
    return [...ctx.tokens, token];
  }

  /**
   * Decides the next step once a non-rally-ending action has been finalized.
   * `team` is the team that just performed `finishedSkill`.
   *  - after a serve: the other team receives.
   *  - after a reception: the same (receiving) team attacks.
   *  - after an attack that wasn't blocked: the ball crossed the net, so the
   *    *defending* team digs and attacks back.
   *  - after a block touch that didn't end the rally: the *blocking* team
   *    recovers its own touch and attacks back (it never crossed the net).
   */
  function afterAction(tokens: string[], finishedSkill: Skill, team: TeamSide): ClickStep {
    const pointTeam = rallyPointTeam(tokens);
    if (pointTeam !== null) return { kind: 'RALLY_DONE', codeString: tokens.join('.') };

    if (finishedSkill === 'S') return { kind: 'RECEPTION', team: opposite(team) };
    if (finishedSkill === 'R') return { kind: 'ATTACK_PLAYER', team };
    if (finishedSkill === 'A') return { kind: 'ATTACK_PLAYER', team: opposite(team) };
    return { kind: 'ATTACK_PLAYER', team }; // finishedSkill === 'B'
  }

  /** Shared by `clickGrade` and `skipGrade` (which is just `finalizeGrade(null)`). */
  function finalizeGrade(effect: Effect | null): ClickRallyBuilder {
    if (ctx.pending === null) return wrap(ctx);
    const team = ctx.pending.team;
    const finishedSkill = ctx.pending.skill;
    const tokens = finalize(effect);

    if (finishedSkill === 'A' && (effect === '/' || effect === '!')) {
      return next({ pending: null, tokens, step: { kind: 'BLOCK_COUNT', team: opposite(team) } });
    }

    if (finishedSkill === 'S') {
      return next({ pending: null, tokens, step: afterAction(tokens, 'S', team) });
    }

    if (finishedSkill === 'B') {
      const blockersRemaining = ctx.blockersRemaining - 1;

      // Block "invasion" never auto-scores via the generic engine (no skill carries an
      // inherent '#'/'=' for it), so once the last blocker's grade is in, explicitly
      // award the point to the attacking team — mirrors the manual's BLOCK '/' meaning.
      if (blockersRemaining <= 0 && effect === '/') {
        const attackingTeam = opposite(team);
        const finalTokens = [...tokens, attackingTeam === 'home' ? 'P' : 'Pa'];
        return next({
          pending: null,
          tokens: finalTokens,
          blockersRemaining,
          step: { kind: 'RALLY_DONE', codeString: finalTokens.join('.') },
        });
      }

      if (blockersRemaining > 0) {
        return next({ pending: null, tokens, blockersRemaining, step: { kind: 'BLOCK_PLAYER', team } });
      }

      return next({ pending: null, tokens, blockersRemaining, step: afterAction(tokens, 'B', team) });
    }

    // finishedSkill === 'R' or 'A' (non-blocked)
    return next({ pending: null, tokens, step: afterAction(tokens, finishedSkill, team) });
  }

  return {
    step: ctx.step,

    clickZone(zone, subzone) {
      if (ctx.pending === null) return wrap(ctx);
      const fillFirst = ctx.pending.zone1 === null;
      const pending: PendingToken = fillFirst
        ? { ...ctx.pending, zone1: zone, subzone1: subzone ?? null }
        : { ...ctx.pending, zone2: zone, subzone2: subzone ?? null };

      switch (ctx.step.kind) {
        case 'SERVE_START':
          return next({ pending, step: { kind: 'SERVE_LANDING' } });
        case 'SERVE_LANDING':
          return next({ pending, step: { kind: 'SERVE_GRADE' } });
        case 'ATTACK_START':
          return next({ pending, step: { kind: 'ATTACK_LANDING', team: ctx.step.team } });
        case 'ATTACK_LANDING':
          return next({ pending, step: { kind: 'ATTACK_GRADE', team: ctx.step.team } });
        case 'BLOCK_TOUCH':
          return next({ pending, step: { kind: 'BLOCK_LANDING', team: ctx.step.team } });
        case 'BLOCK_LANDING':
          return next({ pending, step: { kind: 'BLOCK_GRADE', team: ctx.step.team } });
        default:
          return wrap(ctx);
      }
    },

    skipZone() {
      if (ctx.step.kind !== 'ATTACK_START') return wrap(ctx);
      return next({ step: { kind: 'ATTACK_LANDING', team: ctx.step.team } });
    },

    clickOutOfBounds() {
      if (ctx.pending === null) return wrap(ctx);
      if (ctx.step.kind !== 'SERVE_LANDING' && ctx.step.kind !== 'ATTACK_LANDING') return wrap(ctx);

      const team = ctx.pending.team;
      const finishedSkill = ctx.pending.skill;
      const tokens = finalize('=');
      return next({ pending: null, tokens, step: afterAction(tokens, finishedSkill, team) });
    },

    clickPlayer(shirtNumber) {
      switch (ctx.step.kind) {
        case 'RECEPTION': {
          const team = ctx.step.team;
          const pending = startToken(team, 'R', shirtNumber);
          return next({ pending, step: { kind: 'RECEPTION_GRADE', team } });
        }
        case 'ATTACK_PLAYER': {
          const team = ctx.step.team;
          const pending = startToken(team, 'A', shirtNumber);
          return next({ pending, step: { kind: 'ATTACK_START', team } });
        }
        case 'BLOCK_PLAYER': {
          const team = ctx.step.team;
          const pending = startToken(team, 'B', shirtNumber);
          return next({ pending, step: { kind: 'BLOCK_TOUCH', team } });
        }
        default:
          return wrap(ctx);
      }
    },

    clickGrade(effect) {
      return finalizeGrade(effect);
    },

    skipGrade() {
      return finalizeGrade(null);
    },

    clickSubtype(subtype) {
      if (ctx.pending === null) return wrap(ctx);
      return next({ pending: { ...ctx.pending, subtype } });
    },

    clickBlockCount(n) {
      if (ctx.step.kind !== 'BLOCK_COUNT') return wrap(ctx);
      const team = ctx.step.team;
      if (n === 0) {
        return next({ step: { kind: 'ATTACK_PLAYER', team } });
      }
      return next({ blockersRemaining: n, step: { kind: 'BLOCK_PLAYER', team } });
    },
  };
}

export function createClickRallyBuilder(servingTeam: TeamSide, serverShirtNumber: number): ClickRallyBuilder {
  return wrap({
    step: { kind: 'SERVE_START' },
    tokens: [],
    pending: startToken(servingTeam, 'S', serverShirtNumber),
    servingTeam,
    blockersRemaining: 0,
  });
}
