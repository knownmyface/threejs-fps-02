// Weapons: the numbers table, the view models, and the grenades. One module owns every
// gun; main.js owns the ray and the damage, bots own their own trigger pulls through the
// same table. A head shot pays the head multiplier; moving pays in spread.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { starTexture } from './effects.js';

export const WEAPONS = {
  pistol: { name: 'P-9 Sidearm', price: 0, damage: 25, headMult: 3, mag: 12, reserve: 60, fireGap: 0.16, auto: false, spreadStill: 0.004, spreadMove: 0.02, reloadTime: 1.4, range: 60, adsSpreadMult: 0.5, adsFov: 60, adsMoveMult: 0.6, kick: 0.055, cls: 'pistol', note: 'Standard sidearm' },
  p250: { name: 'P250', price: 300, damage: 38, headMult: 3, mag: 13, reserve: 52, fireGap: 0.15, auto: false, spreadStill: 0.004, spreadMove: 0.02, reloadTime: 1.5, range: 55, adsSpreadMult: 0.5, adsFov: 60, adsMoveMult: 0.6, kick: 0.06, cls: 'pistol', note: 'Hard-hitting pistol' },
  deagle: { name: 'Desert Eagle', price: 700, damage: 53, headMult: 3, mag: 7, reserve: 28, fireGap: 0.3, auto: false, spreadStill: 0.003, spreadMove: 0.025, reloadTime: 2.0, range: 65, adsSpreadMult: 0.45, adsFov: 58, adsMoveMult: 0.55, kick: 0.1, cls: 'pistol', note: 'Slow, heavy, huge damage' },
  tec9: { name: 'Tec-9', price: 500, damage: 26, headMult: 3, mag: 18, reserve: 90, fireGap: 0.11, auto: false, spreadStill: 0.008, spreadMove: 0.035, reloadTime: 1.7, range: 45, adsSpreadMult: 0.5, adsFov: 60, adsMoveMult: 0.65, kick: 0.05, cls: 'pistol', note: 'Fast, inaccurate' },
  dualies: { name: 'Dual Berettas', price: 300, damage: 24, headMult: 3, mag: 30, reserve: 90, fireGap: 0.09, auto: false, spreadStill: 0.009, spreadMove: 0.035, reloadTime: 1.8, range: 40, adsSpreadMult: 0.5, adsFov: 60, adsMoveMult: 0.65, kick: 0.045, cls: 'pistol', note: 'Two guns, 30-round mag' },
  nova: { name: 'Nova', price: 1050, damage: 26, headMult: 2, mag: 8, reserve: 24, fireGap: 0.9, auto: false, spreadStill: 0.03, spreadMove: 0.05, reloadTime: 2.4, range: 30, adsSpreadMult: 0.6, adsFov: 62, adsMoveMult: 0.6, kick: 0.11, pellets: 8, falloff: true, cls: 'primary', note: 'Pump shotgun, 8 pellets' },
  xm1014: { name: 'XM1014', price: 2000, damage: 22, headMult: 2, mag: 7, reserve: 28, fireGap: 0.28, auto: true, spreadStill: 0.025, spreadMove: 0.045, reloadTime: 2.6, range: 30, adsSpreadMult: 0.6, adsFov: 62, adsMoveMult: 0.6, kick: 0.09, pellets: 7, falloff: true, cls: 'primary', note: 'Auto shotgun, 7 shells' },
  smg: { name: 'MP5', price: 1500, damage: 22, headMult: 3, mag: 32, reserve: 128, fireGap: 0.07, auto: true, spreadStill: 0.006, spreadMove: 0.032, reloadTime: 1.6, range: 45, adsSpreadMult: 0.5, adsFov: 62, adsMoveMult: 0.65, kick: 0.05, cls: 'primary', note: 'Reliable SMG' },
  p90: { name: 'P90', price: 2350, damage: 19, headMult: 3, mag: 50, reserve: 100, fireGap: 0.06, auto: true, spreadStill: 0.008, spreadMove: 0.035, reloadTime: 2.2, range: 40, adsSpreadMult: 0.5, adsFov: 62, adsMoveMult: 0.65, kick: 0.04, cls: 'primary', note: '50-round mag, very fast' },
  mac10: { name: 'MAC-10', price: 1050, damage: 24, headMult: 3, mag: 30, reserve: 90, fireGap: 0.055, auto: true, spreadStill: 0.012, spreadMove: 0.045, reloadTime: 1.5, range: 35, adsSpreadMult: 0.5, adsFov: 62, adsMoveMult: 0.65, kick: 0.05, cls: 'primary', note: 'Cheap, very fast, wild' },
  rifle: { name: 'Galil AR', price: 1800, damage: 34, headMult: 3, mag: 30, reserve: 90, fireGap: 0.096, auto: true, spreadStill: 0.0022, spreadMove: 0.028, reloadTime: 1.9, range: 80, adsSpreadMult: 0.45, adsFov: 58, adsMoveMult: 0.6, kick: 0.055, cls: 'primary', note: 'Workhorse rifle' },
  m4: { name: 'M4', price: 3100, damage: 33, headMult: 3, mag: 30, reserve: 90, fireGap: 0.09, auto: true, spreadStill: 0.0018, spreadMove: 0.022, reloadTime: 2.0, range: 85, adsSpreadMult: 0.4, adsFov: 56, adsMoveMult: 0.6, kick: 0.05, cls: 'primary', note: 'Balanced, accurate' },
  ak47: { name: 'AK-47', price: 2700, damage: 36, headMult: 3, mag: 30, reserve: 90, fireGap: 0.1, auto: true, spreadStill: 0.0035, spreadMove: 0.035, reloadTime: 2.1, range: 85, adsSpreadMult: 0.45, adsFov: 58, adsMoveMult: 0.6, kick: 0.07, cls: 'primary', note: 'Harder hits, more recoil' },
  sniper: { name: 'SSG 08', price: 1700, damage: 90, headMult: 2.8, mag: 5, reserve: 15, fireGap: 1.1, auto: false, spreadStill: 0.0004, spreadMove: 0.05, reloadTime: 2.6, range: 120, adsSpreadMult: 0.4, adsFov: 30, adsMoveMult: 0.5, kick: 0.12, cls: 'primary', note: 'Cheap scoped rifle' },
  sg553: { name: 'SG 553', price: 3000, damage: 30, headMult: 3, mag: 30, reserve: 90, fireGap: 0.11, auto: true, spreadStill: 0.002, spreadMove: 0.025, reloadTime: 2.0, range: 90, adsSpreadMult: 0.35, adsFov: 45, adsMoveMult: 0.55, kick: 0.055, cls: 'primary', note: 'Scoped rifle, accurate' },
  awp: { name: 'AWP', price: 4750, damage: 110, headMult: 2.5, mag: 5, reserve: 20, fireGap: 1.4, auto: false, spreadStill: 0.0003, spreadMove: 0.06, reloadTime: 2.8, range: 130, adsSpreadMult: 0.3, adsFov: 25, adsMoveMult: 0.5, kick: 0.14, moveMult: 0.9, cls: 'primary', note: 'One-shot torso, scoped' },
  knife: { name: 'Tactical Knife', price: 0, damage: 40, headMult: 1, mag: 1, reserve: 0, fireGap: 0.45, auto: false, spreadStill: 0, spreadMove: 0, reloadTime: 0, range: 2.0, adsSpreadMult: 1, adsFov: 74, adsMoveMult: 1, kick: 0, moveMult: 1.25, melee: true, cls: 'melee', note: 'Default. Faster movement.' },
};

