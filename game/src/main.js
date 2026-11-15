// DUSTLINE: boot and the one loop — a fixed 60 Hz simulation feeding a render at the
// display's rate. Vanguard (you + two bots) attacks; Ember (three bots) defends two bomb
// sites. ?shot=start|play|buy|end with &seed=N sets up a deterministic frame for a
// capture, renders it twice, then freezes it and sets window.__shotReady.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createMover } from './mover.js';
import { createArsenal, createGrenades, WEAPONS, GRENADE_PRICE, ARMOR_PRICE } from './weapons.js';
import { createBots } from './bots.js';
import { createMatch, BUY_SECONDS, ROUND_SECONDS, PLANT_SECONDS } from './rounds.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createAudio } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.canvas), 24, 60);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 160);
scene.add(camera);

const audio = createAudio();
const world = createWorld(scene);
const match = createMatch();
const playerMover = createMover(world.colliders);
const arsenal = createArsenal(camera, audio);
const hud = createHud(buyItem);
const minimap = createMinimap(document.getElementById('minimap'));
const input = createInput(renderer.domElement, onLockChange);
const raycaster = new THREE.Raycaster();
raycaster.far = 120;

const player = {
  mover: playerMover,
  hp: 100,
  armor: 0,
  alive: true,
};

let elapsed = 0;
let started = false;
let frozen = false;
let accumulator = 0;
let lastTime = performance.now();
let buyOpen = false;
let plantHold = 0;
let shake = 0;
let spectateBot = null;

const direction = new THREE.Vector3();
const muzzleWorld = new THREE.Vector3();
const explosionMeshes = [];

// One tracer line, reused: a shot draws a fading line from the muzzle to the hit.
const tracerMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0 });
const tracerGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const tracer = new THREE.Line(tracerGeometry, tracerMaterial);
tracer.frustumCulled = false;
scene.add(tracer);
let tracerTime = 0;

const grenades = createGrenades(scene, world.colliders, onGrenadeExplode);

const botCtx = {
  match,
  player,
  audio,
  random,
  time: () => elapsed,
  onShotFired: () => {},
  damagePlayer,
  onKill,
  onDefused,
};
const bots = createBots(scene, world, botCtx);
botCtx.onShotFired = (bot, position) => {
  bots.hear(position);
};

function syncCamera() {
  if (!player.alive && spectateBot && spectateBot.alive) {
    const s = spectateBot.mover.state;
    camera.position.set(s.position.x, s.position.y + s.eye, s.position.z);
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
    return;
  }
  const body = playerMover.state;
  camera.position.set(body.position.x, body.position.y + body.eye, body.position.z);
  camera.rotation.set(body.pitch, body.yaw, 0, 'YXZ');
  if (shake > 0) {
    camera.position.x += (random() * 2 - 1) * shake * 0.06;
    camera.position.y += (random() * 2 - 1) * shake * 0.06;
  }
}

function aimAt(point) {
  const body = playerMover.state;
  const dx = point.x - body.position.x;
  const dy = point.y - (body.position.y + body.eye);
  const dz = point.z - body.position.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  body.yaw = Math.atan2(-dx, -dz);
  body.pitch = Math.asin(Math.max(-1, Math.min(1, dy / length)));
  syncCamera();
}

function siteAt(position) {
  for (const name of ['A', 'B']) {
    const site = world.sites[name];
    if (position.x >= site.minX && position.x <= site.maxX && position.z >= site.minZ && position.z <= site.maxZ) return name;
  }
  return null;
}

function damagePlayer(amount, attacker, part) {
  if (!player.alive) return;
  let remaining = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, remaining * 0.5);
    player.armor -= absorbed;
    remaining -= absorbed;
  }
  player.hp -= remaining;
  audio.hurt();
  if (attacker) {
    const body = playerMover.state;
    const from = attacker.mover ? attacker.mover.state.position : attacker.position;
    const angle = Math.atan2(from.x - body.position.x, from.z - body.position.z) * (180 / Math.PI);
    hud.damageFrom(angle);
  }
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    match.state.deaths += 1;
    spectateBot = bots.list.find((bot) => bot.team === 'atk' && bot.alive) || null;
    if (document.pointerLockElement) document.exitPointerLock();
    hud.showOverlay('down');
    hud.killfeed(`<b class="def">${attacker ? attacker.name : 'Ember'}</b> → <b class="atk">You</b>${part === 'head' ? ' <span class="head">HEADSHOT</span>' : ''}`);
  }
}

