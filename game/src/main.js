// DUSTLINE: boot and the one loop — a fixed 60 Hz simulation feeding a render at the
// display's rate. Vanguard (you + two bots) attacks; Ember (three bots) defends two bomb
// sites. ?shot=start|play|buy|end with &seed=N sets up a deterministic frame for a
// capture, renders it twice, then freezes it and sets window.__shotReady.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createTouch } from './touch.js';
import { createMover } from './mover.js';
import { createArsenal, createGrenades, createSmoke, createLobbed, WEAPONS, GRENADE_PRICE, SMOKE_PRICE, FLASH_PRICE, MOLOTOV_PRICE, DECOY_PRICE, ARMOR_PRICE, HELMET_PRICE, HELMET_HEAD_MULT } from './weapons.js';
import { createEffects } from './effects.js';
import { createBots } from './bots.js';
import { createMatch, BUY_SECONDS, ROUND_SECONDS, PLANT_SECONDS } from './rounds.js';
import { createHud, BUY_COLUMNS } from './hud.js';
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
const effects = createEffects(scene);
const settings = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('dustline.settings.v1') || '{}');
    return {
      mouse: Math.min(3, Math.max(0.1, Number(saved.mouse) || 1)),
      touch: Math.min(3, Math.max(0.1, Number(saved.touch) || 1)),
    };
  } catch {
    return { mouse: 1, touch: 1 };
  }
})();
const hud = createHud(buyItem, (index) => {
  buyColumn = index;
  hud.setBuyColumn(index);
});
hud.bindSettings(settings);
const input = createInput(renderer.domElement, onLockChange);
function cycleWeapon() {
  const order = ['pistol', 'p250', 'deagle', 'tec9', 'dualies', 'nova', 'xm1014', 'smg', 'p90', 'mac10', 'rifle', 'm4', 'ak47', 'sniper', 'sg553', 'awp', 'knife'];
  const index = order.indexOf(arsenal.state.current);
  for (let offset = 1; offset <= order.length; offset += 1) {
    const next = order[(index + offset) % order.length];
    if (arsenal.items[next].owned && arsenal.select(next)) return;
  }
}
let scoreboardTouch = false;
const touch = createTouch(input, { cycleWeapon, toggleScoreboard: () => { scoreboardTouch = !scoreboardTouch; } });
if (touch.active) {
  document.body.classList.add('touch');
  document.getElementById('desktop-keys').hidden = true;
  document.getElementById('touch-keys').hidden = false;
}
document.getElementById('buy-close').addEventListener('click', () => input.press('KeyB'));
const raycaster = new THREE.Raycaster();
raycaster.far = 120;

const player = {
  mover: playerMover,
  hp: 100,
  armor: 0,
  helmet: false,
  alive: true,
};

let elapsed = 0;
let started = false;
let frozen = false;
let accumulator = 0;
let lastTime = performance.now();
let buyOpen = false;
let buyColumn = null;
let plantHold = 0;
let shake = 0;
let spectateBot = null;
let bloom = 0;
let aiming = false;
let shotsFired = 0;
let shotsHit = 0;
let headshots = 0;

const direction = new THREE.Vector3();
const muzzleWorld = new THREE.Vector3();
const pelletDir = new THREE.Vector3();
const tmpFlashA = new THREE.Vector3();
const tmpFlashB = new THREE.Vector3();
const tmpHit = new THREE.Vector3();
const tmpEnd = new THREE.Vector3();
const explosionMeshes = [];

const grenades = createGrenades(scene, world.colliders, onGrenadeExplode);
const smoke = createSmoke(scene, world.colliders);
const lobbed = createLobbed(scene, world.colliders);