export const GRENADE_PRICE = 300;
export const SMOKE_PRICE = 300;
export const FLASH_PRICE = 200;
export const MOLOTOV_PRICE = 400;
export const DECOY_PRICE = 50;
export const ARMOR_PRICE = 650;
export const HELMET_PRICE = 350;
export const HELMET_HEAD_MULT = 1.25;

function buildViewModel(id) {
  const grip = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.5, metalness: 0.35 });
  const accent = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.5, metalness: 0.2 });
  const steel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b8b0a4'), roughness: 0.35, metalness: 0.7 });
  const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a5a28'), roughness: 0.7, metalness: 0 });
  const model = new THREE.Group();
  const part = (mat, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    model.add(m);
    return m;
  };
  if (id === 'knife') {
    const blade = part(steel, 0.015, 0.05, 0.3, 0, 0.01, -0.2);
    blade.rotation.x = -0.15;
    part(grip, 0.03, 0.05, 0.12, 0, -0.01, 0.02);
    model.position.set(0.22, -0.22, -0.38);
  } else if (id === 'pistol' || id === 'p250' || id === 'deagle' || id === 'tec9' || id === 'dualies') {
    const len = id === 'deagle' ? 0.3 : id === 'tec9' ? 0.26 : 0.22;
    part(body, 0.05, 0.06, len, 0, 0, -0.05);
    part(grip, 0.05, 0.12, 0.07, 0, -0.08, 0.06);
    if (id === 'dualies') {
      part(body, 0.05, 0.06, 0.22, 0.12, -0.01, -0.05);
      part(grip, 0.05, 0.12, 0.07, 0.12, -0.09, 0.06);
    }
    if (id === 'deagle') part(accent, 0.052, 0.02, 0.1, 0, 0.035, -0.12);
    if (id === 'tec9') part(accent, 0.05, 0.05, 0.06, 0, 0.02, -0.18);
    model.position.set(0.2, -0.2, -0.36);
  } else if (id === 'nova' || id === 'xm1014') {
    part(body, 0.09, 0.1, 0.42, 0, 0, 0);
    part(grip, 0.05, 0.05, 0.5, 0, 0.02, -0.4);
    part(accent, 0.07, 0.07, 0.14, 0, -0.03, -0.28);
    part(grip, 0.06, 0.08, 0.2, 0, -0.02, 0.3);
    if (id === 'xm1014') part(accent, 0.05, 0.14, 0.06, 0, -0.11, 0);
    model.position.set(0.24, -0.2, -0.44);
  } else if (id === 'smg' || id === 'p90' || id === 'mac10') {
    part(body, 0.08, 0.09, 0.3, 0, 0, 0);
    part(grip, 0.04, 0.04, 0.22, 0, 0.02, -0.25);
    part(accent, 0.05, id === 'p90' ? 0.1 : 0.16, 0.06, 0, -0.11, -0.02);
    if (id === 'p90') part(body, 0.09, 0.05, 0.34, 0, 0.06, -0.02);
    model.position.set(0.22, -0.2, -0.4);
  } else if (id === 'sniper' || id === 'awp' || id === 'sg553') {
    part(body, 0.07, 0.09, 0.5, 0, 0, 0);
    part(grip, 0.035, 0.035, id === 'awp' ? 0.65 : 0.55, 0, 0.02, -0.5);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), accent);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.08, -0.05);
    model.add(scope);
    part(grip, 0.06, 0.07, 0.2, 0, -0.02, 0.32);
    model.position.set(0.24, -0.21, -0.46);
  } else {
    part(body, 0.09, 0.1, 0.42, 0, 0, 0);
    part(grip, 0.045, 0.045, 0.4, 0, 0.025, -0.38);
    part(grip, 0.075, 0.08, 0.22, 0, -0.02, 0.3);
    part(accent, 0.02, 0.05, 0.06, 0, 0.07, -0.1);
    if (id === 'm4') part(accent, 0.04, 0.12, 0.05, 0, -0.1, 0.05);
    if (id === 'ak47') part(wood, 0.05, 0.1, 0.06, 0, -0.09, 0.08);
    model.position.set(0.24, -0.2, -0.42);
  }
  model.userData.baseZ = model.position.z;
  return model;
}

