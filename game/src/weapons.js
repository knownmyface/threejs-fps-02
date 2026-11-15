// Weapons: the numbers table, the view models, and the grenade. One module owns every
// gun; main.js owns the ray and the damage, bots own their own trigger pulls through the
// same table. A head shot pays the head multiplier; moving pays in spread.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export const WEAPONS = {
  pistol: {
    name: 'P-9 Sidearm', price: 0, damage: 25, headMult: 3, mag: 12, reserve: 60,
    fireGap: 0.16, auto: false, spreadStill: 0.004, spreadMove: 0.02, reloadTime: 1.4, range: 60,
    adsSpreadMult: 0.5, adsFov: 60, adsMoveMult: 0.6,
  },
  rifle: {
    name: 'Dingo-7 Rifle', price: 1500, damage: 34, headMult: 3, mag: 30, reserve: 90,
    fireGap: 0.096, auto: true, spreadStill: 0.0022, spreadMove: 0.028, reloadTime: 1.9, range: 80,
    adsSpreadMult: 0.45, adsFov: 58, adsMoveMult: 0.6,
  },
  smg: {
    name: 'Wasp-9 SMG', price: 900, damage: 22, headMult: 3, mag: 32, reserve: 128,
    fireGap: 0.07, auto: true, spreadStill: 0.006, spreadMove: 0.032, reloadTime: 1.6, range: 45,
    adsSpreadMult: 0.5, adsFov: 62, adsMoveMult: 0.65,
  },
  sniper: {
    name: 'Kestrel .50', price: 2800, damage: 90, headMult: 2.8, mag: 5, reserve: 15,
    fireGap: 1.1, auto: false, spreadStill: 0.0004, spreadMove: 0.05, reloadTime: 2.6, range: 120,
    adsSpreadMult: 0.4, adsFov: 30, adsMoveMult: 0.5,
  },
};

export const GRENADE_PRICE = 300;
export const SMOKE_PRICE = 400;
export const ARMOR_PRICE = 650;
export const HELMET_PRICE = 350;
// A helmet turns a head shot's multiplier down to this: the same rifle head
// shot that deals 3x damage deals 1.25x through a helmet.
export const HELMET_HEAD_MULT = 1.25;

function buildViewModel(id) {
  const grip = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const body = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.5, metalness: 0.35 });
  const accent = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.5, metalness: 0.2 });
  const model = new THREE.Group();
  if (id === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.22), body);
    const gripMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.07), grip);
    gripMesh.position.set(0, -0.08, 0.08);
    model.add(slide, gripMesh);
    model.position.set(0.2, -0.2, -0.36);
  } else if (id === 'smg') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.3), body);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), grip);
    barrel.position.set(0, 0.02, -0.25);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.06), accent);
    mag.position.set(0, -0.11, -0.02);
    model.add(receiver, barrel, mag);
    model.position.set(0.22, -0.2, -0.4);
  } else if (id === 'sniper') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.5), body);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.55), grip);
    barrel.position.set(0, 0.02, -0.5);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), accent);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.08, -0.05);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.2), grip);
    stock.position.set(0, -0.02, 0.32);
    model.add(receiver, barrel, scope, stock);
    model.position.set(0.24, -0.21, -0.46);
  } else {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.42), body);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.4), grip);
    barrel.position.set(0, 0.025, -0.38);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.22), grip);
    stock.position.set(0, -0.02, 0.3);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.06), accent);
    sight.position.set(0, 0.07, -0.1);
    model.add(receiver, barrel, stock, sight);
    model.position.set(0.24, -0.2, -0.42);
  }
  return model;
}

// The player's arsenal: one view model per weapon, ammo tracked per weapon, one active.
export function createArsenal(camera, audio) {
  const models = {};
  for (const id of Object.keys(WEAPONS)) {
    const model = buildViewModel(id);
    model.visible = false;
    camera.add(model);
    models[id] = model;
  }
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);
  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  const items = {};
  for (const id of Object.keys(WEAPONS)) {
    items[id] = { mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve, owned: id === 'pistol' };
  }
  const state = { current: 'pistol', cooldown: 0, reloadLeft: 0, flash: 0, kick: 0, grenades: 0, smokes: 0, scoped: false };
  models.pistol.visible = true;

  function def() {
    return WEAPONS[state.current];
  }

  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    const model = models[state.current];
    model.position.z = (state.current === 'sniper' ? -0.46 : state.current === 'smg' ? -0.4 : state.current === 'pistol' ? -0.36 : -0.42) + state.kick;
    model.rotation.x = state.kick * 2.2;
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
      state.flash = 0.06;
      state.kick = state.current === 'sniper' ? 0.12 : 0.055;
      audio.shoot(false);
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
          if (id !== 'pistol') items[id].owned = false;
        }
        state.grenades = 0;
        state.smokes = 0;
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
      state.scoped = false;
    },
  };
}

// Grenades: a thrown sphere with an arc, a fuse, and a radius falloff on explode.
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

// Smoke: a thrown canister that pops into a grey cloud. The cloud blocks sight, not
// bullets — a bot whose line of sight crosses a cloud cannot see through it, so smoke
// cuts sightlines for pushes and defuses. One cloud is a dozen puffs in a ball.
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