const stats = new Map();
const roundStats = new Map();
function statEntry(map, id, team) {
  let entry = map.get(id);
  if (!entry) {
    entry = { id, name: id, team, kills: 0, deaths: 0, damage: 0 };
    map.set(id, entry);
  }
  return entry;
}
function initStats() {
  statEntry(stats, 'You', 'atk');
  statEntry(roundStats, 'You', 'atk');
  for (const bot of bots.list) {
    statEntry(stats, bot.name, bot.team);
    statEntry(roundStats, bot.name, bot.team);
  }
}
function attackerId(attacker) {
  return attacker === 'player' ? 'You' : attacker.name;
}
function recordDamage(attacker, amount) {
  if (!attacker) return;
  const id = attackerId(attacker);
  const team = attacker === 'player' ? 'atk' : attacker.team;
  statEntry(stats, id, team).damage += Math.round(amount);
  statEntry(roundStats, id, team).damage += Math.round(amount);
}
function recordKill(attacker, victim) {
  const id = attackerId(attacker);
  const team = attacker === 'player' ? 'atk' : attacker.team;
  statEntry(stats, id, team).kills += 1;
  statEntry(roundStats, id, team).kills += 1;
  statEntry(stats, victim.name, victim.team).deaths += 1;
  statEntry(roundStats, victim.name, victim.team).deaths += 1;
}
function scoreboardRows() {
  let mvp = null;
  let bestKills = -1;
  let bestDamage = -1;
  for (const entry of roundStats.values()) {
    if (entry.kills > bestKills || (entry.kills === bestKills && entry.damage > bestDamage)) {
      bestKills = entry.kills;
      bestDamage = entry.damage;
      mvp = entry.id;
    }
  }
  if (bestKills <= 0 && bestDamage <= 0) mvp = null;
  return [...stats.values()].map((entry) => ({ name: entry.name, team: entry.team, kills: entry.kills, deaths: entry.deaths, damage: entry.damage, mvp: entry.id === mvp }));
}
function grenadeCounts() {
  const s = arsenal.state;
  return { frag: s.grenades, flash: s.flashes, smoke: s.smokes, molotov: s.molotovs, decoy: s.decoys, sel: s.grenadeSel };
}

const botCtx = {
  match,
  player,
  audio,
  random,
  smoke,
  grenades,
  time: () => elapsed,
  onShotFired: () => {},
  damagePlayer,
  onKill,
  onDefused,
  recordDamage,
  inFire: (position) => effects.inFire(position),
};
const bots = createBots(scene, world, botCtx);
botCtx.onShotFired = (bot, from, to, hitPoint) => {
  bots.hear(from);
  effects.fire(from, to, bot.team === 'atk' ? PALETTE.teal : PALETTE.ember);
  if (hitPoint) effects.spark(hitPoint, 0.4);
};
initStats();

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

function damagePlayer(base, attacker, part, headMult = 1) {
  if (shot) return;
  if (!player.alive) return;
  let amount = base * (part === 'head' ? (player.helmet ? HELMET_HEAD_MULT : headMult) : 1);
  let remaining = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, remaining * 0.5);
    player.armor -= absorbed;
    remaining -= absorbed;
  }
  player.hp -= remaining;
  recordDamage(attacker, amount);
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
    if (attacker) recordKill(attacker, { name: 'You', team: 'atk' });
    else {
      statEntry(stats, 'You', 'atk').deaths += 1;
      statEntry(roundStats, 'You', 'atk').deaths += 1;
    }
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
  recordKill(attacker, victim);
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

function onFlash(position) {
  audio.flashPop();
  effects.spark(position, 1.2);
  const now = elapsed;
  for (const bot of bots.list) {
    if (!bot.alive) continue;
    tmpFlashA.set(bot.mover.state.position.x, bot.mover.state.position.y + bot.mover.state.eye, bot.mover.state.position.z);
    const dist = tmpFlashA.distanceTo(position);
    if (dist > 25) continue;
    tmpFlashB.copy(position).sub(tmpFlashA).normalize();
    const forward = new THREE.Vector3(-Math.sin(bot.mover.state.yaw), 0, -Math.cos(bot.mover.state.yaw));
    if (forward.dot(tmpFlashB) < 0.2) continue;
    raycaster.set(tmpFlashA, tmpFlashB);
    raycaster.far = dist;
    if (raycaster.intersectObjects(world.shootables, false)[0]) continue;
    bot.blindUntil = now + 2;
  }
  if (player.alive) {
    const dist = camera.position.distanceTo(position);
    if (dist < 30) {
      tmpFlashB.copy(position).sub(camera.position).normalize();
      camera.getWorldDirection(tmpFlashA);
      if (tmpFlashA.dot(tmpFlashB) > 0.25) {
        raycaster.set(camera.position, tmpFlashB);
        raycaster.far = dist;
        if (!raycaster.intersectObjects(world.shootables, false)[0]) hud.flashbang(Math.max(0.3, 1 - dist / 30));
      }
    }
  }
}