export function createArsenal(camera, audio) {
  const models = {};
  for (const id of Object.keys(WEAPONS)) {
    const model = buildViewModel(id);
    model.visible = false;
    camera.add(model);
    models[id] = model;
  }
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: starTexture(), transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);
  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  const items = {};
  for (const id of Object.keys(WEAPONS)) {
    items[id] = { mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve, owned: id === 'pistol' || id === 'knife' };
  }
  const state = { current: 'pistol', cooldown: 0, reloadLeft: 0, flash: 0, kick: 0, grenades: 0, smokes: 0, flashes: 0, molotovs: 0, decoys: 0, grenadeSel: 'grenade', scoped: false, swing: 0, primarySlot: null, secondarySlot: 'pistol' };
  models.pistol.visible = true;

  function def() {
    return WEAPONS[state.current];
  }

  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.swing = Math.max(0, state.swing - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    const model = models[state.current];
    model.position.z = model.userData.baseZ + state.kick;
    model.rotation.x = state.kick * 2.2;
    model.rotation.z = state.swing > 0 ? -state.swing * 4 : 0;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.55 * Math.min(1, (def().reloadTime - state.reloadLeft) * 2);
      if (state.reloadLeft === 0) {
        const item = items[state.current];
        const need = def().mag - item.mag;
        const take = Math.min(need, item.reserve);
        item.mag += take;
        item.reserve -= take;
      }
    }
  }

  return {
    state,
    items,
    def,
    step,
    ready() {
      const item = items[state.current];
      return item.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },
    takeRound() {
      const item = items[state.current];
      if (item.mag <= 0) return false;
      item.mag -= 1;
      return true;
    },
    pullTrigger() {
      state.cooldown = def().fireGap;
      state.flash = 0.09;
      state.kick = def().kick;
      audio.shoot(false);
    },
    swing() {
      state.cooldown = def().fireGap;
      state.swing = 0.25;
      audio.swing();
    },
    reload() {
      const item = items[state.current];
      if (state.reloadLeft > 0 || item.mag === def().mag || item.reserve === 0) return false;
      state.reloadLeft = def().reloadTime;
      audio.reload();
      return true;
    },
    spread(speed) {
      const d = def();
      return d.spreadStill + Math.min(1, speed / 5.2) * d.spreadMove;
    },
    select(id) {
      if (!items[id].owned || id === state.current || state.reloadLeft > 0) return false;
      models[state.current].visible = false;
      state.current = id;
      models[id].visible = true;
      state.cooldown = Math.max(state.cooldown, 0.25);
      state.scoped = false;
      if (WEAPONS[id].cls === 'primary') state.primarySlot = id;
      if (WEAPONS[id].cls === 'pistol') state.secondarySlot = id;
      return true;
    },
    buy(id) {
      if (items[id].owned) return false;
      items[id].owned = true;
      items[id].mag = WEAPONS[id].mag;
      items[id].reserve = WEAPONS[id].reserve;
      return true;
    },
    resetRound(keepLoadout) {
      if (!keepLoadout) {
        for (const id of Object.keys(items)) {
          if (id !== 'pistol' && id !== 'knife') items[id].owned = false;
        }
        state.grenades = 0;
        state.smokes = 0;
        state.flashes = 0;
        state.molotovs = 0;
        state.decoys = 0;
        state.grenadeSel = 'grenade';
        state.primarySlot = null;
        state.current = 'pistol';
        for (const id of Object.keys(models)) models[id].visible = id === 'pistol';
      }
      for (const id of Object.keys(items)) {
        if (items[id].owned) {
          items[id].mag = WEAPONS[id].mag;
          items[id].reserve = WEAPONS[id].reserve;
        }
      }
      state.cooldown = 0;
      state.reloadLeft = 0;
      state.flash = 0;
      state.kick = 0;
      state.swing = 0;
      state.scoped = false;
    },
  };
}

