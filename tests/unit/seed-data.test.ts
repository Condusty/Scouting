import { describe, it, expect } from 'vitest';
import { buildSeedData } from '../../scripts/seed-data';

describe('buildSeedData', () => {
  const data = buildSeedData();

  it('returns 1 season and 6 teams', () => {
    expect(data.teams).toHaveLength(6);
    expect(data.season.code).toBeTruthy();
  });

  it('each team has 14 players with correct position distribution', () => {
    for (const t of data.teams) {
      expect(t.players).toHaveLength(14);
      const counts: Record<string, number> = {};
      for (const p of t.players) {
        const pos = p.player.position!;
        counts[pos] = (counts[pos] ?? 0) + 1;
      }
      expect(counts).toEqual({ S: 2, L: 2, OH: 4, MB: 3, OPP: 3 });
    }
  });

  it('player codes are globally unique', () => {
    const codes = data.teams.flatMap((t) => t.players.map((p) => p.player.code));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('shirt numbers are unique per team within 1-18', () => {
    for (const t of data.teams) {
      const numbers = t.players.map((p) => p.roster.shirt_number);
      expect(new Set(numbers).size).toBe(14);
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(18);
      }
    }
  });

  it('is_setter/is_libero match position, height/weight/reach are set', () => {
    for (const t of data.teams) {
      for (const p of t.players) {
        expect(p.roster.is_setter).toBe(p.player.position === 'S');
        expect(p.roster.is_libero).toBe(p.player.position === 'L');
        expect(p.player.height_cm).toBeGreaterThan(150);
        expect(p.player.weight_kg).toBeGreaterThan(50);
        expect(p.player.reach_cm).toBeGreaterThan(p.player.height_cm!);
      }
    }
  });
});
