import { create } from 'zustand';
import type {
  LineupSelection,
  ParsedRally,
  Rally,
  ScoringState,
  ScoutingSession,
  ScoutingValidationError,
} from '@shared/types';
import { matchesApi } from '@renderer/api/matches.api';
import { rosterApi } from '@renderer/api/roster.api';
import { scoutingApi } from '@renderer/api/scouting.api';
import { parseCode } from '@renderer/lib/code-parser';
import { validateRally } from '@renderer/lib/code-validator';
import { deriveOutcome } from '@renderer/lib/scoring';

interface ScoutingStore {
  session: ScoutingSession | null;
  rallies: Rally[];
  currentInput: string;
  validationErrors: ScoutingValidationError[];
  pendingRally: ParsedRally | null;
  needsLineup: boolean;
  initialState: ScoringState | null;
  error: string | null;

  startSession: (matchId: number, setNumber: number) => Promise<void>;
  setLineup: (selection: LineupSelection) => void;
  setInput: (raw: string) => void;
  submitCode: () => Promise<void>;
  undoLastRally: () => Promise<void>;
  nextSet: () => Promise<void>;
}

/**
 * Reduces a single completed rally onto a scoring state, reproducing the
 * outcome it originally produced (the rally's `point_team` short-circuits
 * `determinePointTeam`, so this matches the original `deriveOutcome` call).
 * Manual `Z`/`I` overrides applied at submit-time aren't replayed here -
 * acceptable Phase-1 edge case (see submitCode).
 */
function reduceRally(rally: Rally, state: ScoringState): ScoringState {
  const outcome = deriveOutcome(
    {
      actions: [],
      subs: [],
      timeouts: [],
      pointTeam: rally.point_team,
      rotationSet: null,
      sideSwitch: null,
      rawInput: rally.raw_input ?? '',
    },
    state,
  );
  const { homeScore, awayScore, rotationHome, rotationAway, servingTeam } = outcome;
  return { homeScore, awayScore, rotationHome, rotationAway, servingTeam };
}

export const useScoutingStore = create<ScoutingStore>((set, get) => ({
  session: null,
  rallies: [],
  currentInput: '',
  validationErrors: [],
  pendingRally: null,
  needsLineup: false,
  initialState: null,
  error: null,

  startSession: async (matchId, setNumber) => {
    try {
      const match = await matchesApi.get(matchId);
      const [homeRoster, awayRoster] = await Promise.all([
        rosterApi.get(match.home_team_id),
        rosterApi.get(match.away_team_id),
      ]);
      const rallies = await scoutingApi.listRallies(matchId, setNumber);

      set({
        session: {
          matchId,
          setNumber,
          homeScore: 0,
          awayScore: 0,
          rotationHome: 1,
          rotationAway: 1,
          servingTeam: 'home',
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          homeRoster,
          awayRoster,
          homeLineup: [],
          awayLineup: [],
          currentSide: 1,
        },
        rallies,
        needsLineup: true,
        initialState: null,
        currentInput: '',
        pendingRally: null,
        validationErrors: [],
        error: null,
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  setLineup: (selection) => {
    const { session } = get();
    if (session === null) return;

    set({
      session: {
        ...session,
        homeLineup: selection.homeLineup,
        awayLineup: selection.awayLineup,
        rotationHome: selection.rotationHome,
        rotationAway: selection.rotationAway,
        servingTeam: selection.servingTeam,
      },
      needsLineup: false,
      initialState: {
        homeScore: 0,
        awayScore: 0,
        rotationHome: selection.rotationHome,
        rotationAway: selection.rotationAway,
        servingTeam: selection.servingTeam,
      },
    });
  },

  setInput: (raw) => {
    const { session } = get();
    const pendingRally = parseCode(raw);
    set({
      currentInput: raw,
      pendingRally,
      validationErrors: session ? validateRally(pendingRally, session) : [],
    });
  },

  submitCode: async () => {
    const { session, pendingRally, validationErrors, rallies } = get();
    if (session === null || pendingRally === null) return;
    if (validationErrors.length > 0) return;

    const outcome = deriveOutcome(pendingRally, {
      homeScore: session.homeScore,
      awayScore: session.awayScore,
      rotationHome: session.rotationHome,
      rotationAway: session.rotationAway,
      servingTeam: session.servingTeam,
    });

    // Manual rotation override (Z<n>): overwrite the serving team's rotation.
    // Note: not replayed by undoLastRally's reduction - acceptable Phase-1 edge case.
    if (pendingRally.rotationSet !== null) {
      if (outcome.servingTeam === 'home') {
        outcome.rotationHome = pendingRally.rotationSet;
      } else {
        outcome.rotationAway = pendingRally.rotationSet;
      }
    }

    const rallyNumber = rallies.length + 1;

    try {
      const newRally = await scoutingApi.createRally(
        {
          matchId: session.matchId,
          setNumber: session.setNumber,
          rallyNumber,
          rotationHome: outcome.rotationHome,
          rotationAway: outcome.rotationAway,
          pointTeam: outcome.pointTeam,
          homeScoreAfter: outcome.homeScore,
          awayScoreAfter: outcome.awayScore,
          rawInput: pendingRally.rawInput,
        },
        pendingRally.actions,
      );

      for (const sub of pendingRally.subs) {
        await scoutingApi.createSub({
          matchId: session.matchId,
          setNumber: session.setNumber,
          afterRally: newRally.rally_number,
          team: sub.team,
          playerOutNum: sub.out,
          playerInNum: sub.in,
        });
      }

      for (const timeout of pendingRally.timeouts) {
        await scoutingApi.createTimeout({
          matchId: session.matchId,
          setNumber: session.setNumber,
          afterRally: newRally.rally_number,
          team: timeout.team,
        });
      }

      const currentSide = pendingRally.sideSwitch !== null ? pendingRally.sideSwitch : session.currentSide;

      set({
        rallies: [...rallies, newRally],
        session: {
          ...session,
          homeScore: outcome.homeScore,
          awayScore: outcome.awayScore,
          rotationHome: outcome.rotationHome,
          rotationAway: outcome.rotationAway,
          servingTeam: outcome.servingTeam,
          currentSide,
        },
        currentInput: '',
        pendingRally: null,
        validationErrors: [],
        error: null,
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  undoLastRally: async () => {
    const { session, rallies, initialState } = get();
    if (session === null || rallies.length === 0 || initialState === null) return;

    const lastRally = rallies[rallies.length - 1];
    const remaining = rallies.slice(0, -1);

    try {
      await scoutingApi.deleteRally(lastRally.id);
    } catch (e) {
      set({ error: (e as Error).message });
      return;
    }

    let acc: ScoringState = initialState;
    for (const rally of remaining) {
      acc = reduceRally(rally, acc);
    }

    set({
      rallies: remaining,
      session: {
        ...session,
        homeScore: acc.homeScore,
        awayScore: acc.awayScore,
        rotationHome: acc.rotationHome,
        rotationAway: acc.rotationAway,
        servingTeam: acc.servingTeam,
      },
      error: null,
    });
  },

  nextSet: async () => {
    const { session } = get();
    if (session === null) return;

    set({
      session: {
        ...session,
        setNumber: session.setNumber + 1,
        homeScore: 0,
        awayScore: 0,
        homeLineup: [],
        awayLineup: [],
        currentSide: 1,
      },
      rallies: [],
      currentInput: '',
      pendingRally: null,
      validationErrors: [],
      initialState: null,
      needsLineup: true,
    });
  },
}));