export function createGrenades(scene, colliders, onExplode) {
  const geometry = new THREE.SphereGeometry(0.09, 10, 8);
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ember), roughness: 0.4, metalness: 0.4 });
  const list = [];
  const probe = new THREE.Box3();

  function step(dt) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const grenade = list[index];
      grenade.velocity.y -= 14 * dt;
      grenade.position.addScaledVector(grenade.velocity, dt);
      probe.min.set(grenade.position.x - 0.09, grenade.position.y - 0.09, grenade.position.z - 0.09);
      probe.max.set(grenade.position.x + 0.09, grenade.position.y + 0.09, grenade.position.z + 0.09);
      let hit = false;
      for (const collider of colliders) {
        if (probe.intersectsBox(collider)) { hit = true; break; }
      }
      if (hit) {
        grenade.velocity.multiplyScalar(-0.35);
        grenade.position.y = Math.max(grenade.position.y, 0.1);
      }
      if (grenade.position.y < 0.09) {
        grenade.position.y = 0.09;
        grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.35;
        grenade.velocity.x *= 0.7;
        grenade.velocity.z *= 0.7;
      }
      grenade.fuse -= dt;
      if (grenade.fuse <= 0) {
        scene.remove(grenade.mesh);
        list.splice(index, 1);
        onExplode(grenade.position);
      }
    }
  }

  return {
    step,
    clear() {
      for (const grenade of list) scene.remove(grenade.mesh);
      list.length = 0;
    },
    throwFrom(position, direction, speed = 13) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.castShadow = true;
      scene.add(mesh);
      list.push({
        mesh,
        position: mesh.position,
        velocity: direction.clone().multiplyScalar(speed).add(new THREE.Vector3(0, 3.5, 0)),
        fuse: 2.2,
      });
    },
  };
}

