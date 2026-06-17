import { describe, it, expect } from 'vitest';
import { setTargetScore, isSetComplete } from '@renderer/lib/scoring';

describe('setTargetScore', () => {
  it('returns 25 for sets 1–4', () => {
    expect(setTargetScore(1)).toBe(25);
    expect(setTargetScore(4)).toBe(25);
  });
  it('returns 15 for set 5', () => {
    expect(setTargetScore(5)).toBe(15);
  });
});

describe('isSetComplete', () => {
  it('false at 24:24', () => expect(isSetComplete(24, 24, 1)).toBe(false));
  it('true at 25:23', () => expect(isSetComplete(25, 23, 1)).toBe(true));
  it('false at 25:24 — no 2-point lead', () => expect(isSetComplete(25, 24, 1)).toBe(false));
  it('true at 26:24 — deuce extended', () => expect(isSetComplete(26, 24, 1)).toBe(true));
  it('false at 14:13 set 5', () => expect(isSetComplete(14, 13, 5)).toBe(false));
  it('true at 15:13 set 5', () => expect(isSetComplete(15, 13, 5)).toBe(true));
  it('false at 15:14 set 5 — deuce', () => expect(isSetComplete(15, 14, 5)).toBe(false));
});
