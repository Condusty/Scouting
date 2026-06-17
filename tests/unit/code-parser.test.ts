import { describe, it, expect } from 'vitest';
import { parseCode } from '../../src/renderer/lib/code-parser';

describe('parseCode', () => {
  it('parses a full action with team, subtype, effect and zones', () => {
    const result = parseCode('a10SQ#15');
    expect(result.rawInput).toBe('a10SQ#15');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toEqual({
      team: 'away',
      playerNumber: 10,
      skill: 'S',
      skillSubtype: 'Q',
      startZone: 1,
      endZone: 5,
      startSubzone: null,
      endSubzone: null,
      effect: '#',
      rawToken: 'a10SQ#15',
    });
    expect(result.subs).toEqual([]);
    expect(result.timeouts).toEqual([]);
    expect(result.pointTeam).toBeNull();
    expect(result.rotationSet).toBeNull();
  });

  it('parses a float serve subtype (H)', () => {
    const result = parseCode('14SH');
    expect(result.actions[0]).toEqual({
      team: 'home',
      playerNumber: 14,
      skill: 'S',
      skillSubtype: 'H',
      startZone: null,
      endZone: null,
      startSubzone: null,
      endSubzone: null,
      effect: null,
      rawToken: '14SH',
    });
  });

  it('parses a single-digit player reception with single zone, defaulting to home team', () => {
    const result = parseCode('7R#1');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toEqual({
      team: 'home',
      playerNumber: 7,
      skill: 'R',
      skillSubtype: null,
      startZone: 1,
      endZone: null,
      startSubzone: null,
      endSubzone: null,
      effect: '#',
      rawToken: '7R#1',
    });
  });

  it('parses a minimal action with only player number and skill', () => {
    const result = parseCode('14S');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toEqual({
      team: 'home',
      playerNumber: 14,
      skill: 'S',
      skillSubtype: null,
      startZone: null,
      endZone: null,
      startSubzone: null,
      endSubzone: null,
      effect: null,
      rawToken: '14S',
    });
  });

  it('parses multiple actions separated by "."', () => {
    const result = parseCode('14A#5.a3B=');
    expect(result.actions).toHaveLength(2);
    expect(result.actions[0]).toEqual({
      team: 'home',
      playerNumber: 14,
      skill: 'A',
      skillSubtype: null,
      startZone: 5,
      endZone: null,
      startSubzone: null,
      endSubzone: null,
      effect: '#',
      rawToken: '14A#5',
    });
    expect(result.actions[1]).toEqual({
      team: 'away',
      playerNumber: 3,
      skill: 'B',
      skillSubtype: null,
      startZone: null,
      endZone: null,
      startSubzone: null,
      endSubzone: null,
      effect: '=',
      rawToken: 'a3B=',
    });
    expect(result.pointTeam).toBeNull();
  });

  it('parses a home substitution', () => {
    const result = parseCode('C11:24');
    expect(result.subs).toEqual([{ team: 'home', out: 11, in: 24 }]);
    expect(result.actions).toEqual([]);
  });

  it('parses an away substitution', () => {
    const result = parseCode('aC5:8');
    expect(result.subs).toEqual([{ team: 'away', out: 5, in: 8 }]);
    expect(result.actions).toEqual([]);
  });

  it('parses a home timeout', () => {
    const result = parseCode('T');
    expect(result.timeouts).toEqual([{ team: 'home' }]);
  });

  it('parses an away timeout', () => {
    const result = parseCode('aT');
    expect(result.timeouts).toEqual([{ team: 'away' }]);
  });

  it('parses a home point award', () => {
    const result = parseCode('P');
    expect(result.pointTeam).toBe('home');
  });

  it('parses an away point award', () => {
    const result = parseCode('Pa');
    expect(result.pointTeam).toBe('away');
  });

  it('parses a rotation set', () => {
    const result = parseCode('I3');
    expect(result.rotationSet).toBe(3);
  });

  it('returns an empty ParsedRally for an empty string', () => {
    const result = parseCode('');
    expect(result).toEqual({
      actions: [],
      subs: [],
      timeouts: [],
      pointTeam: null,
      rotationSet: null,
      rawInput: '',
    });
  });

  it('returns an empty ParsedRally for whitespace-only input', () => {
    const result = parseCode('   ');
    expect(result.actions).toEqual([]);
    expect(result.subs).toEqual([]);
    expect(result.timeouts).toEqual([]);
    expect(result.pointTeam).toBeNull();
    expect(result.rotationSet).toBeNull();
    expect(result.rawInput).toBe('   ');
  });

  it('skips unknown tokens without throwing', () => {
    const result = parseCode('14A#5.???.aT');
    expect(result.actions).toHaveLength(1);
    expect(result.timeouts).toEqual([{ team: 'away' }]);
  });

  it('parses sub-zone on start zone', () => {
    const a = parseCode('7R#1a').actions[0];
    expect(a.startZone).toBe(1);
    expect(a.startSubzone).toBe('a');
    expect(a.endZone).toBeNull();
    expect(a.endSubzone).toBeNull();
  });

  it('parses sub-zone on end zone only', () => {
    const a = parseCode('14A#5d').actions[0];
    expect(a.startZone).toBe(5);
    expect(a.startSubzone).toBe('d');
    expect(a.endZone).toBeNull();
    expect(a.endSubzone).toBeNull();
  });

  it('parses sub-zone on two-zone code', () => {
    const a = parseCode('a10SQ#15b').actions[0];
    expect(a.startZone).toBe(1);
    expect(a.startSubzone).toBeNull();
    expect(a.endZone).toBe(5);
    expect(a.endSubzone).toBe('b');
  });

  it('parses sub-zones on both zones', () => {
    const a = parseCode('10S#1a5c').actions[0];
    expect(a.startZone).toBe(1);
    expect(a.startSubzone).toBe('a');
    expect(a.endZone).toBe(5);
    expect(a.endSubzone).toBe('c');
  });

  it('zone without sub-zone still works', () => {
    const a = parseCode('7R#9').actions[0];
    expect(a.startZone).toBe(9);
    expect(a.startSubzone).toBeNull();
  });
});