function onKill(victim, attacker, part) {
  const killerName = attacker === 'player' ? 'You' : attacker.name;
  const killerClass = attacker === 'player' || attacker.team === 'atk' ? 'atk' : 'def';
  const victimClass = victim.team === 'atk' ? 'atk' : 'def';
  hud.killfeed(`<b class="${killerClass}">${killerName}</b> → <b class="${victimClass}">${victim.name}</b>${part === 'head' ? ' <span class="head">HEADSHOT</span>' : ''}`);
  if (attacker === 'player') {
    match.killReward();
    audio.hit(true);
  }
}

function onDefused(bot) {
  match.awardRound('def', `${bot.name} defused the bomb.`);
  audio.defuseBeep();
}

function onGrenadeExplode(position) {
  audio.explosion();
  shake = 1;
  bots.hear(position);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.8 }),
  );
  flash.position.copy(position);
  scene.add(flash);
  explosionMeshes.push({ mesh: flash, life: 0.45 });
  const light = new THREE.PointLight(new THREE.Color(PALETTE.accent), 60, 14);
  light.position.copy(position);
  scene.add(light);
  explosionMeshes.push({ mesh: light, life: 0.3, isLight: true });
  const radius = 7;
  for (const bot of bots.list) {
    if (!bot.alive) continue;
    const distance = bot.mover.state.position.distanceTo(position);
    if (distance < radius) {
      const amount = Math.round(120 * (1 - distance / radius));
      bots.damage(bot, amount, 'torso', 'player');
      if (bot.alive) hud.killfeed(`<b class="atk">You</b> → <b class="def">${bot.name}</b> <span class="head">GRENADE</span>`);
    }
  }
  if (player.alive) {
    const distance = playerMover.state.position.distanceTo(position);
    if (distance < radius) damagePlayer(Math.round(90 * (1 - distance / radius)), null, 'torso');
  }
}

function showTracer(from, to) {
  tracerGeometry.setFromPoints([from, to]);
  tracerMaterial.opacity = 0.85;
  tracerTime = 0.07;
}

function shoot(spread) {
  if (!arsenal.takeRound()) {
    audio.dryFire();
    return false;
  }
  camera.getWorldDirection(direction);
  direction.x += (random() * 2 - 1) * spread;
  direction.y += (random() * 2 - 1) * spread;
  direction.z += (random() * 2 - 1) * spread;
  direction.normalize();
  scene.updateMatrixWorld(true);
  raycaster.set(camera.position, direction);
  raycaster.far = arsenal.def().range;
  const hit = raycaster.intersectObjects(world.shootables.concat(bots.hitMeshes), false)[0];
  const end = hit ? hit.point : camera.position.clone().addScaledVector(direction, arsenal.def().range);
  camera.localToWorld(muzzleWorld.set(0.24, -0.18, -0.95));
  showTracer(muzzleWorld, end);
  if (hit && hit.object.userData.bot) {
    const bot = hit.object.userData.bot;
    const def = arsenal.def();
    const killed = bots.damage(bot, def.damage * (hit.object.userData.part === 'head' ? def.headMult : 1), hit.object.userData.part, 'player');
    hud.hitMarker(killed, shot ? 4000 : 90);
    if (!killed) audio.hit(false);
  }
  arsenal.pullTrigger();
  playerMover.recoil(0.009 + random() * 0.004, (random() * 2 - 1) * 0.004);
  bots.hear(camera.position);
  hud.setAmmo(arsenal.items[arsenal.state.current].mag, arsenal.items[arsenal.state.current].reserve);
  return true;
}

function buyItem(id) {
  const state = match.state;
  if (state.phase !== 'buy') return;
  const price = id === 'grenade' ? GRENADE_PRICE : id === 'armor' ? ARMOR_PRICE : WEAPONS[id].price;
  if (state.money < price) return;
  if (id === 'grenade') {
    if (arsenal.state.grenades >= 2) return;
    arsenal.state.grenades += 1;
  } else if (id === 'armor') {
    if (player.armor >= 50) return;
    player.armor = 50;
  } else if (!arsenal.buy(id)) {
    return;
  }
  state.money -= price;
  audio.buy();
  hud.markBought(id);
  if (id !== 'grenade' && id !== 'armor') arsenal.select(id);
  hud.setMoney(state.money);
  hud.setWeapon(arsenal.def().name, arsenal.state.grenades);
}