function onDecoyShot(position) {
  audio.shoot(true);
  tmpFlashA.copy(position);
  tmpFlashB.set(position.x + (random() * 2 - 1) * 8, position.y + 1.2, position.z + (random() * 2 - 1) * 8);
  effects.fire(tmpFlashA, tmpFlashB);
  bots.hear(position);
}

function fireZoneHurt(center, radius, amount) {
  for (const bot of bots.list) {
    if (!bot.alive) continue;
    const p = bot.mover.state.position;
    if (Math.hypot(p.x - center.x, p.z - center.z) < radius) bots.damage(bot, amount, 'torso', 'player');
  }
  if (player.alive) {
    const p = playerMover.state.position;
    if (Math.hypot(p.x - center.x, p.z - center.z) < radius) damagePlayer(amount, null, 'torso');
  }
}

const GRENADE_ORDER = ['grenade', 'flash', 'smoke', 'molotov', 'decoy'];
function throwSelectedGrenade() {
  const s = arsenal.state;
  const sel = s.grenadeSel;
  const counts = { grenade: s.grenades, flash: s.flashes, smoke: s.smokes, molotov: s.molotovs, decoy: s.decoys };
  if (!counts[sel] || counts[sel] <= 0) return false;
  camera.getWorldDirection(direction);
  if (sel === 'grenade') {
    s.grenades -= 1;
    grenades.throwFrom(camera.position, direction);
  } else if (sel === 'smoke') {
    s.smokes -= 1;
    smoke.throwFrom(camera.position, direction);
  } else if (sel === 'flash') {
    s.flashes -= 1;
    lobbed.throwFrom(camera.position, direction, 'flash', { onFuse: onFlash });
  } else if (sel === 'molotov') {
    s.molotovs -= 1;
    lobbed.throwFrom(camera.position, direction, 'molotov', { onLand: (pos) => effects.deployFire(pos) });
  } else if (sel === 'decoy') {
    s.decoys -= 1;
    lobbed.throwFrom(camera.position, direction, 'decoy', { onShot: onDecoyShot });
  }
  audio.grenadePin();
  hud.setWeapon(arsenal.def().name, grenadeCounts());
  return true;
}

function cycleGrenade() {
  const s = arsenal.state;
  const owned = GRENADE_ORDER.filter((id) => (id === 'grenade' ? s.grenades : id === 'flash' ? s.flashes : id === 'smoke' ? s.smokes : id === 'molotov' ? s.molotovs : s.decoys) > 0);
  if (owned.length === 0) return;
  s.grenadeSel = owned[(owned.indexOf(s.grenadeSel) + 1) % owned.length];
  hud.setWeapon(arsenal.def().name, grenadeCounts());
  audio.click();
}

function meleeAttack() {
  if (!arsenal.ready()) return false;
  arsenal.swing();
  shotsFired += 1;
  camera.getWorldDirection(direction);
  const range = arsenal.def().range;
  let hitBot = null;
  let hitDist = range;
  for (const bot of bots.list) {
    if (!bot.alive) continue;
    const bp = bot.mover.state.position;
    const dx = bp.x - camera.position.x;
    const dy = (bp.y + 1.2) - camera.position.y;
    const dz = bp.z - camera.position.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > range || dist >= hitDist) continue;
    if ((dx * direction.x + dy * direction.y + dz * direction.z) / (dist || 1) < 0.85) continue;
    hitDist = dist;
    hitBot = bot;
  }
  if (hitBot) {
    raycaster.set(camera.position, direction);
    raycaster.far = hitDist;
    const blocked = raycaster.intersectObjects(world.shootables, false)[0];
    if (!blocked) {
      shotsHit += 1;
      const killed = bots.damage(hitBot, arsenal.def().damage, 'torso', 'player');
      hud.hitMarker(killed, shot ? 4000 : 90);
      if (!killed) audio.hit(false);
      tmpHit.set(hitBot.mover.state.position.x, hitBot.mover.state.position.y + 1.2, hitBot.mover.state.position.z);
      effects.spark(tmpHit, 0.5);
    }
  }
  bots.hear(camera.position);
  return true;
}