export function createSmoke(scene, colliders) {
  const puffGeometry = new THREE.SphereGeometry(1, 10, 8);
  const puffMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8d8578'), transparent: true, opacity: 0.5, roughness: 1, metalness: 0, depthWrite: false });
  const canisterGeometry = new THREE.SphereGeometry(0.08, 10, 8);
  const canisterMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5a5148'), roughness: 0.5, metalness: 0.5 });
  const clouds = [];
  const canisters = [];
  const probe = new THREE.Box3();
  const CLOUD_RADIUS = 2.6;
  const CLOUD_LIFE = 12;

  function deploy(position) {
    const group = new THREE.Group();
    const puffs = [];
    for (let index = 0; index < 12; index += 1) {
      const puff = new THREE.Mesh(puffGeometry, puffMaterial.clone());
      const angle = (index / 12) * Math.PI * 2;
      const ring = index % 3;
      puff.position.set(Math.cos(angle) * (0.6 + ring * 0.6), 0.9 + (index % 4) * 0.45, Math.sin(angle) * (0.6 + ring * 0.6));
      puff.scale.setScalar(0.9 + ((index * 37) % 10) / 14);
      group.add(puff);
      puffs.push(puff);
    }
    group.position.copy(position);
    group.position.y = Math.max(group.position.y, 0.4);
    scene.add(group);
    clouds.push({ group, puffs, center: group.position.clone(), life: CLOUD_LIFE });
  }

  function segmentBlocked(a, b) {
    for (const cloud of clouds) {
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const abz = b.z - a.z;
      const lengthSq = abx * abx + aby * aby + abz * abz;
      const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((cloud.center.x - a.x) * abx + (cloud.center.y - a.y) * aby + (cloud.center.z - a.z) * abz) / lengthSq));
      const dx = a.x + abx * t - cloud.center.x;
      const dy = a.y + aby * t - cloud.center.y;
      const dz = a.z + abz * t - cloud.center.z;
      if (dx * dx + dy * dy + dz * dz < CLOUD_RADIUS * CLOUD_RADIUS) return true;
    }
    return false;
  }

  function step(dt) {
    for (let index = canisters.length - 1; index >= 0; index -= 1) {
      const canister = canisters[index];
      canister.velocity.y -= 14 * dt;
      canister.position.addScaledVector(canister.velocity, dt);
      probe.min.set(canister.position.x - 0.08, canister.position.y - 0.08, canister.position.z - 0.08);
      probe.max.set(canister.position.x + 0.08, canister.position.y + 0.08, canister.position.z + 0.08);
      let hit = false;
      for (const collider of colliders) {
        if (probe.intersectsBox(collider)) { hit = true; break; }
      }
      canister.timer -= dt;
      if (hit || canister.position.y < 0.1 || canister.timer <= 0) {
        scene.remove(canister.mesh);
        canisters.splice(index, 1);
        deploy(canister.position);
      }
    }
    for (let index = clouds.length - 1; index >= 0; index -= 1) {
      const cloud = clouds[index];
      cloud.life -= dt;
      const opacity = cloud.life < 3 ? Math.max(0, cloud.life / 3) * 0.5 : 0.5;
      for (const puff of cloud.puffs) puff.material.opacity = opacity;
      if (cloud.life <= 0) {
        scene.remove(cloud.group);
        for (const puff of cloud.puffs) puff.material.dispose();
        clouds.splice(index, 1);
      }
    }
  }

  return {
    step,
    clouds,
    blocked: segmentBlocked,
    clear() {
      for (const cloud of clouds) {
        scene.remove(cloud.group);
        for (const puff of cloud.puffs) puff.material.dispose();
      }
      clouds.length = 0;
      for (const canister of canisters) scene.remove(canister.mesh);
      canisters.length = 0;
    },
    throwFrom(position, direction, speed = 12) {
      const mesh = new THREE.Mesh(canisterGeometry, canisterMaterial);
      mesh.position.copy(position);
      mesh.castShadow = true;
      scene.add(mesh);
      canisters.push({
        mesh,
        position: mesh.position,
        velocity: direction.clone().multiplyScalar(speed).add(new THREE.Vector3(0, 3.2, 0)),
        timer: 1.4,
      });
    },
  };
}

