import { describe, it, expect } from 'vitest';
import { createClickRallyBuilder } from '../../src/renderer/lib/click-rally-builder';
import { parseCode } from '../../src/renderer/lib/code-parser';
import { deriveOutcome } from '../../src/renderer/lib/scoring';
import type { ScoringState } from '../../src/shared/types';

const STATE: ScoringState = {
  homeScore: 0,
  awayScore: 0,
  rotationHome: 1,
  rotationAway: 1,
  servingTeam: 'home',
};

function done(codeString: string) {
  return { actions: parseCode(codeString).actions, outcome: deriveOutcome(parseCode(codeString), STATE) };
}

describe('click-rally-builder', () => {
  it('serve ace: home serves, clicks #, rally ends with point to home', () => {
    let b = createClickRallyBuilder('home', 1);
    expect(b.step.kind).toBe('SERVE_START');
    b = b.clickZone(1);
    expect(b.step.kind).toBe('SERVE_LANDING');
    b = b.clickZone(5);
    expect(b.step.kind).toBe('SERVE_GRADE');
    b = b.clickGrade('#');
    expect(b.step.kind).toBe('RALLY_DONE');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      team: 'home', playerNumber: 1, skill: 'S', skillSubtype: null,
      startZone: 1, endZone: 5, startSubzone: null, endSubzone: null,
      effect: '#',
    });
    expect(outcome.pointTeam).toBe('home');
  });

  it('serve error via out-of-bounds landing: point to receiving team', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1);
    b = b.clickOutOfBounds();
    expect(b.step.kind).toBe('RALLY_DONE');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    expect(actions[0].effect).toBe('=');
    expect(actions[0].skill).toBe('S');
    expect(outcome.pointTeam).toBe('away');
  });

  it('serve subtype is recorded on the serve action only (the parser has no subtype slot for R)', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1);
    b = b.clickSubtype('Q');
    b = b.clickZone(5);
    expect(b.step.kind).toBe('SERVE_GRADE');
    b = b.skipGrade();
    expect(b.step.kind).toEqual('RECEPTION');
    b = b.clickPlayer(7);
    expect(b.step.kind).toBe('RECEPTION_GRADE');
    b = b.skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).skipZone().clickZone(5).clickGrade('#');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions } = done(b.step.codeString);
    expect(actions[0].skillSubtype).toBe('Q'); // serve
    expect(actions[1].skillSubtype).toBeNull(); // reception
  });

  it('full rally with no grades clicked: every optional grade stays null except the final point', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade(); // serve
    expect(b.step.kind).toBe('RECEPTION');
    b = b.clickPlayer(7).skipGrade(); // reception
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    expect(b.step.team).toBe('away');
    b = b.clickPlayer(9).skipZone().clickZone(5).clickGrade('#'); // attack -> point
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    expect(actions[0].effect).toBeNull(); // serve
    expect(actions[1].effect).toBeNull(); // reception
    expect(actions[2].effect).toBe('#'); // attack
    expect(outcome.pointTeam).toBe('away');
  });

  it('attack lands out of bounds: immediate error, point to defending team', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).skipZone().clickOutOfBounds();
    expect(b.step.kind).toBe('RALLY_DONE');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    const attack = actions[2];
    expect(attack.skill).toBe('A');
    expect(attack.effect).toBe('=');
    expect(outcome.pointTeam).toBe('home');
  });

  it('attack with explicit start zone records both start and end zone', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9); // ATTACK_START reached
    expect(b.step.kind).toBe('ATTACK_START');
    b = b.clickZone(6); // explicit start zone
    expect(b.step.kind).toBe('ATTACK_LANDING');
    b = b.clickZone(5).clickGrade('#');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions } = done(b.step.codeString);
    expect(actions[2]).toMatchObject({ startZone: 6, endZone: 5 });
  });

  it('blocked attack (kill block): block player + grade # ends rally with point to blocking team', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).skipZone().clickZone(5).clickGrade('/'); // attack blocked
    expect(b.step.kind).toBe('BLOCK_COUNT');
    if (b.step.kind !== 'BLOCK_COUNT') throw new Error('unreachable');
    expect(b.step.team).toBe('home'); // server's team blocks the away attacker
    b = b.clickBlockCount(1);
    expect(b.step.kind).toBe('BLOCK_PLAYER');
    b = b.clickPlayer(3);
    expect(b.step.kind).toBe('BLOCK_TOUCH');
    b = b.clickZone(2);
    expect(b.step.kind).toBe('BLOCK_LANDING');
    b = b.clickZone(9).clickGrade('#');
    expect(b.step.kind).toBe('RALLY_DONE');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    const block = actions[3];
    expect(block).toMatchObject({ team: 'home', playerNumber: 3, skill: 'B', startZone: 2, endZone: 9, effect: '#' });
    expect(outcome.pointTeam).toBe('home');
  });

  it('blocked attack, block does not kill it: rally loops back to the blocking team attacking', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).skipZone().clickZone(5).clickGrade('!'); // covered
    if (b.step.kind !== 'BLOCK_COUNT') throw new Error('unreachable');
    b = b.clickBlockCount(1).clickPlayer(3).clickZone(2).clickZone(9).clickGrade('-'); // touched, rally continues
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER after non-killing block');
    expect(b.step.team).toBe('home'); // blocking team now attacks back
    b = b.clickPlayer(4).skipZone().clickZone(6).clickGrade('#');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { outcome } = done(b.step.codeString);
    expect(outcome.pointTeam).toBe('home');
  });

  it('block count 0: no block recorded, ball simply crosses back to the defending team', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).skipZone().clickZone(5).clickGrade('!');
    if (b.step.kind !== 'BLOCK_COUNT') throw new Error('unreachable');
    b = b.clickBlockCount(0);
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    expect(b.step.team).toBe('home');
    b = b.clickPlayer(4).skipZone().clickZone(6).clickGrade('#');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    expect(actions.filter((a) => a.skill === 'B')).toHaveLength(0);
    expect(outcome.pointTeam).toBe('home');
  });

  it('block invasion (/): no further block action, point still goes to the attacking team', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).skipZone().clickZone(5).clickGrade('/');
    if (b.step.kind !== 'BLOCK_COUNT') throw new Error('unreachable');
    b = b.clickBlockCount(1).clickPlayer(3).clickZone(2).clickZone(9).clickGrade('/');
    expect(b.step.kind).toBe('RALLY_DONE');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { outcome } = done(b.step.codeString);
    expect(outcome.pointTeam).toBe('away'); // away attacked, home's block invaded -> point to away
  });

  it('two-blocker count: collects two separate block player+zone+grade entries', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).skipZone().clickZone(5).clickGrade('!');
    if (b.step.kind !== 'BLOCK_COUNT') throw new Error('unreachable');
    b = b.clickBlockCount(2).clickPlayer(3).clickZone(2).clickZone(9).clickGrade('-');
    expect(b.step.kind).toBe('BLOCK_PLAYER'); // second blocker
    b = b.clickPlayer(14).clickZone(2).clickZone(9).clickGrade('#');
    expect(b.step.kind).toBe('RALLY_DONE');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    expect(actions.filter((a) => a.skill === 'B')).toHaveLength(2);
    expect(outcome.pointTeam).toBe('home');
  });

  it('clickBlockTouch during attack: skips landing zone, attack finalized as touched (!), straight to BLOCK_PLAYER', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9); // ATTACK_START reached, attacker = away #9
    expect(b.step.kind).toBe('ATTACK_START');
    expect(b.pendingPlayer).toBe(9);
    b = b.clickBlockTouch(2); // click the block area directly instead of an attack landing zone
    expect(b.step.kind).toBe('BLOCK_COUNT');
    if (b.step.kind !== 'BLOCK_COUNT') throw new Error('unreachable');
    expect(b.step.team).toBe('home'); // defending team blocks
    b = b.clickBlockCount(1);
    expect(b.step.kind).toBe('BLOCK_PLAYER');
    b = b.clickPlayer(3); // touch zone (2) is already captured, jumps straight to BLOCK_LANDING
    expect(b.step.kind).toBe('BLOCK_LANDING');
    b = b.clickZone(9).clickGrade('#');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    expect(actions[2]).toMatchObject({ team: 'away', skill: 'A', playerNumber: 9, startZone: null, endZone: null, effect: '!' });
    expect(actions[3]).toMatchObject({ team: 'home', skill: 'B', playerNumber: 3, startZone: 2, endZone: 9, effect: '#' });
    expect(outcome.pointTeam).toBe('home');
  });

  it('clickBlockTouch then clickBlockCount(0): falls back to a normal attack continuation', () => {
    let b = createClickRallyBuilder('home', 1);
    b = b.clickZone(1).clickZone(5).skipGrade();
    b = b.clickPlayer(7).skipGrade();
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    b = b.clickPlayer(9).clickBlockTouch(2);
    if (b.step.kind !== 'BLOCK_COUNT') throw new Error('unreachable');
    b = b.clickBlockCount(0);
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER (ball crosses back)');
    expect(b.step.team).toBe('home');
    b = b.clickPlayer(4).skipZone().clickZone(6).clickGrade('#');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const { actions, outcome } = done(b.step.codeString);
    expect(actions.filter((a) => a.skill === 'B')).toHaveLength(0);
    expect(outcome.pointTeam).toBe('home');
  });

  it('round-trips through parseCode for a full rally (pipeline-reuse contract)', () => {
    let b = createClickRallyBuilder('away', 2);
    b = b.clickZone(2, 'a').clickZone(8, 'c').clickGrade('-');
    b = b.clickPlayer(11).clickGrade('!');
    if (b.step.kind !== 'ATTACK_PLAYER') throw new Error('expected ATTACK_PLAYER');
    expect(b.step.team).toBe('home');
    b = b.clickPlayer(4).skipZone().clickZone(5).clickGrade('#');
    if (b.step.kind !== 'RALLY_DONE') throw new Error('unreachable');
    const parsed = parseCode(b.step.codeString);
    expect(parsed.actions).toHaveLength(3);
    expect(parsed.actions[0]).toMatchObject({ team: 'away', skill: 'S', startZone: 2, startSubzone: 'a', endZone: 8, endSubzone: 'c', effect: '-' });
    expect(parsed.actions[1]).toMatchObject({ team: 'home', skill: 'R', playerNumber: 11, effect: '!' });
    expect(parsed.actions[2]).toMatchObject({ team: 'home', skill: 'A', playerNumber: 4, startZone: 5, endZone: null, effect: '#' });
  });
});