function shoot(spread) {
  const def = arsenal.def();
  if (def.melee) return meleeAttack();
  if (!arsenal.takeRound()) {
    audio.dryFire();
    return false;
  }
  shotsFired += 1;
  bloom = Math.min(0.02, bloom + 0.0035);
  camera.getWorldDirection(direction);
  camera.localToWorld(muzzleWorld.set(0.24, -0.18, -0.95));
  const pellets = def.pellets || 1;
  let anyHit = false;
  scene.updateMatrixWorld(true);
  for (let p = 0; p < pellets; p += 1) {
    pelletDir.copy(direction);
    pelletDir.x += (random() * 2 - 1) * spread;
    pelletDir.y += (random() * 2 - 1) * spread;
    pelletDir.z += (random() * 2 - 1) * spread;
    pelletDir.normalize();
    raycaster.set(camera.position, pelletDir);
    raycaster.far = def.range;
    const hit = raycaster.intersectObjects(world.shootables.concat(bots.hitMeshes), false)[0];
    const end = hit ? hit.point : tmpEnd.copy(camera.position).addScaledVector(pelletDir, def.range);
    effects.fire(muzzleWorld, end);
    if (hit) {
      effects.spark(hit.point, hit.object.userData.bot ? 0.5 : 0.4);
      if (hit.object.userData.bot) {
        const bot = hit.object.userData.bot;
        const isHead = hit.object.userData.part === 'head';
        anyHit = true;
        if (isHead) headshots += 1;
        let dmg = def.damage * (isHead ? def.headMult : 1);
        if (def.falloff) {
          const d = hit.distance;
          dmg *= d > 20 ? 0.3 : d > 10 ? 0.6 : 1;
        }
        const killed = bots.damage(bot, dmg, hit.object.userData.part, 'player');
        hud.hitMarker(killed, shot ? 4000 : 90);
        if (!killed) audio.hit(false);
      }
    }
  }
  if (anyHit) shotsHit += 1;
  arsenal.pullTrigger();
  playerMover.recoil(0.009 + random() * 0.004, (random() * 2 - 1) * 0.004);
  bots.hear(camera.position);
  hud.setAmmo(arsenal.items[arsenal.state.current].mag, arsenal.items[arsenal.state.current].reserve, true);
  return true;
}

function buyItem(id) {
  const state = match.state;
  if (state.phase !== 'buy') return;
  const price = id === 'grenade' ? GRENADE_PRICE : id === 'smoke' ? SMOKE_PRICE : id === 'flash' ? FLASH_PRICE : id === 'molotov' ? MOLOTOV_PRICE : id === 'decoy' ? DECOY_PRICE : id === 'armor' ? ARMOR_PRICE : id === 'helmet' ? HELMET_PRICE : WEAPONS[id].price;
  if (state.money < price) return;
  if (id === 'grenade') {
    if (arsenal.state.grenades >= 2) return;
    arsenal.state.grenades += 1;
    arsenal.state.grenadeSel = 'grenade';
  } else if (id === 'smoke') {
    if (arsenal.state.smokes >= 1) return;
    arsenal.state.smokes += 1;
    arsenal.state.grenadeSel = 'smoke';
  } else if (id === 'flash') {
    if (arsenal.state.flashes >= 2) return;
    arsenal.state.flashes += 1;
    arsenal.state.grenadeSel = 'flash';
  } else if (id === 'molotov') {
    if (arsenal.state.molotovs >= 1) return;
    arsenal.state.molotovs += 1;
    arsenal.state.grenadeSel = 'molotov';
  } else if (id === 'decoy') {
    if (arsenal.state.decoys >= 2) return;
    arsenal.state.decoys += 1;
    arsenal.state.grenadeSel = 'decoy';
  } else if (id === 'armor') {
    if (player.armor >= 50) return;
    player.armor = 50;
  } else if (id === 'helmet') {
    if (player.helmet) return;
    player.helmet = true;
  } else if (!arsenal.buy(id)) {
    return;
  }
  state.money -= price;
  audio.buy();
  hud.markBought(id);
  if (WEAPONS[id]) arsenal.select(id);
  hud.setMoney(state.money);
  hud.setWeapon(arsenal.def().name, grenadeCounts());
}

