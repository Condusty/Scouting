import type { Action, Rally, Skill, Effect, TeamSide } from '@shared/types';

export type SkillStats = {
  total: number;
  excellent: number;
  positive: number;
  neutral: number;
  negative: number;
  freeball: number;
  error: number;
  efficiency: number;
};

export type PlayerSkillStats = SkillStats & {
  playerNumber: number;
  playerId: number | null;
};

export type SkillReport = {
  team: SkillStats;
  byPlayer: PlayerSkillStats[];
};

export type TeamReport = Partial<Record<Skill, SkillReport>>;

export type SetScore = {
  setNumber: number;
  homeScore: number;
  awayScore: number;
};

export type MatchReportData = {
  home: TeamReport;
  away: TeamReport;
  setScores: SetScore[];
};

export type ServeZoneFlow = {
  startZone: number | null;
  startSubzone: string | null;
  endZone: number | null;
  endSubzone: string | null;
  count: number;
  excellentCount: number;
  errorCount: number;
};

function emptyStats(): SkillStats {
  return { total: 0, excellent: 0, positive: 0, neutral: 0, negative: 0, freeball: 0, error: 0, efficiency: 0 };
}

function applyEffect(stats: SkillStats, effect: Effect | null): void {
  stats.total++;
  if (effect === '#') stats.excellent++;
  else if (effect === '+') stats.positive++;
  else if (effect === '!') stats.neutral++;
  else if (effect === '-') stats.negative++;
  else if (effect === '/') stats.freeball++;
  else if (effect === '=') stats.error++;
  stats.efficiency = stats.total === 0 ? 0 : (stats.excellent - stats.error) / stats.total;
}

function buildTeamReport(actions: Action[], team: TeamSide): TeamReport {
  const report: TeamReport = {};
  for (const action of actions.filter((a) => a.team === team)) {
    const skill = action.skill;
    if (!report[skill]) report[skill] = { team: emptyStats(), byPlayer: [] };
    const sr = report[skill]!;
    applyEffect(sr.team, action.effect);
    if (action.player_number !== null) {
      let ps = sr.byPlayer.find((p) => p.playerNumber === action.player_number);
      if (!ps) {
        ps = { ...emptyStats(), playerNumber: action.player_number, playerId: action.player_id };
        sr.byPlayer.push(ps);
      }
      applyEffect(ps, action.effect);
    }
  }
  return report;
}

function buildSetScores(rallies: Rally[]): SetScore[] {
  const latestBySet = new Map<number, Rally>();
  for (const r of rallies) {
    const ex = latestBySet.get(r.set_number);
    if (!ex || r.rally_number > ex.rally_number) latestBySet.set(r.set_number, r);
  }
  return Array.from(latestBySet.entries())
    .sort(([a], [b]) => a - b)
    .map(([setNumber, r]) => ({
      setNumber,
      homeScore: r.home_score_after ?? 0,
      awayScore: r.away_score_after ?? 0,
    }));
}

export function buildMatchReport(actions: Action[], rallies: Rally[]): MatchReportData {
  return {
    home: buildTeamReport(actions, 'home'),
    away: buildTeamReport(actions, 'away'),
    setScores: buildSetScores(rallies),
  };
}

export function buildServeFlows(actions: Action[]): ServeZoneFlow[] {
  const map = new Map<string, ServeZoneFlow>();
  for (const s of actions.filter((a) => a.skill === 'S')) {
    const key = `${s.start_zone ?? 'null'}${s.start_subzone ?? ''}-${s.end_zone ?? 'null'}${s.end_subzone ?? ''}`;
    let flow = map.get(key);
    if (!flow) {
      flow = {
        startZone: s.start_zone, startSubzone: s.start_subzone ?? null,
        endZone: s.end_zone, endSubzone: s.end_subzone ?? null,
        count: 0, excellentCount: 0, errorCount: 0,
      };
      map.set(key, flow);
    }
    flow.count++;
    if (s.effect === '#') flow.excellentCount++;
    if (s.effect === '=') flow.errorCount++;
  }
  return Array.from(map.values());
}
