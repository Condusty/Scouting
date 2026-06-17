'use strict';
/**
 * Komplettes Test-Spiel (GER vs POL, 3 Sätze) in die Dev-DB laden.
 * Starten: npm run seed
 * (läuft via electron, damit better-sqlite3 die richtige Node-Version hat)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(process.cwd(), 'scouting.dev.db');

// ---------------------------------------------------------------------------
// DB öffnen + Migrationen
// ---------------------------------------------------------------------------
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function applyMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);
  const applied = new Set(
    db.prepare('SELECT version FROM migrations').all().map((r) => r.version),
  );
  const files = [
    [1, 'src/main/db/migrations/001_initial.sql'],
    [2, 'src/main/db/migrations/002_set_lineups.sql'],
    [3, 'src/main/db/migrations/003_subzones.sql'],
  ];
  for (const [v, file] of files) {
    if (applied.has(v)) continue;
    db.exec(fs.readFileSync(path.join(process.cwd(), file), 'utf-8'));
    db.prepare('INSERT INTO migrations(version) VALUES (?)').run(v);
  }
}

// ---------------------------------------------------------------------------
// Daten löschen
// ---------------------------------------------------------------------------
function wipe() {
  db.pragma('foreign_keys = OFF');
  for (const t of [
    'timeouts','substitutions','actions','rallies','sets',
    'matches','team_players','players','season_teams','teams','seasons',
  ]) db.exec(`DELETE FROM ${t}`);
  db.pragma('foreign_keys = ON');
}

// ---------------------------------------------------------------------------
// Stammdaten
// ---------------------------------------------------------------------------
function insertMaster() {
  const season = db.prepare(
    `INSERT INTO seasons (name,code,start_date,end_date,default_video_dir)
     VALUES ('Volleyball Nations League 2025','VNL-2025','2025-06-01','2025-07-31',null)`,
  ).run();

  const ger = db.prepare(
    `INSERT INTO teams (name,code,coach) VALUES ('Deutschland','GER','Dr. Vital Heynen')`,
  ).run();
  const pol = db.prepare(
    `INSERT INTO teams (name,code,coach) VALUES ('Polen','POL','Nikola Grbic')`,
  ).run();

  db.prepare('INSERT INTO season_teams(season_id,team_id) VALUES (?,?)').run(season.lastInsertRowid, ger.lastInsertRowid);
  db.prepare('INSERT INTO season_teams(season_id,team_id) VALUES (?,?)').run(season.lastInsertRowid, pol.lastInsertRowid);

  const insPlayer = db.prepare(
    `INSERT INTO players (code,first_name,last_name,position,height_cm,weight_kg,reach_cm)
     VALUES (@code,@fn,@ln,@pos,@h,@w,@r)`,
  );
  const insRoster = db.prepare(
    `INSERT INTO team_players (team_id,player_id,shirt_number,is_libero,is_setter)
     VALUES (?,?,?,?,?)`,
  );

  // GER players
  const gerPlayers = [
    { code:'GER-MUL', fn:'Lukas',      ln:'Müller',     pos:'S',   h:193, w:82, r:224, shirt:7,  lib:0, set:1 },
    { code:'GER-WEI', fn:'Georg',      ln:'Grozer',     pos:'OPP', h:202, w:96, r:333, shirt:9,  lib:0, set:0 },
    { code:'GER-LEH', fn:'Timothée',   ln:'Carle',      pos:'OH',  h:198, w:90, r:328, shirt:1,  lib:0, set:0 },
    { code:'GER-SCH', fn:'Anton',      ln:'Brehme',     pos:'MB',  h:206, w:97, r:338, shirt:3,  lib:0, set:0 },
    { code:'GER-MAY', fn:'Tobias',     ln:'Krick',      pos:'OH',  h:195, w:88, r:325, shirt:5,  lib:0, set:0 },
    { code:'GER-KLE', fn:'Julian',     ln:'Zenger',     pos:'L',   h:182, w:74, r:310, shirt:11, lib:1, set:0 },
    { code:'GER-BRU', fn:'Moritz',     ln:'Reichert',   pos:'MB',  h:208, w:99, r:342, shirt:14, lib:0, set:0 },
    { code:'GER-HOF', fn:'Ruben',      ln:'Schott',     pos:'OH',  h:196, w:89, r:327, shirt:16, lib:0, set:0 },
  ];
  // POL players
  const polPlayers = [
    { code:'POL-KUB', fn:'Fabian',     ln:'Drzyzga',    pos:'S',   h:192, w:80, r:222, shirt:8,  lib:0, set:1 },
    { code:'POL-KLE', fn:'Bartosz',    ln:'Kurek',      pos:'OPP', h:201, w:94, r:331, shirt:10, lib:0, set:0 },
    { code:'POL-ZAY', fn:'Wilfredo',   ln:'Leon',       pos:'OH',  h:197, w:91, r:327, shirt:2,  lib:0, set:0 },
    { code:'POL-MUS', fn:'Piotr',      ln:'Nowakowski', pos:'MB',  h:207, w:98, r:340, shirt:4,  lib:0, set:0 },
    { code:'POL-BIE', fn:'Michal',     ln:'Kubiak',     pos:'OH',  h:194, w:87, r:324, shirt:6,  lib:0, set:0 },
    { code:'POL-WAS', fn:'Pawel',      ln:'Zatorski',   pos:'L',   h:183, w:75, r:311, shirt:12, lib:1, set:0 },
    { code:'POL-GRB', fn:'Mateusz',    ln:'Bieniek',    pos:'MB',  h:210, w:102,r:345, shirt:15, lib:0, set:0 },
    { code:'POL-SIT', fn:'Marcin',     ln:'Janusz',     pos:'OH',  h:195, w:88, r:325, shirt:17, lib:0, set:0 },
  ];

  const gerIds = {};
  for (const p of gerPlayers) {
    const r = insPlayer.run({ code:p.code, fn:p.fn, ln:p.ln, pos:p.pos, h:p.h, w:p.w, r:p.r });
    insRoster.run(ger.lastInsertRowid, r.lastInsertRowid, p.shirt, p.lib, p.set);
    gerIds[p.shirt] = Number(r.lastInsertRowid);
  }
  const polIds = {};
  for (const p of polPlayers) {
    const r = insPlayer.run({ code:p.code, fn:p.fn, ln:p.ln, pos:p.pos, h:p.h, w:p.w, r:p.r });
    insRoster.run(pol.lastInsertRowid, r.lastInsertRowid, p.shirt, p.lib, p.set);
    polIds[p.shirt] = Number(r.lastInsertRowid);
  }

  const match = db.prepare(
    `INSERT INTO matches (season_id,home_team_id,away_team_id,match_date,venue,comment)
     VALUES (?,?,?,?,?,?)`,
  ).run(
    season.lastInsertRowid, ger.lastInsertRowid, pol.lastInsertRowid,
    '2025-06-15', 'Ankara Arena', 'Vorrunde Gruppe A — Testspieleintrag',
  );

  return {
    matchId: Number(match.lastInsertRowid),
    gerTeamId: Number(ger.lastInsertRowid),
    polTeamId: Number(pol.lastInsertRowid),
    gerIds, polIds,
  };
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen für Rotations-Tracking
// ---------------------------------------------------------------------------
function nextRot(r) { return r === 6 ? 1 : r + 1; }

function advance(state, pointTeam) {
  const s = { ...state };
  if (pointTeam === 'home') s.homeScore++;
  else s.awayScore++;
  if (pointTeam !== s.serving) {
    if (pointTeam === 'home') s.rotHome = nextRot(s.rotHome);
    else s.rotAway = nextRot(s.rotAway);
    s.serving = pointTeam;
  }
  return s;
}

function server(lineup, rot) { return lineup[rot - 1]; }

// ---------------------------------------------------------------------------
// Action-Builder
// a(team,num,skill,subtype,effect,sz,ez,ssz,esz)
// ---------------------------------------------------------------------------
function a(team, num, skill, subtype, effect, sz, ez, ssz, esz) {
  return { team, num, skill, subtype: subtype||null, effect: effect||null,
           sz: sz||null, ez: ez||null, ssz: ssz||null, esz: esz||null };
}

// Deterministische pseudo-zufällige Sequenz
function pseudoRand(i) { return (Math.sin(i * 9.7 + 3.1) * 0.5 + 0.5); }

// Rally-Templates: gibt actions[] zurück
// h=home lineup, a=away lineup, rot_h, rot_a, hs=home serving?
function rallyActions(pointTeam, rallyIdx, hLinup, aLinup, rotH, rotA, serving) {
  const hSrv = server(hLinup, rotH);
  const aSrv = server(aLinup, rotA);
  const t = rallyIdx % 10; // cycle through 10 templates

  if (serving === 'home') {
    // Home serves
    if (pointTeam === 'home') {
      // Home scores while serving
      switch (t % 5) {
        case 0: return [a('home',hSrv,'S','Q','#',null,5,null,'b')];
        case 1: return [a('home',hSrv,'S','H','#',null,1,null,'a')];
        case 2: return [
          a('home',hSrv,'S','M','-',null,6),
          a('away',aLinup[1],'R',null,'-',3),
          a('away',aSrv,'E',null,'/',3),
          a('home',hLinup[4],'A',null,'#',4,null,null,'c'),
        ];
        case 3: return [
          a('home',hSrv,'S','H','+',null,5),
          a('away',aLinup[2],'R',null,'!',1),
          a('away',aSrv,'E',null,'+',3),
          a('away',aLinup[1],'A',null,'=',4,'2'),
        ];
        case 4: return [
          a('home',hSrv,'S','Q','-',null,6,'b'),
          a('away',aLinup[0],'R',null,'+',1),
          a('away',aSrv,'E',null,'+',3),
          a('away',aLinup[4],'A',null,'+',4),
          a('home',hLinup[2],'D',null,'#',5),
          a('home',hLinup[0],'E',null,'+',1,'3'),
          a('home',hLinup[4],'A',null,'#',2,null,null,'d'),
        ];
      }
    } else {
      // Away scores while home serves (side-out for away)
      switch (t % 5) {
        case 0: return [a('home',hSrv,'S','H','=')];
        case 1: return [
          a('home',hSrv,'S','M','+',null,5),
          a('away',aLinup[0],'R',null,'#',1),
          a('away',aSrv,'E',null,'+',3),
          a('away',aLinup[4],'A',null,'#',6,null,null,'a'),
        ];
        case 2: return [
          a('home',hSrv,'S','Q','-',null,6),
          a('away',aLinup[1],'R',null,'+',3),
          a('away',aSrv,'E',null,'+',2),
          a('away',aLinup[4],'A',null,'+',4),
          a('home',hLinup[2],'B',null,'='),
        ];
        case 3: return [
          a('home',hSrv,'S','T','+',null,1,'a'),
          a('away',aLinup[5],'R',null,'!',6),
          a('away',aSrv,'E',null,'+',3),
          a('away',aLinup[0],'A',null,'#',5),
        ];
        case 4: return [
          a('home',hSrv,'S','Q','+',null,6),
          a('away',aLinup[2],'R',null,'+',2),
          a('away',aSrv,'E',null,'+',1),
          a('away',aLinup[4],'A',null,'+',4),
          a('home',hLinup[2],'D',null,'-',2),
          a('home',hLinup[0],'A',null,'=',3),
        ];
      }
    }
  } else {
    // Away serves
    if (pointTeam === 'away') {
      // Away scores while serving
      switch (t % 5) {
        case 0: return [a('away',aSrv,'S','Q','#',null,5,null,'c')];
        case 1: return [a('away',aSrv,'S','H','#',null,6,null,'d')];
        case 2: return [
          a('away',aSrv,'S','M','-',null,1),
          a('home',hLinup[1],'R',null,'-',6),
          a('home',hSrv,'E',null,'/',2),
          a('away',aLinup[4],'A',null,'#',3,null,'b'),
        ];
        case 3: return [
          a('away',aSrv,'S','H','+',null,5),
          a('home',hLinup[2],'R',null,'!',3),
          a('home',hSrv,'E',null,'+',2),
          a('home',hLinup[4],'A',null,'=',1),
        ];
        case 4: return [
          a('away',aSrv,'S','Q','-',null,6),
          a('home',hLinup[0],'R',null,'+',1),
          a('home',hSrv,'E',null,'+',3),
          a('home',hLinup[4],'A',null,'+',4),
          a('away',aLinup[2],'B',null,'#'),
        ];
      }
    } else {
      // Home scores while away serves (side-out for home)
      switch (t % 5) {
        case 0: return [a('away',aSrv,'S','H','=')];
        case 1: return [
          a('away',aSrv,'S','Q','+',null,1,'b'),
          a('home',hLinup[0],'R',null,'#',6),
          a('home',hSrv,'E',null,'+',3),
          a('home',hLinup[4],'A',null,'#',2),
        ];
        case 2: return [
          a('away',aSrv,'S','M','-',null,5),
          a('home',hLinup[1],'R',null,'+',2),
          a('home',hSrv,'E',null,'+',3),
          a('home',hLinup[4],'A',null,'+',5),
          a('away',aLinup[2],'D',null,'#',4),
          a('away',aSrv,'E',null,'+',2),
          a('away',aLinup[0],'A',null,'=',3),
        ];
        case 3: return [
          a('away',aSrv,'S','T','+',null,6,'c'),
          a('home',hLinup[5],'R',null,'!',1),
          a('home',hSrv,'E',null,'+',3),
          a('home',hLinup[0],'A',null,'#',4,null,null,'a'),
        ];
        case 4: return [
          a('away',aSrv,'S','Q','+',null,1),
          a('home',hLinup[2],'R',null,'+',3),
          a('home',hSrv,'E',null,'+',2),
          a('home',hLinup[4],'A',null,'+',5),
          a('away',aLinup[2],'D',null,'-',6),
          a('away',aSrv,'E',null,'=',1),
        ];
      }
    }
  }
  // fallback
  return [a(pointTeam === 'home' ? 'home' : 'away',
            pointTeam === 'home' ? hLinup[0] : aLinup[0], 'A', null, '#', 5)];
}

// ---------------------------------------------------------------------------
// Satz generieren
// ---------------------------------------------------------------------------
function generateSet(matchId, setNumber, hLinup, aLinup, serving, targetH, targetA, gerIds, polIds) {
  let state = { homeScore:0, awayScore:0, rotHome:1, rotAway:1, serving };
  let rallyNum = 0;

  const insRally = db.prepare(
    `INSERT INTO rallies (match_id,set_number,rally_number,rotation_home,rotation_away,
      point_team,home_score_after,away_score_after,raw_input)
     VALUES (@matchId,@setNumber,@rallyNum,@rH,@rA,@pt,@hs,@as,@raw)`,
  );
  const insAction = db.prepare(
    `INSERT INTO actions
       (rally_id,action_order,team,player_number,player_id,skill,skill_subtype,
        start_zone,end_zone,start_subzone,end_subzone,effect,linked_id,raw_token)
     VALUES
       (@rallyId,@ord,@team,@num,@pid,@skill,@sty,@sz,@ez,@ssz,@esz,@ef,null,@raw)`,
  );
  const insSub = db.prepare(
    `INSERT INTO substitutions (match_id,set_number,after_rally,team,player_out_num,player_in_num)
     VALUES (?,?,?,?,?,?)`,
  );
  const insTout = db.prepare(
    `INSERT INTO timeouts (match_id,set_number,after_rally,team) VALUES (?,?,?,?)`,
  );

  // Deterministische Outcome-Sequenz generieren
  const totalRallies = targetH + targetA;
  const outcomes = [];
  let h = targetH, a = targetA;
  for (let i = 0; i < totalRallies; i++) {
    if (h === 0) { outcomes.push('away'); a--; }
    else if (a === 0) { outcomes.push('home'); h--; }
    else {
      const ratio = h / (h + a);
      outcomes.push(pseudoRand(i * 3 + setNumber * 17) < ratio ? 'home' : 'away');
      if (outcomes[outcomes.length - 1] === 'home') h--; else a--;
    }
  }

  // Substitutions & Timeouts planen: je 1 pro Team
  const subHomeAfter = Math.floor(totalRallies * 0.35);
  const subAwayAfter = Math.floor(totalRallies * 0.55);
  const toutHomeAfter = Math.floor(totalRallies * 0.25);
  const toutAwayAfter = Math.floor(totalRallies * 0.65);
  // Set 1 bench: GER #16 rein für #5, POL #17 rein für #6
  const homeSub = setNumber === 1 ? [5, 16] : [1, 16];
  const awaySub = setNumber === 1 ? [6, 17] : [2, 17];

  for (let i = 0; i < totalRallies; i++) {
    const pointTeam = outcomes[i];
    rallyNum++;
    const acts = rallyActions(pointTeam, i, hLinup, aLinup, state.rotHome, state.rotAway, state.serving);

    // raw_input bauen
    const rawParts = acts.map((ac) => {
      let s = ac.team === 'away' ? 'a' : '';
      s += ac.num + ac.skill;
      if (ac.subtype) s += ac.subtype;
      if (ac.effect) s += ac.effect;
      if (ac.sz) { s += ac.sz; if (ac.ssz) s += ac.ssz; }
      if (ac.ez) { s += ac.ez; if (ac.esz) s += ac.esz; }
      return s;
    });

    state = advance(state, pointTeam);

    const ral = insRally.run({
      matchId, setNumber, rallyNum,
      rH: state.rotHome, rA: state.rotAway,
      pt: pointTeam,
      hs: state.homeScore, as: state.awayScore,
      raw: rawParts.join('.'),
    });
    const rallyId = Number(ral.lastInsertRowid);

    // linked_id for Attack→Block (last two: A then B from opposite team)
    let prevAttackId = null;
    acts.forEach((ac, ord) => {
      const pid = ac.team === 'home'
        ? (gerIds[ac.num] ?? null)
        : (polIds[ac.num] ?? null);
      const r = insAction.run({
        rallyId, ord, team: ac.team, num: ac.num, pid,
        skill: ac.skill, sty: ac.subtype,
        sz: ac.sz, ez: ac.ez, ssz: ac.ssz, esz: ac.esz,
        ef: ac.effect,
        raw: rawParts[ord] ?? '',
      });
      if (ac.skill === 'A') prevAttackId = Number(r.lastInsertRowid);
      if (ac.skill === 'B' && prevAttackId) {
        db.prepare('UPDATE actions SET linked_id=? WHERE id=?').run(prevAttackId, Number(r.lastInsertRowid));
        prevAttackId = null;
      }
    });

    // Substitutions nach bestimmten Rallies
    if (rallyNum === subHomeAfter) insSub.run(matchId, setNumber, rallyNum, 'home', homeSub[0], homeSub[1]);
    if (rallyNum === subAwayAfter) insSub.run(matchId, setNumber, rallyNum, 'away', awaySub[0], awaySub[1]);
    if (rallyNum === toutHomeAfter) insTout.run(matchId, setNumber, rallyNum, 'home');
    if (rallyNum === toutAwayAfter) insTout.run(matchId, setNumber, rallyNum, 'away');
  }

  console.log(`  Satz ${setNumber}: ${state.homeScore}:${state.awayScore} — ${rallyNum} Rallies, ${rallyNum} Einträge`);
}

// ---------------------------------------------------------------------------
// Haupt-Ablauf
// ---------------------------------------------------------------------------
applyMigrations();
wipe();

const { matchId, gerIds, polIds } = insertMaster();

// Aufstellungen (Positionen 1–6: Trikotnummern)
const gerLineup1 = [7, 9, 1, 3, 5, 11];   // Setter auf P1
const polLineup1 = [8, 10, 2, 4, 6, 12];

const gerLineup2 = [3, 5, 11, 7, 9, 1];   // nach Satz-1-Niederlage rotiert
const polLineup2 = [4, 6, 12, 8, 10, 2];

const gerLineup3 = [9, 1, 3, 5, 11, 7];
const polLineup3 = [10, 2, 4, 6, 12, 8];

const insSet = db.prepare(
  `INSERT OR REPLACE INTO sets (match_id,set_number,home_lineup,away_lineup,serving_team)
   VALUES (?,?,?,?,?)`,
);

console.log('\nGeneriere Spieldaten...');

// Satz 1: GER gewinnt 25:20, GER schlägt auf
insSet.run(matchId, 1, JSON.stringify(gerLineup1), JSON.stringify(polLineup1), 'home');
generateSet(matchId, 1, gerLineup1, polLineup1, 'home', 25, 20, gerIds, polIds);

// Satz 2: POL gewinnt 20:25, POL schlägt auf (Sieger Satz 1 erhält nächstes Aufschlagrecht... hier: away)
insSet.run(matchId, 2, JSON.stringify(gerLineup2), JSON.stringify(polLineup2), 'away');
generateSet(matchId, 2, gerLineup2, polLineup2, 'away', 20, 25, gerIds, polIds);

// Satz 3 (Tiebreak): GER gewinnt 15:12, GER schlägt auf
insSet.run(matchId, 3, JSON.stringify(gerLineup3), JSON.stringify(polLineup3), 'home');
generateSet(matchId, 3, gerLineup3, polLineup3, 'home', 15, 12, gerIds, polIds);

db.close();

console.log('\n✓ Seed abgeschlossen:');
console.log('  1 Saison: VNL-2025');
console.log('  2 Teams: GER (8 Spieler) vs POL (8 Spieler)');
console.log('  1 Spiel: Deutschland vs Polen, 2025-06-15, Ankara Arena');
console.log('  3 Sätze: 25:20 / 20:25 / 15:12 → GER gewinnt 2:1');
console.log('  → App starten und Spiel im Match-Report öffnen\n');

process.exit(0);
