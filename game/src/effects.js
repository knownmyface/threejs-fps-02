// Effects: pooled tracers, impact sparks and molotov fire zones. Everything is
// pre-made and reused; nothing allocates per frame.
import * as THREE from 'three';

export function starTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,220,160,1)');
  g.addColorStop(0.35, 'rgba(224,120,48,0.9)');
  g.addColorStop(1, 'rgba(224,120,48,0)');
  x.fillStyle = g;
  x.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 62 : 10;
    const px = 64 + Math.cos(a) * r;
    const py = 64 + Math.sin(a) * r;
    if (i === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  }
  x.closePath();
  x.fill();
  return new THREE.CanvasTexture(c);
}

export function createEffects(scene) {
  const tracerGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6, 1, true);
  tracerGeo.rotateX(Math.PI / 2);
  const tracers = [];
  for (let i = 0; i < 14; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb066'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(tracerGeo, mat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    tracers.push({ mesh, mat, life: 0 });
  }
  let tracerNext = 0;
  const sparkTex = starTexture();
  const sparks = [];
  for (let i = 0; i < 16; i += 1) {
    const mat = new THREE.SpriteMaterial({ map: sparkTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    scene.add(sprite);
    sparks.push({ sprite, mat, life: 0 });
  }
  let sparkNext = 0;
  const zones = [];
  const tmp = new THREE.Vector3();

  function fire(from, to, color = '#ffb066') {
    const t = tracers[tracerNext];
    tracerNext = (tracerNext + 1) % tracers.length;
    const len = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) || 0.01;
    t.mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    t.mesh.lookAt(to);
    t.mesh.scale.set(1, 1, len);
    t.mat.color.set(color);
    t.mat.opacity = 0.9;
    t.mesh.visible = true;
    t.life = 0.08;
  }

  function spark(point, scale = 0.5) {
    const s = sparks[sparkNext];
    sparkNext = (sparkNext + 1) % sparks.length;
    s.sprite.position.copy(point);
    s.sprite.scale.setScalar(scale);
    s.mat.opacity = 1;
    s.sprite.visible = true;
    s.life = 0.25;
  }

  function deployFire(position) {
    const group = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.5, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e07830'), transparent: true, opacity: 0.55, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.05;
    group.add(disc);
    const cones = [];
    for (let i = 0; i < 5; i += 1) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? '#ffb066' : '#e2543e'), transparent: true, opacity: 0.85, depthWrite: false }));
      const a = (i / 5) * Math.PI * 2;
      cone.position.set(Math.cos(a) * 1.1, 0.55, Math.sin(a) * 1.1);
      group.add(cone);
      cones.push(cone);
    }
    const light = new THREE.PointLight(new THREE.Color('#ff8a30'), 8, 7);
    light.position.y = 1.2;
    group.add(light);
    group.position.copy(position);
    group.position.y = Math.max(group.position.y, 0);
    scene.add(group);
    zones.push({ group, cones, light, center: group.position.clone(), life: 5, tick: 0 });
  }

  function step(dt, time, hurt) {
    for (const t of tracers) {
      if (t.life > 0) {
        t.life -= dt;
        t.mat.opacity = Math.max(0, t.life / 0.08) * 0.9;
        if (t.life <= 0) t.mesh.visible = false;
      }
    }
    for (const s of sparks) {
      if (s.life > 0) {
        s.life -= dt;
        s.mat.opacity = Math.max(0, s.life / 0.25);
        s.sprite.scale.multiplyScalar(0.96);
        if (s.life <= 0) s.sprite.visible = false;
      }
    }
    for (let i = zones.length - 1; i >= 0; i -= 1) {
      const z = zones[i];
      z.life -= dt;
      z.tick -= dt;
      for (let c = 0; c < z.cones.length; c += 1) {
        const f = 0.8 + Math.sin(time * 11 + c * 1.7) * 0.25;
        z.cones[c].scale.set(f, f * (0.9 + Math.sin(time * 7 + c) * 0.2), f);
      }
      z.light.intensity = 6 + Math.sin(time * 9) * 2;
      if (z.tick <= 0) {
        z.tick = 0.25;
        if (hurt) hurt(z.center, 2.5, 8);
      }
      if (z.life <= 0) {
        scene.remove(z.group);
        zones.splice(i, 1);
      }
    }
  }

  return {
    fire,
    spark,
    deployFire,
    step,
    zones,
    active() {
      return {
        tracers: tracers.filter((t) => t.life > 0).length,
        sparks: sparks.filter((s) => s.life > 0).length,
        zones: zones.length,
      };
    },
    clear() {
      for (const t of tracers) { t.life = 0; t.mesh.visible = false; }
      for (const s of sparks) { s.life = 0; s.sprite.visible = false; }
      for (const z of zones) scene.remove(z.group);
      zones.length = 0;
    },
    inFire(position) {
      for (const z of zones) {
        tmp.copy(position);
        tmp.y = 0;
        if (tmp.distanceTo(z.center) < 2.5) return z;
      }
      return null;
    },
  };
}
