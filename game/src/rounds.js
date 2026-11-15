// The match: rounds, money and the bomb, in one place. The match owns the score, the
// phase clock and the economy; main.js and the bots read it, nobody else writes it.
// First to 5 round wins, at most 9 rounds; attackers plant, defenders defuse.
export const BUY_SECONDS = 12;
export const ROUND_SECONDS = 100;
export const FUSE_SECONDS = 35;
export const DEFUSE_SECONDS = 6;
export const PLANT_SECONDS = 3;
export const WIN_ROUNDS = 5;
export const MAX_ROUNDS = 9;
export const START_MONEY = 800;
export const KILL_REWARD = 300;
export const WIN_REWARD = 2000;
export const LOSS_REWARD = 1400;
export const PLANT_REWARD = 300;

export function createMatch() {
  const state = {
    round: 1,
    score: { atk: 0, def: 0 },
    phase: 'buy',
    phaseTime: BUY_SECONDS,
    timer: ROUND_SECONDS,
    money: START_MONEY,
    kills: 0,
    deaths: 0,
    bomb: { carried: true, planted: false, site: null, fuse: 0, defuse: 0, defuser: null, plantProgress: 0 },
    result: null,
    matchOver: false,
    winner: null,
  };

  function startRound() {
    state.phase = 'buy';
    state.phaseTime = BUY_SECONDS;
    state.timer = ROUND_SECONDS;
    state.bomb = { carried: true, planted: false, site: null, fuse: 0, defuse: 0, defuser: null, plantProgress: 0 };
    state.result = null;
  }

  function awardRound(winner, reason) {
    if (state.phase === 'end') return;
    state.score[winner] += 1;
    state.money += winner === 'atk' ? WIN_REWARD : LOSS_REWARD;
    state.phase = 'end';
    state.phaseTime = 4;
    state.result = { winner, reason };
    if (state.score[winner] >= WIN_ROUNDS || state.round >= MAX_ROUNDS) {
      state.matchOver = true;
      state.winner = state.score.atk > state.score.def ? 'atk' : state.score.def > state.score.atk ? 'def' : 'atk';
    }
  }

  function nextRound() {
    state.round += 1;
    startRound();
  }

  function tick(dt) {
    if (state.phase === 'buy') {
      state.phaseTime -= dt;
      if (state.phaseTime <= 0) {
        state.phase = 'live';
        state.phaseTime = ROUND_SECONDS;
        state.timer = ROUND_SECONDS;
      }
      return;
    }
    if (state.phase === 'live') {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.timer = 0;
        awardRound('def', 'Time expired — the bomb was never planted.');
      }
      return;
    }
    if (state.phase === 'planted') {
      state.bomb.fuse -= dt;
      if (state.bomb.fuse <= 0) {
        state.bomb.fuse = 0;
        awardRound('atk', 'The bomb detonated at the site.');
      }
      return;
    }
    if (state.phase === 'end') {
      state.phaseTime -= dt;
    }
  }

  return {
    state,
    startRound,
    nextRound,
    tick,
    awardRound,
    plant(site) {
      state.bomb.carried = false;
      state.bomb.planted = true;
      state.bomb.site = site;
      state.bomb.fuse = FUSE_SECONDS;
      state.bomb.defuse = 0;
      state.bomb.defuser = null;
      state.phase = 'planted';
      state.money += PLANT_REWARD;
    },
    killReward() {
      state.money += KILL_REWARD;
      state.kills += 1;
    },
  };
}