function startRound() {
  // Survive the round and you keep your loadout; die and you start over with the pistol.
  const survived = player.alive && match.state.round > 1;
  match.startRound();
  player.hp = 100;
  if (!survived) player.armor = 0;
  player.alive = true;
  spectateBot = null;
  playerMover.place(world.spawns.atk[1].x, world.spawns.atk[1].z, 0);
  arsenal.resetRound(survived);
  grenades.clear();
  bots.resetRound();
  buyOpen = false;
  hud.showBuy(false);
  hud.setHealth(player.hp, player.armor);
  hud.setAmmo(arsenal.items.pistol.mag, arsenal.items.pistol.reserve);
  hud.setWeapon(arsenal.def().name, arsenal.state.grenades);
  hud.setMoney(match.state.money);
  hud.setScore(match.state.score.atk, match.state.score.def, match.state.round);
  hud.setBomb('BOMB CARRIED — PLANT AT A OR B');
}

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    audio.unlock();
    hud.hideOverlay();
    hud.showBuy(false);
    buyOpen = false;
  } else if (match.state.phase === 'buy') {
    // The buy menu needs the mouse: unlocking for it is not a pause.
  } else if (match.state.phase === 'end') {
    // Overlay is shown by the round-end handler.
  } else if (player.alive) {
    hud.showOverlay(started ? 'paused' : 'start');
  }
}

hud.onPlay(() => {
  if (shot) return;
  const state = match.state;
  if (state.phase === 'end') {
    if (state.matchOver) {
      match.state.round = 1;
      match.state.score = { atk: 0, def: 0 };
      match.state.money = 800;
      match.state.matchOver = false;
      match.state.winner = null;
      startRound();
    } else {
      match.nextRound();
      startRound();
    }
  }
  input.requestLock();
});