function startRound() {
  const survived = player.alive && match.state.round > 1;
  match.startRound();
  player.hp = 100;
  if (!survived) {
    player.armor = 0;
    player.helmet = false;
  }
  player.alive = true;
  spectateBot = null;
  playerMover.place(world.spawns.atk[1].x, world.spawns.atk[1].z, 0);
  arsenal.resetRound(survived);
  grenades.clear();
  smoke.clear();
  lobbed.clear();
  effects.clear();
  bots.resetRound();
  roundStats.clear();
  initStats();
  buyOpen = false;
  buyColumn = null;
  hud.setBuyColumn(null);
  hud.showBuy(false);
  hud.setHealth(player.hp, player.armor, player.helmet);
  hud.setAmmo(arsenal.items.pistol.mag, arsenal.items.pistol.reserve, true);
  hud.setWeapon(arsenal.def().name, grenadeCounts());
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
  } else if (match.state.phase === 'end') {
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
      stats.clear();
      roundStats.clear();
      startRound();
    } else {
      match.nextRound();
      startRound();
    }
  }
  // Hide the overlay on the click itself, not only when pointer lock lands:
  hud.hideOverlay();
  // THE touch fix: pointer lock does not exist on phones, so a tap on any
  if (touch.active) {
    started = true;
    audio.unlock();
    hud.hideOverlay();
    hud.showBuy(false);
    buyOpen = false;
  } else {
    input.requestLock();
  }
});