export function createLobbed(scene, colliders) {
  const mats = {
    flash: new THREE.MeshStandardMaterial({ color: new THREE.Color('#e8e4da'), roughness: 0.3, metalness: 0.6, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.4 }),
    molotov: new THREE.MeshStandardMaterial({ color: new THREE.Color('#7a4a1a'), roughness: 0.2, metalness: 0.1, emissive: new THREE.Color('#e07830'), emissiveIntensity: 0.5 }),
    decoy: new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a3f45'), roughness: 0.4, metalness: 0.7, emissive: new THREE.Color('#e2543e'), emissiveIntensity: 0.2 }),
  };
  const geoms = {
    flash: new THREE.SphereGeometry(0.09, 10, 8),
    molotov: new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10),
    decoy: new THREE.SphereGeometry(0.1, 10, 8),
  };
  const list = [];
  const probe = new THREE.Box3();

  function step(dt) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const item = list[index];
      if (item.armed) {
        item.shotTimer -= dt;
        if (item.shotTimer <= 0) {
          item.shotTimer = 0.4;
          item.onShot(item.position);
        }
        item.life -= dt;
        item.mesh.material.emissiveIntensity = (item.life * 10) % 1 < 0.5 ? 1.6 : 0.2;
        if (item.life <= 0) {
          scene.remove(item.mesh);
          list.splice(index, 1);
        }
        continue;
      }
      item.velocity.y -= 14 * dt;
      item.position.addScaledVector(item.velocity, dt);
      probe.min.set(item.position.x - 0.09, item.position.y - 0.09, item.position.z - 0.09);
      probe.max.set(item.position.x + 0.09, item.position.y + 0.09, item.position.z + 0.09);
      let hit = false;
      for (const collider of colliders) {
        if (probe.intersectsBox(collider)) { hit = true; break; }
      }
      if (hit) {
        item.velocity.multiplyScalar(-0.35);
        item.position.y = Math.max(item.position.y, 0.1);
      }
      if (item.position.y < 0.09) {
        item.position.y = 0.09;
        item.velocity.y = Math.abs(item.velocity.y) * 0.35;
        item.velocity.x *= 0.7;
        item.velocity.z *= 0.7;
      }
      const landed = hit || item.position.y <= 0.1;
      if (item.kind === 'molotov' && landed) {
        scene.remove(item.mesh);
        list.splice(index, 1);
        item.onLand(item.position);
        continue;
      }
      item.fuse -= dt;
      if (item.fuse <= 0) {
        if (item.kind === 'decoy') {
          item.armed = true;
          item.life = 6;
          item.shotTimer = 0.1;
          item.velocity.set(0, 0, 0);
        } else {
          scene.remove(item.mesh);
          list.splice(index, 1);
          item.onFuse(item.position);
        }
      }
    }
  }

  return {
    step,
    clear() {
      for (const item of list) scene.remove(item.mesh);
      list.length = 0;
    },
    throwFrom(position, direction, kind, hooks, speed = 13) {
      const mesh = new THREE.Mesh(geoms[kind], mats[kind]);
      mesh.position.copy(position);
      mesh.castShadow = true;
      scene.add(mesh);
      list.push({
        mesh,
        position: mesh.position,
        velocity: direction.clone().multiplyScalar(speed).add(new THREE.Vector3(0, 3.5, 0)),
        fuse: kind === 'flash' ? 1.6 : 2.5,
        kind,
        armed: false,
        life: 0,
        shotTimer: 0,
        onFuse: hooks.onFuse || (() => {}),
        onLand: hooks.onLand || (() => {}),
        onShot: hooks.onShot || (() => {}),
      });
    },
  };
}
