import type { CreatePlayerDTO, CreateSeasonDTO, CreateTeamDTO, Position } from '@shared/types';

export interface PlayerSeed {
  player: CreatePlayerDTO;
  roster: { shirt_number: number; is_libero: boolean; is_setter: boolean };
}

export interface TeamSeed {
  team: CreateTeamDTO;
  players: PlayerSeed[];
}

export interface SeedData {
  season: CreateSeasonDTO;
  teams: TeamSeed[];
}

export const NATIONAL_TEAMS: { name: string; code: string }[] = [
  { name: 'Deutschland', code: 'GER' },
  { name: 'Polen', code: 'POL' },
  { name: 'Italien', code: 'ITA' },
  { name: 'Brasilien', code: 'BRA' },
  { name: 'USA', code: 'USA' },
  { name: 'Frankreich', code: 'FRA' },
];

export const SEASON: CreateSeasonDTO = {
  name: 'Test-Saison 2025/26',
  code: 'TEST-2526',
  start_date: '2025-09-01',
  end_date: '2026-05-31',
  default_video_dir: null,
};

// 14 entries: 2x S, 2x L, 4x OH, 3x MB, 3x OPP
export const ROSTER_PLAN: Position[] = [
  'S', 'S',
  'L', 'L',
  'OH', 'OH', 'OH', 'OH',
  'MB', 'MB', 'MB',
  'OPP', 'OPP', 'OPP',
];

export const NAME_POOLS: Record<string, { first: string[]; last: string[] }> = {
  GER: {
    first: ['Lukas', 'Tobias', 'Florian', 'Jonas', 'Maximilian', 'Niklas', 'Sebastian', 'Moritz', 'Felix', 'Julian', 'Simon', 'Philipp', 'Anton', 'David'],
    last: ['Schneider', 'Becker', 'Hoffmann', 'Wagner', 'Richter', 'Klein', 'Wolf', 'Schroeder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krueger', 'Hartmann'],
  },
  POL: {
    first: ['Bartosz', 'Kacper', 'Mateusz', 'Wojciech', 'Damian', 'Lukasz', 'Marcin', 'Tomasz', 'Pawel', 'Adrian', 'Krzysztof', 'Grzegorz', 'Dawid', 'Rafal'],
    last: ['Kowalski', 'Nowak', 'Wisniewski', 'Wojcik', 'Kaminski', 'Lewandowski', 'Zielinski', 'Szymanski', 'Dabrowski', 'Kozlowski', 'Jankowski', 'Mazur', 'Krawczyk', 'Piotrowski'],
  },
  ITA: {
    first: ['Matteo', 'Lorenzo', 'Andrea', 'Francesco', 'Alessandro', 'Davide', 'Simone', 'Riccardo', 'Marco', 'Gabriele', 'Stefano', 'Federico', 'Luca', 'Daniele'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'Mancini'],
  },
  BRA: {
    first: ['Lucas', 'Gustavo', 'Rafael', 'Bruno', 'Thiago', 'Felipe', 'Diego', 'Eduardo', 'Vinicius', 'Leandro', 'Caio', 'Rodrigo', 'Andre', 'Gabriel'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Carvalho', 'Almeida', 'Ribeiro', 'Lima', 'Araujo', 'Fernandes', 'Barbosa', 'Rocha'],
  },
  USA: {
    first: ['Tyler', 'Brandon', 'Cody', 'Jordan', 'Austin', 'Garrett', 'Trevor', 'Mason', 'Dylan', 'Connor', 'Hunter', 'Logan', 'Cameron', 'Blake'],
    last: ['Anderson', 'Johnson', 'Williams', 'Miller', 'Thompson', 'Mitchell', 'Carter', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards'],
  },
  FRA: {
    first: ['Theo', 'Hugo', 'Antoine', 'Maxime', 'Nicolas', 'Romain', 'Thomas', 'Julien', 'Quentin', 'Alexandre', 'Mathieu', 'Benjamin', 'Clement', 'Pierre'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia'],
  },
};

interface PositionRange {
  height: [number, number];
  weight: [number, number];
  reachOffset: [number, number];
}

export const POSITION_RANGES: Record<Exclude<Position, 'DS'>, PositionRange> = {
  S: { height: [188, 198], weight: [78, 88], reachOffset: [30, 34] },
  L: { height: [178, 188], weight: [70, 80], reachOffset: [28, 32] },
  OH: { height: [195, 203], weight: [85, 95], reachOffset: [30, 35] },
  MB: { height: [200, 210], weight: [88, 100], reachOffset: [32, 38] },
  OPP: { height: [196, 205], weight: [88, 98], reachOffset: [30, 35] },
};

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildSeedData(): SeedData {
  const allShirtNumbers = Array.from({ length: 18 }, (_, i) => i + 1);

  const teams: TeamSeed[] = NATIONAL_TEAMS.map((team) => {
    const shirtNumbers = shuffle(allShirtNumbers).slice(0, 14);
    const namePool = NAME_POOLS[team.code];

    const players: PlayerSeed[] = ROSTER_PLAN.map((position, i) => {
      const ranges = POSITION_RANGES[position as Exclude<Position, 'DS'>];
      const height = randInt(ranges.height[0], ranges.height[1]);
      const reach = height + randInt(ranges.reachOffset[0], ranges.reachOffset[1]);
      const weight = randInt(ranges.weight[0], ranges.weight[1]);

      return {
        player: {
          code: `${team.code}-${String(i + 1).padStart(2, '0')}`,
          first_name: namePool.first[i],
          last_name: namePool.last[i],
          position,
          height_cm: height,
          weight_kg: weight,
          reach_cm: reach,
          photo_path: null,
        },
        roster: {
          shirt_number: shirtNumbers[i],
          is_libero: position === 'L',
          is_setter: position === 'S',
        },
      };
    });

    return {
      team: { name: team.name, code: team.code, coach: null },
      players,
    };
  });

  return { season: SEASON, teams };
}