function step(dt) {
  elapsed += dt;
  const state = match.state;
  const keys = input.state.keys;

  const previousPhase = state.phase;
  match.tick(dt);
  if (previousPhase === 'buy' && state.phase === 'live') {
    hud.showBuy(false);
    buyOpen = false;
    hud.setBomb('BOMB CARRIED — PLANT AT A OR B');
  }

  // and the game soft-locked in phase 'end'. Timer/fuse ends already happen
  if (state.phase === 'live' || state.phase === 'planted') {
    if (bots.aliveCount('def') === 0) {
      match.awardRound('atk', 'Ember team eliminated.');
    } else if (state.phase === 'live' && !player.alive && bots.aliveCount('atk') === 0) {
      match.awardRound('def', 'Vanguard team eliminated.');
    }
  }

  const live = (state.phase === 'live' || state.phase === 'planted') && player.alive;
  if (live) {
    const tm = input.state.touchMove;
    const hasTouchMove = tm && (tm.x !== 0 || tm.y !== 0);
    const inputState = {
      forward: hasTouchMove ? -tm.y : (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
      strafe: hasTouchMove ? tm.x : (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
      jump: keys.has('Space'),
      crouch: keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC'),
      sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      speedMult: (aiming ? arsenal.def().adsMoveMult : 1) * (arsenal.def().moveMult ?? 1),
    };
    playerMover.step(dt, inputState);
  }

  if (player.alive && (state.phase === 'live' || state.phase === 'planted' || state.phase === 'buy')) {
    if (buyOpen) {
      const digits = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
      if (buyColumn === null) {
        for (let i = 0; i < 5; i += 1) {
          if (input.takePressed(digits[i])) {
            buyColumn = i;
            hud.setBuyColumn(i);
          }
        }
      } else {
        for (let i = 0; i < 6; i += 1) {
          if (input.takePressed(digits[i])) {
            const item = BUY_COLUMNS[buyColumn].items[i];
            if (item) buyItem(item.id);
          }
        }
        if (input.takePressed('Digit0')) {
          buyColumn = null;
          hud.setBuyColumn(null);
        }
      }
    } else {
      if (input.takePressed('Digit1') && arsenal.state.primarySlot) arsenal.select(arsenal.state.primarySlot);
      if (input.takePressed('Digit2')) arsenal.select(arsenal.state.secondarySlot);
      if (input.takePressed('Digit3')) arsenal.select('knife');
      if (input.takePressed('Digit4')) cycleGrenade();
    }
    if (input.takePressed('KeyG') && state.phase !== 'buy') {
      throwSelectedGrenade();
    }
    if (input.takePressed('KeyH') && arsenal.state.smokes > 0 && state.phase !== 'buy') {
      arsenal.state.smokes -= 1;
      audio.grenadePin();
      camera.getWorldDirection(direction);
      smoke.throwFrom(camera.position, direction);
      hud.setWeapon(arsenal.def().name, grenadeCounts());
    }
    if (input.takePressed('KeyB') && state.phase === 'buy') {
      buyOpen = !buyOpen;
      buyColumn = null;
      hud.setBuyColumn(null);
      hud.showBuy(buyOpen);
      audio.click();
      if (buyOpen) {
        if (document.pointerLockElement) document.exitPointerLock();
      } else {
        input.requestLock();
      }
    }
  }

  if (live && state.phase === 'live' && state.bomb.carried) {
    const site = siteAt(playerMover.state.position);
    touch.setPlant(!!site);
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
    touch.setPlant(false);
    if (state.phase === 'planted') hud.showHint('DEFEND THE BOMB — EMBER IS COMING TO DEFUSE');
    else if (state.phase === 'buy') hud.showHint('PRESS B TO BUY — ROUND STARTS SOON');
    else hud.showHint('');
  }

  if (state.phase === 'planted') {
    if (state.bomb.defuse > 0) {
      hud.setBomb(`DEFUSE IN PROGRESS — ${Math.max(0, 6 - state.bomb.defuse).toFixed(1)}s`);
    } else {
      hud.setBomb(`BOMB PLANTED AT ${state.bomb.site} — ${Math.max(0, Math.ceil(state.bomb.fuse))}s`);
    }
  }

  arsenal.step(dt);
  grenades.step(dt);
  smoke.step(dt);
  lobbed.step(dt);
  effects.step(dt, elapsed, fireZoneHurt);
  bots.step(dt, elapsed);
  if (previousPhase !== 'end' && state.phase === 'end') {
    const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
    const stats = { accuracy, kills: match.state.kills, deaths: match.state.deaths, headshots };
    if (state.matchOver) {
      hud.showOverlay('matchEnd', { winner: state.winner, scoreAtk: state.score.atk, scoreDef: state.score.def, ...stats });
      if (state.winner === 'atk') audio.roundWin();
      else audio.roundLose();
    } else {
      hud.showOverlay('roundEnd', { winner: state.result.winner, reason: state.result.reason, scoreAtk: state.score.atk, scoreDef: state.score.def, matchOver: false, ...stats });
      if (state.result.winner === 'atk') audio.roundWin();
      else audio.roundLose();
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }
  bloom = Math.max(0, bloom - dt * 0.04);

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

  hud.setHealth(player.hp, player.armor, player.helmet);
  hud.setAmmo(arsenal.items[arsenal.state.current].mag, arsenal.items[arsenal.state.current].reserve, !arsenal.def().melee);
  hud.setWeapon(arsenal.def().name, grenadeCounts());
  hud.setMoney(state.money);
  hud.setRoster(bots.list);
  const timerSeconds = state.phase === 'buy' || state.phase === 'end' ? state.phaseTime : state.phase === 'planted' ? state.bomb.fuse : state.timer;
  hud.setTimer(timerSeconds, state.phase);
  hud.setScore(state.score.atk, state.score.def, state.round);
  hud.setCrosshairGap(6 + arsenal.spread(playerMover.groundSpeed()) * 900);

  const showScore = keys.has('Tab') || scoreboardTouch;
  hud.showScoreboard(showScore);
  if (showScore) hud.setScoreboard(scoreboardRows(), state.score.atk, state.score.def);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!frozen) {
    aiming = input.state.scoped && player.alive && (match.state.phase === 'live' || match.state.phase === 'planted');
    if (player.alive) {
      const base = aiming ? (arsenal.def().adsFov <= 30 ? 0.0008 : 0.0013) : 0.0022;
      const ml = input.takeLook();
      const tl = input.takeTouchLook();
      playerMover.look(ml.x, ml.y, base * settings.mouse);
      playerMover.look(tl.x, tl.y, base * 2.5 * settings.touch);
    }
    const fireEdge = input.takeFirePressed();
    const wantFire = arsenal.def().auto ? input.state.firing : fireEdge;
    if (wantFire && arsenal.ready() && player.alive && (match.state.phase === 'live' || match.state.phase === 'planted')) {
      const spread = arsenal.spread(playerMover.groundSpeed())
        * (aiming ? arsenal.def().adsSpreadMult : 1)
        * (playerMover.state.onGround ? 1 : 1.6) + bloom;
      shoot(shot ? 0 : spread);
    }
    if (input.state.keys.has('KeyR')) arsenal.reload();
    const wantFov = aiming ? arsenal.def().adsFov : 74;
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
    const enemyPoint = (height) => new THREE.Vector3(enemy.mover.state.position.x, height, enemy.mover.state.position.z);
    aimAt(enemyPoint(1.2));
    shoot(0);
    settle(8);
    aimAt(enemyPoint(1.53));
    shoot(0);
    settle(12);
    camera.getWorldDirection(direction);
    smoke.throwFrom(camera.position, direction);
    settle(100);
    aimAt(new THREE.Vector3(-15.5, 1.3, -10));
    shoot(0);
    arsenal.step(0);
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

window.__dustline = {
  state() {
    return {
      phase: match.state.phase,
      phaseTime: match.state.phaseTime,
      timer: match.state.timer,
      round: match.state.round,
      score: { ...match.state.score },
      money: match.state.money,
      hp: player.hp,
      armor: player.armor,
      helmet: player.helmet,
      alive: player.alive,
      spectating: !player.alive && spectateBot ? spectateBot.name : null,
      touch: touch.active,
      pos: [playerMover.state.position.x, playerMover.state.position.y, playerMover.state.position.z],
      yaw: playerMover.state.yaw,
      pitch: playerMover.state.pitch,
      eye: playerMover.state.eye,
      crouching: playerMover.state.crouching,
      weapon: arsenal.state.current,
      weaponName: arsenal.def().name,
      mag: arsenal.items[arsenal.state.current].mag,
      grenades: arsenal.state.grenades,
      smokes: arsenal.state.smokes,
      flashes: arsenal.state.flashes,
      molotovs: arsenal.state.molotovs,
      decoys: arsenal.state.decoys,
      grenadeSel: arsenal.state.grenadeSel,
      mouseSens: settings.mouse,
      touchSens: settings.touch,
      scoreboardOpen: !document.getElementById('scoreboard').hidden,
      fireZones: effects.zones.length,
      fov: camera.fov,
      aiming,
      shotsFired,
      shotsHit,
      headshots,
      bots: bots.list.map((bot) => ({
        name: bot.name,
        team: bot.team,
        hp: bot.hp,
        alive: bot.alive,
        state: bot.state,
        grenades: bot.grenades,
        blindUntil: bot.blindUntil,
        pos: [bot.mover.state.position.x, bot.mover.state.position.y, bot.mover.state.position.z],
      })),
      bomb: { planted: match.state.bomb.planted, site: match.state.bomb.site, fuse: match.state.bomb.fuse },
      smokeClouds: smoke.clouds.map((cloud) => [cloud.center.x, cloud.center.y, cloud.center.z]),
      scoreboard: scoreboardRows(),
    };
  },
  smokeBlocked(ax, ay, az, bx, by, bz) {
    return smoke.blocked(new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz));
  },
  aimAt(x, y, z) {
    aimAt(new THREE.Vector3(x, y, z));
  },
  fire() {
    if (player.alive && (match.state.phase === 'live' || match.state.phase === 'planted')) shoot(0);
  },
  place(x, z, yaw) {
    playerMover.place(x, z, yaw);
    syncCamera();
  },
  startLive() {
    match.state.phase = 'live';
    match.state.timer = 88;
    hud.showBuy(false);
    buyOpen = false;
  },
  buy(id) {
    buyItem(id);
  },
  setTimer(seconds) {
    match.state.timer = seconds;
  },
  setMoney(amount) {
    match.state.money = amount;
  },
  hurt(base, part, headMult) {
    damagePlayer(base, null, part, headMult);
  },
  throwSmoke() {
    if (arsenal.state.smokes <= 0) return false;
    arsenal.state.smokes -= 1;
    camera.getWorldDirection(direction);
    smoke.throwFrom(camera.position, direction);
    return true;
  },
  throwGrenade() {
    if (arsenal.state.grenades <= 0) return false;
    arsenal.state.grenades -= 1;
    camera.getWorldDirection(direction);
    grenades.throwFrom(camera.position, direction);
    return true;
  },
  setSens(mouse, touch) {
    settings.mouse = mouse;
    settings.touch = touch;
    localStorage.setItem('dustline.settings.v1', JSON.stringify(settings));
  },
  throwSelected() {
    return throwSelectedGrenade();
  },
  cycleGrenade() {
    cycleGrenade();
  },
  selectWeapon(id) {
    return arsenal.select(id);
  },
  scoreboard() {
    return scoreboardRows();
  },
};