function step(dt) {
  elapsed += dt;
  const state = match.state;
  const keys = input.state.keys;

  // Round clock and phase transitions.
  const previousPhase = state.phase;
  match.tick(dt);
  if (previousPhase === 'buy' && state.phase === 'live') {
    hud.showBuy(false);
    buyOpen = false;
    hud.setBomb('BOMB CARRIED — PLANT AT A OR B');
  }
  if (previousPhase !== 'end' && state.phase === 'end') {
    if (state.matchOver) {
      hud.showOverlay('matchEnd', { winner: state.winner, scoreAtk: state.score.atk, scoreDef: state.score.def });
      if (state.winner === 'atk') audio.roundWin();
      else audio.roundLose();
    } else {
      hud.showOverlay('roundEnd', { winner: state.result.winner, reason: state.result.reason, scoreAtk: state.score.atk, scoreDef: state.score.def, matchOver: false });
      if (state.result.winner === 'atk') audio.roundWin();
      else audio.roundLose();
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // Round win checks while the round is live.
  if (state.phase === 'live' || state.phase === 'planted') {
    if (bots.aliveCount('def') === 0) {
      match.awardRound('atk', state.phase === 'planted' ? 'The bomb detonated at the site.' : 'Ember team eliminated.');
    } else if (!player.alive && bots.aliveCount('atk') === 0) {
      match.awardRound('def', 'Vanguard team eliminated.');
    }
  }

  // Player movement, only while alive and the round is live.
  const live = (state.phase === 'live' || state.phase === 'planted') && player.alive;
  if (live) {
    const inputState = {
      forward: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
      strafe: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
      jump: keys.has('Space'),
      crouch: keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC'),
      sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    };
    playerMover.step(dt, inputState);
  }

  // Weapon switching, grenades and the buy menu. While the buy menu is open the
  // number keys buy; everywhere else they switch weapons.
  if (player.alive && (state.phase === 'live' || state.phase === 'planted' || state.phase === 'buy')) {
    if (buyOpen) {
      if (input.takePressed('Digit1')) buyItem('rifle');
      if (input.takePressed('Digit2')) buyItem('smg');
      if (input.takePressed('Digit3')) buyItem('sniper');
      if (input.takePressed('Digit4')) buyItem('grenade');
      if (input.takePressed('Digit5')) buyItem('armor');
    } else {
      if (input.takePressed('Digit1')) arsenal.select('pistol');
      if (input.takePressed('Digit2')) arsenal.select('rifle');
      if (input.takePressed('Digit3')) arsenal.select('smg');
      if (input.takePressed('Digit4')) arsenal.select('sniper');
    }
    if (input.takePressed('KeyG') && arsenal.state.grenades > 0 && state.phase !== 'buy') {
      arsenal.state.grenades -= 1;
      audio.grenadePin();
      camera.getWorldDirection(direction);
      grenades.throwFrom(camera.position, direction);
      hud.setWeapon(arsenal.def().name, arsenal.state.grenades);
    }
    if (input.takePressed('KeyB') && state.phase === 'buy') {
      buyOpen = !buyOpen;
      hud.showBuy(buyOpen);
      audio.click();
      if (buyOpen) {
        if (document.pointerLockElement) document.exitPointerLock();
      } else {
        input.requestLock();
      }
    }
  }

  // Planting: hold E inside a site while carrying the bomb.
  if (live && state.phase === 'live' && state.bomb.carried) {
    const site = siteAt(playerMover.state.position);
    if (site && keys.has('KeyE')) {
      plantHold += dt;
      hud.showHint(`PLANTING AT ${site} — ${Math.max(0, PLANT_SECONDS - plantHold).toFixed(1)}s (HOLD E)`);
      if (plantHold >= PLANT_SECONDS) {
        match.plant(site);
        plantHold = 0;
        audio.plantBeep();
        hud.killfeed(`<b class="atk">You</b> planted the bomb at <b>${site}</b>`);
        hud.setBomb(`BOMB PLANTED AT ${site} — ${Math.ceil(state.bomb.fuse)}s`);
        bots.hear(world.sites[site].center);
      }
    } else {
      plantHold = Math.max(0, plantHold - dt * 2);
      hud.showHint(site ? 'HOLD E TO PLANT THE BOMB' : '');
    }
  } else {
    plantHold = 0;
    if (state.phase === 'planted') hud.showHint('DEFEND THE BOMB — EMBER IS COMING TO DEFUSE');
    else if (state.phase === 'buy') hud.showHint('PRESS B TO BUY — ROUND STARTS SOON');
    else hud.showHint('');
  }

  // Defuse progress display.
  if (state.phase === 'planted') {
    if (state.bomb.defuse > 0) {
      hud.setBomb(`DEFUSE IN PROGRESS — ${Math.max(0, 6 - state.bomb.defuse).toFixed(1)}s`);
    } else {
      hud.setBomb(`BOMB PLANTED AT ${state.bomb.site} — ${Math.max(0, Math.ceil(state.bomb.fuse))}s`);
    }
  }

  arsenal.step(dt);
  grenades.step(dt);
  bots.step(dt, elapsed);

  if (tracerTime > 0) {
    tracerTime -= dt;
    if (tracerTime <= 0) tracerMaterial.opacity = 0;
  }
  shake = Math.max(0, shake - dt * 2.2);
  for (let index = explosionMeshes.length - 1; index >= 0; index -= 1) {
    const entry = explosionMeshes[index];
    entry.life -= dt;
    if (entry.isLight) {
      entry.mesh.intensity = Math.max(0, (entry.life / 0.3) * 60);
    } else {
      const scale = 1 + (0.45 - entry.life) * 14;
      entry.mesh.scale.setScalar(Math.max(0.1, scale));
      entry.mesh.material.opacity = Math.max(0, entry.life / 0.45) * 0.8;
    }
    if (entry.life <= 0) {
      scene.remove(entry.mesh);
      explosionMeshes.splice(index, 1);
    }
  }

  // HUD: health, ammo, money, timer, score, crosshair, minimap.
  hud.setHealth(player.hp, player.armor);
  hud.setAmmo(arsenal.items[arsenal.state.current].mag, arsenal.items[arsenal.state.current].reserve);
  hud.setMoney(state.money);
  const timerSeconds = state.phase === 'buy' || state.phase === 'end' ? state.phaseTime : state.phase === 'planted' ? state.bomb.fuse : state.timer;
  hud.setTimer(timerSeconds, state.phase);
  hud.setScore(state.score.atk, state.score.def, state.round);
  hud.setCrosshairGap(6 + arsenal.spread(playerMover.groundSpeed()) * 900);
  minimap.draw({
    sites: world.sites,
    bombSite: state.bomb.planted ? state.bomb.site : null,
    bombPlanted: state.bomb.planted,
    player: { x: playerMover.state.position.x, z: playerMover.state.position.z, yaw: playerMover.state.yaw },
    bots: bots.list.map((bot) => ({
      x: bot.mover.state.position.x,
      z: bot.mover.state.position.z,
      team: bot.team,
      alive: bot.alive && (bot.team === 'atk' || bot.lastSeenTime > elapsed - 3),
    })),
  });
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!frozen) {
    const look = input.takeLook();
    if (player.alive) {
      const sensitivity = input.state.scoped && arsenal.state.current === 'sniper' ? 0.0008 : 0.0022;
      playerMover.look(look.x, look.y, sensitivity);
    }
    if (input.state.firing && arsenal.ready() && player.alive && (match.state.phase === 'live' || match.state.phase === 'planted')) {
      shoot(shot ? 0 : arsenal.spread(playerMover.groundSpeed()));
    }
    if (input.state.keys.has('KeyR')) arsenal.reload();
    // Sniper scope: narrow the field of view while the right button is held.
    const wantFov = input.state.scoped && arsenal.state.current === 'sniper' ? 30 : 74;
    if (Math.abs(camera.fov - wantFov) > 0.5) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 14);
      camera.updateProjectionMatrix();
    }
    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }
  renderer.render(scene, camera);
}

