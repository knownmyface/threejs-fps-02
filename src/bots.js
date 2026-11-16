// Bots: state-machine teams that patrol, engage, investigate, defuse.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createMover } from './mover.js';
import { WEAPONS } from './weapons.js';
const BOT_SPEED = 4.2;
const ENGAGE_SPEED = 2.8;
const SEE_DISTANCE = 46;
const SEE_DISTANCE_CROUCH = 20;
const HEAR_DISTANCE = 26;
const BOT_HEALTH = 100;
const THINK_EVERY = 0.12;
const NAMES = {
  atk: ['Rook', 'Sable'],
  def: ['Vex', 'Hollow', 'Mira'],
};
const tmpDir = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpEye = new THREE.Vector3();
const tmpBox = new THREE.Box3();
const tmpRay = new THREE.Ray();
const tmpEnd = new THREE.Vector3();
export function createBots(scene, world, ctx) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = 60;
  const list = [];
  const hitMeshes = [];
  let noise = null;
  function buildBody(team) {
    const group = new THREE.Group();
    const atk = team === 'atk';
    const teamColor = atk ? PALETTE.teal : PALETTE.ember;
    const torsoMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(atk ? '#2f6fb2' : '#1c1713'), roughness: 0.6, metalness: 0.05 });
    const darkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(atk ? '#232a33' : '#14100d'), roughness: 0.85 });
    const vestMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(atk ? '#1d4e79' : '#a03a2a'), roughness: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(atk ? '#bcd6ea' : '#e2543e'), roughness: 0.5 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.78, 0.3), torsoMat);
    torso.position.y = 1.0;
    torso.userData.part = 'torso';
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.5, 0.32), vestMat);
    vest.position.y = 1.05;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.34), trimMat);
    stripe.position.y = atk ? 1.22 : 1.05;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 10), darkMat);
    head.position.y = 1.53;
    head.userData.part = 'head';
    const helmet = atk
      ? new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), torsoMat)
      : new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.24, 10), darkMat);
    helmet.position.y = atk ? 1.55 : 1.58;
    helmet.userData.part = 'head';
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: new THREE.Color(atk ? '#bcd6ea' : '#e2543e'), emissive: new THREE.Color(atk ? '#7fb3d5' : '#e2543e'), emissiveIntensity: 0.9 }));
    visor.position.set(0, 1.55, 0.16);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.55), darkMat);
    gun.position.set(0.2, 1.05, -0.2);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.13), torsoMat);
    armL.position.set(-0.32, 1.02, 0.05);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.13), torsoMat);
    armR.position.set(0.32, 1.02, -0.08);
    armR.rotation.x = -0.5;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), darkMat);
    legL.position.set(-0.13, 0.31, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), darkMat);
    legR.position.set(0.13, 0.31, 0);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshBasicMaterial({ color: new THREE.Color(teamColor) }));
    marker.position.y = 1.95;
    group.add(torso, vest, stripe, head, helmet, visor, gun, armL, armR, legL, legR, marker);
    if (!atk) {
      for (const sx of [-0.32, 0.32]) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.18), vestMat);
        pad.position.set(sx, 1.38, 0);
        group.add(pad);
      }
    }
    group.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return { group, torso, torsoMat, head, helmet, marker };
  }
  function makeBot(team, index) {
    const mover = createMover(world.colliders, { walkSpeed: BOT_SPEED });
    const body = buildBody(team);
    scene.add(body.group);
    const bot = {
      id: `${team}-${index}`,
      name: NAMES[team][index],
      team,
      mover,
      body,
      hp: BOT_HEALTH,
      alive: true,
      weapon: team === 'def' && index === 2 ? 'smg' : 'rifle',
      mag: 0,
      cooldown: 0,
      reloadLeft: 0,
      state: 'patrol',
      route: [],
      routeIndex: 0,
      target: null,
      lastSeen: null,
      lastSeenTime: -99,
      hearPos: null,
      hearTime: -99,
      burstLeft: 0,
      burstTimer: 0,
      pauseTimer: 0,
      strafeDir: 1,
      strafeTimer: 0,
      thinkTimer: Math.random() * THINK_EVERY,
      fall: 0,
      defusing: false,
      flash: 0,
      blindUntil: 0,
      grenades: 1,
      grenadeTimer: 10 + Math.random() * 12,
      routeLoops: 0,
      stuckTimer: 0,
      stuckPos: { x: 0, z: 0 },
    };
    bot.mag = WEAPONS[bot.weapon].mag;
    body.torso.userData.bot = bot;
    body.head.userData.bot = bot;
    body.helmet.userData.bot = bot;
    hitMeshes.push(body.torso, body.head, body.helmet);
    list.push(bot);
    return bot;
  }
  for (let index = 0; index < 2; index += 1) makeBot('atk', index);
  for (let index = 0; index < 3; index += 1) makeBot('def', index);
  function eyePosition(bot, out) {
    const s = bot.mover.state;
    out.set(s.position.x, s.position.y + s.eye, s.position.z);
    return out;
  }
  function sees(bot, targetPos, targetCrouching) {
    const s = bot.mover.state;
    eyePosition(bot, tmpEye);
    tmpDir.copy(targetPos).sub(tmpEye);
    const distance = tmpDir.length();
    const limit = targetCrouching ? SEE_DISTANCE_CROUCH : SEE_DISTANCE;
    if (distance > limit) return false;
    tmpDir.normalize();
    const forward = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    if (forward.dot(tmpDir) < -0.15) return false;
    if (ctx.smoke && ctx.smoke.blocked(tmpEye, targetPos)) return false;
    raycaster.set(tmpEye, tmpDir);
    raycaster.far = distance;
    const blocked = raycaster.intersectObjects(world.shootables, false)[0];
    return !blocked;
  }
  function aimAt(bot, point) {
    const s = bot.mover.state;
    eyePosition(bot, tmpEye);
    const dx = point.x - tmpEye.x;
    const dy = point.y - tmpEye.y;
    const dz = point.z - tmpEye.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    const wantYaw = Math.atan2(-dx, -dz);
    let delta = wantYaw - s.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    s.yaw += Math.max(-0.22, Math.min(0.22, delta));
    s.pitch += (Math.asin(Math.max(-1, Math.min(1, dy / length))) - s.pitch) * 0.5;
  }
  function playerBox(player) {
    const p = player.mover.state;
    tmpBox.min.set(p.position.x - 0.34, p.position.y, p.position.z - 0.34);
    tmpBox.max.set(p.position.x + 0.34, p.position.y + p.height, p.position.z + 0.34);
    return tmpBox;
  }
  function shootAt(bot, target) {
    const def = WEAPONS[bot.weapon];
    if (bot.cooldown > 0 || bot.reloadLeft > 0) return;
    if (bot.mag <= 0) {
      bot.reloadLeft = def.reloadTime;
      return;
    }
    bot.mag -= 1;
    bot.cooldown = def.fireGap;
    const s = bot.mover.state;
    eyePosition(bot, tmpEye);
    tmpTarget.copy(target.aimPoint);
    const distance = tmpEye.distanceTo(tmpTarget);
    const spread = 0.008 + distance * 0.0006 + (bot.mover.groundSpeed() > 0.5 ? 0.02 : 0);
    tmpDir.copy(tmpTarget).sub(tmpEye).normalize();
    tmpDir.x += (ctx.random() * 2 - 1) * spread;
    tmpDir.y += (ctx.random() * 2 - 1) * spread;
    tmpDir.z += (ctx.random() * 2 - 1) * spread;
    tmpDir.normalize();
    ctx.audio.shoot(true);
    let hitPoint = null;
    if (target.kind === 'player') {
      tmpRay.set(tmpEye, tmpDir);
      const hit = tmpRay.intersectBox(playerBox(target.player), tmpTarget);
      if (hit) {
        hitPoint = tmpTarget;
        const part = hit.y > target.player.mover.state.position.y + target.player.mover.state.height - 0.32 ? 'head' : 'torso';
        ctx.damagePlayer(def.damage, bot, part, def.headMult);
      }
      if (hitPoint) tmpEnd.copy(hitPoint);
      else tmpEnd.copy(tmpEye).addScaledVector(tmpDir, def.range);
      ctx.onShotFired(bot, tmpEye, tmpEnd, hitPoint);
      return;
    }
    raycaster.set(tmpEye, tmpDir);
    raycaster.far = def.range;
    const hits = raycaster.intersectObjects(hitMeshes.concat(world.shootables), false);
    const first = hits[0];
    if (first) {
      hitPoint = first.point;
      tmpEnd.copy(first.point);
      if (first.object.userData.bot === target.bot) {
        const part = first.object.userData.part;
        damage(target.bot, def.damage * (part === 'head' ? def.headMult : 1), part, bot);
      }
    } else {
      tmpEnd.copy(tmpEye).addScaledVector(tmpDir, def.range);
    }
    ctx.onShotFired(bot, tmpEye, tmpEnd, hitPoint);
  }
  function damage(bot, amount, part, attacker) {
    if (!bot.alive) return false;
    bot.hp -= amount;
    bot.flash = 1;
    if (ctx.recordDamage) ctx.recordDamage(attacker, amount);
    if (bot.defusing) {
      bot.defusing = false;
      ctx.match.state.bomb.defuse = 0;
    }
    if (bot.hp > 0) return false;
    bot.alive = false;
    bot.fall = 0;
    bot.target = null;
    bot.defusing = false;
    ctx.onKill(bot, attacker, part);
    return true;
  }
  function resetRound() {
    const match = ctx.match.state;
    for (const bot of list) {
      bot.hp = BOT_HEALTH;
      bot.alive = true;
      bot.fall = 0;
      bot.target = null;
      bot.lastSeen = null;
      bot.defusing = false;
      bot.mag = WEAPONS[bot.weapon].mag;
      bot.cooldown = 0;
      bot.reloadLeft = 0;
      bot.burstLeft = 0;
      bot.state = 'patrol';
      bot.routeIndex = 0;
      bot.routeLoops = 0;
      bot.flash = 0;
      bot.blindUntil = 0;
      bot.grenades = 1;
      bot.grenadeTimer = 10 + ctx.random() * 12;
      bot.body.torsoMat.emissive.setScalar(0);
      bot.body.group.rotation.set(0, 0, 0);
      bot.body.group.position.y = 0;
      bot.body.marker.visible = true;
    }
    const defSpawns = world.spawns.def;
    const atkSpawns = world.spawns.atk;
    list.filter((b) => b.team === 'def').forEach((bot, index) => {
      if (index === 1) {
        bot.mover.place(-20.4, 7, 0);
      } else {
        bot.mover.place(defSpawns[index].x, defSpawns[index].z, Math.PI);
      }
      bot.route = index === 1 ? world.waypoints.walkway : world.waypoints.defPatrol;
    });
    list.filter((b) => b.team === 'atk').forEach((bot, index) => {
      const spawn = atkSpawns[index === 0 ? 0 : 2];
      bot.mover.place(spawn.x, spawn.z, 0);
      bot.route = index === 0 ? world.waypoints.atkA : world.waypoints.atkB;
    });
    noise = null;
  }
  function think(bot, time) {
    const match = ctx.match.state;
    if (match.phase === 'buy' || match.phase === 'end') {
      bot.target = null;
      bot.state = 'patrol';
      return;
    }
    const enemies = [];
    if (bot.team === 'def') {
      const player = ctx.player;
      if (player.alive) enemies.push({ kind: 'player', player, aimPoint: new THREE.Vector3(player.mover.state.position.x, player.mover.state.position.y + (player.mover.state.crouching ? 0.9 : 1.2), player.mover.state.position.z), crouching: player.mover.state.crouching });
      for (const other of list) {
        if (other.team === 'atk' && other.alive) {
          enemies.push({ kind: 'bot', bot: other, aimPoint: new THREE.Vector3(other.mover.state.position.x, other.mover.state.position.y + 1.2, other.mover.state.position.z), crouching: false });
        }
      }
    } else {
      for (const other of list) {
        if (other.team === 'def' && other.alive) {
          enemies.push({ kind: 'bot', bot: other, aimPoint: new THREE.Vector3(other.mover.state.position.x, other.mover.state.position.y + 1.2, other.mover.state.position.z), crouching: false });
        }
      }
    }
    let seen = null;
    let seenDistance = Infinity;
    if (time < bot.blindUntil) {
      bot.target = null;
      bot.state = 'patrol';
      return;
    }
    for (const enemy of enemies) {
      if (sees(bot, enemy.aimPoint, enemy.crouching)) {
        const distance = bot.mover.state.position.distanceTo(enemy.aimPoint);
        if (distance < seenDistance) {
          seenDistance = distance;
          seen = enemy;
        }
      }
    }
    if (seen) {
      bot.target = seen;
      bot.lastSeen = seen.aimPoint.clone();
      bot.lastSeenTime = time;
      if (bot.team === 'atk' && bot.state !== 'engage' && time - (ctx.lastRadio || 0) > 8) {
        ctx.lastRadio = time;
        ctx.radio(`${bot.name}: Contact at ${bot.mover.state.position.x < 0 ? 'A' : 'B'}`);
      }
      bot.state = 'engage';
      return;
    }
    if (bot.target && time - bot.lastSeenTime < 1.2 && bot.lastSeen) {
      bot.state = 'engage';
      return;
    }
    bot.target = null;
    if (match.phase === 'planted' && match.bomb.site) {
      if (bot.team === 'def') {
        const site = world.sites[match.bomb.site];
        const defuser = list.filter((b) => b.team === 'def' && b.alive).sort((a, b) => a.mover.state.position.distanceTo(site.center) - b.mover.state.position.distanceTo(site.center))[0];
        if (defuser === bot) {
          bot.state = 'defuse';
        } else {
          bot.state = 'guard';
          bot.guardPoint = site.center;
        }
        return;
      }
      bot.state = 'guard';
      bot.guardPoint = world.sites[match.bomb.site].center;
      return;
    }
    if (noise && time - noise.time < 4 && bot.team === 'def') {
      bot.state = 'investigate';
      return;
    }
    bot.state = bot.team === 'def' ? 'patrol' : 'patrol';
  }
  function moveToward(bot, dt, point, speed) {
    const s = bot.mover.state;
    const dx = point.x - s.position.x;
    const dz = point.z - s.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.6) return true;
    const wantYaw = Math.atan2(-dx, -dz);
    let delta = wantYaw - s.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    s.yaw += Math.max(-0.16, Math.min(0.16, delta));
    const facing = Math.abs(delta) < 1.2;
    bot.mover.step(dt, { forward: facing ? 1 : 0, strafe: 0, jump: false, crouch: false });
    return false;
  }
  function step(dt, time) {
    for (const bot of list) {
      const s = bot.mover.state;
      if (!bot.alive) {
        bot.fall = Math.min(1, bot.fall + dt / 0.4);
        bot.body.group.rotation.x = -bot.fall * 1.45;
        bot.body.group.position.y = -bot.fall * 0.08;
        bot.body.marker.visible = false;
        continue;
      }
      bot.cooldown = Math.max(0, bot.cooldown - dt);
      bot.grenadeTimer = Math.max(0, bot.grenadeTimer - dt);
      bot.flash = Math.max(0, bot.flash - dt * 4);
      bot.body.torsoMat.emissive.setScalar(bot.flash * 0.55);
      if (bot.reloadLeft > 0) {
        bot.reloadLeft -= dt;
        if (bot.reloadLeft <= 0) {
          bot.mag = WEAPONS[bot.weapon].mag;
          bot.reloadLeft = 0;
        }
      }
      bot.thinkTimer -= dt;
      if (bot.thinkTimer <= 0) {
        bot.thinkTimer = THINK_EVERY + ctx.random() * 0.05;
        think(bot, time);
      }
      const fire = ctx.inFire ? ctx.inFire(s.position) : null;
      if (fire) {
        tmpTarget.set(s.position.x - fire.center.x, 0, s.position.z - fire.center.z).normalize();
        moveToward(bot, dt, { x: s.position.x + tmpTarget.x * 5, z: s.position.z + tmpTarget.z * 5 }, BOT_SPEED);
      } else if (time < bot.blindUntil) {
        bot.mover.step(dt, { forward: 0, strafe: 0, jump: false, crouch: false });
      } else if (bot.state === 'engage' && bot.target) {
        const point = bot.target.kind === 'player' && !ctx.player.alive ? bot.lastSeen : bot.target.aimPoint;
        const aimPoint = bot.lastSeenTime > time - 1.2 && bot.lastSeen ? bot.lastSeen : point;
        aimAt(bot, aimPoint);
        bot.strafeTimer -= dt;
        if (bot.strafeTimer <= 0) {
          bot.strafeTimer = 0.8 + ctx.random() * 0.8;
          bot.strafeDir = ctx.random() < 0.5 ? -1 : 1;
        }
        bot.mover.step(dt, { forward: 0, strafe: bot.strafeDir, jump: false, crouch: false });
        if (bot.target && bot.lastSeenTime > time - 1.2) {
          bot.pauseTimer -= dt;
          if (bot.pauseTimer <= 0) {
            if (bot.burstLeft <= 0) {
              bot.burstLeft = 3 + Math.floor(ctx.random() * 3);
              bot.pauseTimer = 0.5 + ctx.random() * 0.5;
            } else {
              bot.burstTimer -= dt;
              if (bot.burstTimer <= 0) {
                bot.burstTimer = WEAPONS[bot.weapon].fireGap;
                bot.burstLeft -= 1;
                shootAt(bot, bot.target);
              }
            }
          }
        }
        if (bot.team === 'def' && bot.grenades > 0 && bot.target && bot.lastSeenTime > time - 0.5 && bot.grenadeTimer <= 0) {
          const distance = bot.mover.state.position.distanceTo(bot.target.aimPoint);
          if (distance > 14) {
            bot.grenades -= 1;
            bot.grenadeTimer = 24 + ctx.random() * 8;
            eyePosition(bot, tmpEye);
            tmpDir.copy(bot.target.aimPoint).sub(tmpEye).normalize();
            ctx.grenades.throwFrom(tmpEye, tmpDir, 12);
            ctx.audio.grenadePin();
          }
        }
      } else if (bot.state === 'defuse') {
        const site = world.sites[ctx.match.state.bomb.site];
        const dx = site.center.x - bot.mover.state.position.x;
        const dz = site.center.z - bot.mover.state.position.z;
        const dist = Math.hypot(dx, dz);
        moveToward(bot, dt, { x: site.center.x, z: site.center.z }, BOT_SPEED);
        if (dist < 2) {
          bot.defusing = true;
          ctx.match.state.bomb.defuse += dt;
          ctx.match.state.bomb.defuser = bot;
          if (ctx.match.state.bomb.defuse >= 6) {
            ctx.match.state.bomb.defuse = 0;
            ctx.onDefused(bot);
          }
        } else {
          bot.defusing = false;
        }
      } else if (bot.state === 'guard' && bot.guardPoint) {
        const arrived = moveToward(bot, dt, { x: bot.guardPoint.x + 2, z: bot.guardPoint.z + 2 }, BOT_SPEED);
        if (arrived) {
          s.yaw += dt * 0.5;
          bot.mover.step(dt, { forward: 0, strafe: 0, jump: false, crouch: false });
        }
      } else if (bot.state === 'investigate' && noise) {
        const arrived = moveToward(bot, dt, { x: noise.x, z: noise.z }, BOT_SPEED);
        if (arrived) {
          s.yaw += dt * 0.8;
          bot.mover.step(dt, { forward: 0, strafe: 0, jump: false, crouch: false });
          if (time - noise.time > 3.5) noise = null;
        }
      } else {
        const route = bot.route;
        if (route && route.length > 0) {
          const point = route[bot.routeIndex % route.length];
          const arrived = moveToward(bot, dt, { x: point[0], z: point[1] }, BOT_SPEED);
          if (arrived) {
            bot.routeIndex = (bot.routeIndex + 1) % route.length;
            bot.stuckTimer = 0;
            bot.stuckPos = { x: s.position.x, z: s.position.z };
            if (bot.routeIndex === 0) {
              bot.routeLoops += 1;
              if (bot.team === 'atk' && bot.routeLoops >= 2 && ctx.match.state.phase === 'live'
                && !ctx.match.state.bomb.planted && time > 25 && ctx.random() < 0.5) {
                bot.route = bot.route === world.waypoints.atkA ? world.waypoints.atkB : world.waypoints.atkA;
                bot.routeLoops = 0;
              }
            }
          } else {
            const moved = Math.hypot(s.position.x - bot.stuckPos.x, s.position.z - bot.stuckPos.z);
            if (moved > 0.3) {
              bot.stuckTimer = 0;
              bot.stuckPos = { x: s.position.x, z: s.position.z };
            } else {
              bot.stuckTimer += dt;
              if (bot.stuckTimer > 3) {
                bot.routeIndex = (bot.routeIndex + 1) % route.length;
                bot.stuckTimer = 0;
                bot.stuckPos = { x: s.position.x, z: s.position.z };
              }
            }
          }
        } else {
          bot.mover.step(dt, { forward: 0, strafe: 0, jump: false, crouch: false });
        }
      }
      bot.body.group.position.set(s.position.x, s.position.y, s.position.z);
      bot.body.group.rotation.y = s.yaw;
      bot.body.marker.rotation.y += dt * 2;
    }
  }
  return {
    list,
    hitMeshes,
    step,
    damage,
    resetRound,
    hear(position) {
      const match = ctx.match.state;
      if (match.phase !== 'live' && match.phase !== 'planted') return;
      noise = { x: position.x, z: position.z, time: ctx.time() };
    },
    aliveCount(team) {
      return list.filter((b) => b.team === team && b.alive).length;
    },
    visibleEnemies() {
      return list.filter((b) => b.team === 'def' && b.alive && b.lastSeenTime > ctx.time() - 3);
    },
  };
}