function settle(steps) {
  for (let index = 0; index < steps; index += 1) step(FIXED_STEP);
}

function runShot(name) {
  hud.hideOverlay();
  hud.showBuy(false);
  match.state.phase = 'buy';
  match.state.phaseTime = BUY_SECONDS;
  startRound();
  if (name === 'start') {
    playerMover.place(0, 13, 0);
    settle(20);
    hud.showOverlay('start');
  } else if (name === 'buy') {
    playerMover.place(0, 13, 0);
    settle(20);
    buyOpen = true;
    hud.showBuy(true);
    hud.setMoney(3200);
    match.state.money = 3200;
  } else if (name === 'play') {
    // West lane: a clear sightline from (-12, 2) to (-12, -6), no cover in between.
    match.state.phase = 'live';
    match.state.timer = 88;
    playerMover.place(-12, 2, 0);
    const enemy = bots.list.find((bot) => bot.team === 'def');
    enemy.mover.place(-12, -6, Math.PI);
    enemy.body.group.position.set(-12, 0, -6);
    const friend = bots.list.find((bot) => bot.team === 'atk');
    friend.mover.place(-9, 0, 0);
    friend.body.group.position.set(-9, 0, 0);
    settle(20);
    // The bot strafes while it engages, so aim at where it is right now, not
    // where it was placed: torso first, then the head for the kill.
    const enemyPoint = (height) => new THREE.Vector3(enemy.mover.state.position.x, height, enemy.mover.state.position.z);
    aimAt(enemyPoint(1.2));
    shoot(0);
    settle(8);
    aimAt(enemyPoint(1.53));
    shoot(0);
    settle(12);
  } else if (name === 'end') {
    match.state.score.atk = 1;
    match.state.score.def = 0;
    match.state.phase = 'end';
    match.state.phaseTime = 4;
    match.state.result = { winner: 'atk', reason: 'The bomb detonated at site A.' };
    playerMover.place(-8, -2, Math.PI / 4);
    settle(20);
    hud.showOverlay('roundEnd', { winner: 'atk', reason: 'The bomb detonated at site A.', scoreAtk: 1, scoreDef: 0, matchOver: false });
  }
  hud.setScore(match.state.score.atk, match.state.score.def, match.state.round);
  hud.setAmmo(arsenal.items[arsenal.state.current].mag, arsenal.items[arsenal.state.current].reserve);
  hud.setMoney(match.state.money);
  paintTwiceThenReady();
}

function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint);
    syncCamera();
    renderer.render(scene, camera);
    painted += 1;
    if (painted === 2) {
      window.__shotReady = true;
      frozen = true;
    }
  }
  requestAnimationFrame(paint);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startRound();
syncCamera();
if (shot) runShot(shot);
else requestAnimationFrame(frame);
