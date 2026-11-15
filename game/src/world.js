// The map: DUSTLINE, a freight yard at dusk. 44 x 32 m, two bomb sites (A west, B east),
// a mid lane and two side lanes, containers and crates for cover, and a raised steel
// walkway along the west wall with a stair run — the yard's one high ground, reached by
// the mover's step-up. Every box is a collider for movement and a surface a bullet
// stops on. Plain geometry only, no models, no textures except two canvas-drawn site
// letters and a canvas gradient sky made at runtime.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#141a33');
  gradient.addColorStop(0.45, '#4a3550');
  gradient.addColorStop(0.68, '#a85a34');
  gradient.addColorStop(0.78, '#e07830');
  gradient.addColorStop(0.85, '#2b1a12');
  gradient.addColorStop(1, '#191411');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);
  const haze = ctx.createLinearGradient(0, 300, 0, 430);
  haze.addColorStop(0, 'rgba(255,170,90,0)');
  haze.addColorStop(0.5, 'rgba(255,170,90,0.22)');
  haze.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 300, 1024, 130);
  for (let i = 0; i < 26; i += 1) {
    const y = 120 + Math.random() * 220;
    const warm = y > 260;
    ctx.fillStyle = warm ? `rgba(255,${140 + Math.floor(Math.random() * 60)},90,${0.1 + Math.random() * 0.16})` : `rgba(20,22,48,${0.25 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 1024, y, 60 + Math.random() * 140, 10 + Math.random() * 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function canvasTexture(size, draw, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.anisotropy = 4;
  return texture;
}

function groundTexture() {
  return canvasTexture(512, (x, s) => {
    x.fillStyle = '#6e5b45';
    x.fillRect(0, 0, s, s);
    const cell = s / 8;
    for (let i = 0; i < 8; i += 1) {
      for (let j = 0; j < 8; j += 1) {
        const v = 0.85 + Math.random() * 0.3;
        x.fillStyle = `rgb(${Math.floor(110 * v)},${Math.floor(91 * v)},${Math.floor(69 * v)})`;
        x.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
      }
    }
    for (let i = 0; i < 40; i += 1) {
      x.fillStyle = `rgba(30,22,16,${0.08 + Math.random() * 0.15})`;
      x.beginPath();
      x.arc(Math.random() * s, Math.random() * s, 6 + Math.random() * 26, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = 'rgba(30,22,16,0.5)';
    x.lineWidth = 3;
    for (let i = 0; i <= 8; i += 1) {
      x.beginPath();
      x.moveTo(i * cell, 0);
      x.lineTo(i * cell, s);
      x.stroke();
      x.beginPath();
      x.moveTo(0, i * cell);
      x.lineTo(s, i * cell);
      x.stroke();
    }
  }, [9, 7]);
}

function containerTexture(base, label) {
  return canvasTexture(256, (x, s) => {
    x.fillStyle = base;
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 16) {
      x.fillStyle = 'rgba(0,0,0,0.18)';
      x.fillRect(i, 0, 5, s);
      x.fillStyle = 'rgba(255,255,255,0.06)';
      x.fillRect(i + 8, 0, 4, s);
    }
    for (let i = 0; i < 14; i += 1) {
      const rx = Math.random() * s;
      x.fillStyle = `rgba(90,50,25,${0.15 + Math.random() * 0.25})`;
      x.fillRect(rx, Math.random() * s * 0.3, 3 + Math.random() * 5, 40 + Math.random() * 120);
    }
    x.fillStyle = 'rgba(240,232,216,0.75)';
    x.font = 'bold 34px system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText(label, s / 2, s / 2);
  });
}

function wallTexture() {
  return canvasTexture(256, (x, s) => {
    x.fillStyle = '#2b241e';
    x.fillRect(0, 0, s, s);
    x.strokeStyle = 'rgba(0,0,0,0.4)';
    x.lineWidth = 3;
    for (let i = 0; i <= 4; i += 1) {
      x.beginPath();
      x.moveTo(0, i * 64);
      x.lineTo(s, i * 64);
      x.stroke();
      x.beginPath();
      x.moveTo(i * 64, 0);
      x.lineTo(i * 64, s);
      x.stroke();
    }
    for (let i = 0; i < 24; i += 1) {
      x.fillStyle = `rgba(20,14,10,${0.05 + Math.random() * 0.12})`;
      x.beginPath();
      x.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 18, 0, Math.PI * 2);
      x.fill();
    }
  }, [4, 1]);
}

function woodTexture() {
  return canvasTexture(256, (x, s) => {
    x.fillStyle = '#8a6a42';
    x.fillRect(0, 0, s, s);
    for (let j = 0; j < 4; j += 1) {
      const y = j * 64;
      const v = 0.85 + Math.random() * 0.3;
      x.fillStyle = `rgb(${Math.floor(138 * v)},${Math.floor(106 * v)},${Math.floor(66 * v)})`;
      x.fillRect(0, y + 2, s, 60);
      x.strokeStyle = 'rgba(40,26,12,0.55)';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(s, y);
      x.stroke();
      for (let i = 0; i < 5; i += 1) {
        x.strokeStyle = 'rgba(60,40,20,0.35)';
        x.beginPath();
        const gy = y + 10 + Math.random() * 44;
        x.moveTo(0, gy);
        x.bezierCurveTo(s * 0.3, gy + 4, s * 0.6, gy - 4, s, gy);
        x.stroke();
      }
    }
    x.strokeStyle = 'rgba(30,20,10,0.6)';
    x.lineWidth = 6;
    x.strokeRect(3, 3, s - 6, s - 6);
  });
}

function signTexture(text, sub) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const x = canvas.getContext('2d');
  x.clearRect(0, 0, 512, 192);
  x.fillStyle = 'rgba(240,232,216,0.92)';
  x.font = 'bold 96px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 256, 78);
  x.font = 'bold 34px system-ui, sans-serif';
  x.fillStyle = 'rgba(224,120,48,0.95)';
  x.fillText(sub, 256, 152);
  const t = new THREE.CanvasTexture(canvas);
  t.anisotropy = 4;
  return t;
}

function siteTexture(letter) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.accent;
  ctx.font = 'bold 150px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 128, 134);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const materials = {};
  for (const name of Object.keys(PALETTE)) {
    materials[name] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[name]),
      roughness: name === 'accent' || name === 'ink' ? 0.55 : 0.95,
      metalness: 0.02,
    });
  }
  const siteA = new THREE.MeshBasicMaterial({ map: siteTexture('A'), transparent: true, depthWrite: false });
  const siteB = new THREE.MeshBasicMaterial({ map: siteTexture('B'), transparent: true, depthWrite: false });
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95, metalness: 0.02 });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.95, metalness: 0.02 });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.9, metalness: 0.02 });
  const containerAccentMat = new THREE.MeshStandardMaterial({ map: containerTexture('#c96a2e', 'DUSTLINE'), roughness: 0.8, metalness: 0.15 });
  const containerDarkMat = new THREE.MeshStandardMaterial({ map: containerTexture('#3a322a', 'A-07'), roughness: 0.85, metalness: 0.1 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a4a2a'), roughness: 0.8, metalness: 0.3 });

  const colliders = [];
  const shootables = [];

  function box(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), typeof material === 'string' ? materials[material] : material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  function barrel(x, z) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 12), barrelMat);
    mesh.position.set(x, 0.55, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  box(44.4, 0.4, 32.4, 0, -0.2, 0, groundMat);
  box(0.4, 5, 32.4, -22.2, 2.5, 0, wallMat);
  box(0.4, 5, 32.4, 22.2, 2.5, 0, wallMat);
  box(44.4, 5, 0.4, 0, 2.5, -16.2, wallMat);
  box(44.4, 5, 0.4, 0, 2.5, 16.2, wallMat);

  box(0.4, 3, 8, -10, 1.5, 0, wallMat);
  box(0.4, 3, 8, 10, 1.5, 0, wallMat);

  box(6, 2.6, 2.6, -18.5, 1.3, -10, containerAccentMat);
  box(2.6, 2.6, 6, -13, 1.3, -12.5, containerDarkMat);
  box(6, 2.6, 2.6, 18.5, 1.3, -10, containerAccentMat);
  box(2.6, 2.6, 6, 13, 1.3, -12.5, containerDarkMat);
  box(4, 2.6, 2.6, 0, 1.3, 2, containerDarkMat);
  box(2.6, 5.2, 2.6, -6, 2.6, -8, wallMat);
  box(2.6, 5.2, 2.6, 6, 2.6, -8, wallMat);

  box(1.2, 1.2, 1.2, -14, 0.6, 6, woodMat);
  box(1.2, 1.2, 1.2, 14, 0.6, 6, woodMat);
  box(1.2, 1.2, 1.2, -9, 0.6, -6, woodMat);
  box(1.2, 1.2, 1.2, 9, 0.6, -6, woodMat);
  box(1.2, 1.2, 1.2, -4, 0.6, -12, woodMat);
  box(1.2, 1.2, 1.2, 4, 0.6, -12, woodMat);
  box(0.9, 0.9, 0.9, -3, 0.45, 8, woodMat);
  box(0.9, 0.9, 0.9, 3, 0.45, 8, woodMat);
  box(0.9, 0.9, 0.9, -3, 0.45, -4, woodMat);
  box(0.9, 0.9, 0.9, 3, 0.45, -4, woodMat);

  // standing player (eye 1.6) can shoot over them — the jiggle-peek mechanic.
  box(2.2, 1.1, 0.4, -5, 0.55, 4, wallMat);
  box(2.2, 1.1, 0.4, 5, 0.55, -4, wallMat);
  barrel(-2.5, 0);
  barrel(2.5, 0);
  barrel(-18, -1.5);
  barrel(18, -1.5);
  box(1.2, 1.35, 1.2, -5, 0.675, -2, woodMat);
  box(1.2, 1.35, 1.2, 5, 0.675, -2, woodMat);
  box(1.2, 1.35, 1.2, -10.5, 0.675, -5.5, woodMat);
  box(1.2, 1.35, 1.2, 10.5, 0.675, -5.5, woodMat);

  // Enterable rooms, one at each site: a roofed bay with a door on the north wall
  function room(cx, letter) {
    box(0.4, 3, 4, cx - 3.2, 1.5, -5, wallMat);
    box(0.4, 3, 4, cx + 3.2, 1.5, -5, wallMat);
    box(2.4, 3, 0.4, cx - 2.0, 1.5, -7, wallMat);
    box(2.4, 3, 0.4, cx + 2.0, 1.5, -7, wallMat);
    box(1.6, 0.8, 0.4, cx, 2.6, -7, wallMat);
    box(2.4, 3, 0.4, cx - 2.0, 1.5, -3, wallMat);
    box(2.4, 3, 0.4, cx + 2.0, 1.5, -3, wallMat);
    box(1.6, 0.8, 0.4, cx, 2.6, -3, wallMat);
    box(6.9, 0.2, 4.4, cx, 3.1, -5, wallMat);
    const lamp = new THREE.PointLight(new THREE.Color('#ffb066'), 3, 6);
    lamp.position.set(cx, 2.6, -5);
    group.add(lamp);
    for (const [z, ry] of [[-7.25, Math.PI], [-2.75, 0]]) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 1.28),
        new THREE.MeshBasicMaterial({ map: signTexture(`SITE ${letter}`, 'DUSTLINE YARD'), transparent: true, depthWrite: false }),
      );
      sign.position.set(cx, 1.9, z);
      sign.rotation.y = ry;
      group.add(sign);
    }
    const px = cx < 0 ? cx + 5.5 : cx - 5.5;
    box(1.0, 0.5, 0.5, px, 0.25, -1, woodMat);
    const leafMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a5a3a'), roughness: 1 });
    for (const [ox, oz] of [[-0.3, 0], [0.25, 0.1], [0, -0.12]]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), leafMat);
      leaf.position.set(px + ox, 0.7, -1 + oz);
      leaf.castShadow = true;
      group.add(leaf);
    }
  }
  room(-16, 'A');
  room(16, 'B');

  box(2, 0.25, 16, -20.4, 2.475, -6, 'surface');
  for (let stepIndex = 0; stepIndex < 7; stepIndex += 1) {
    const top = 2.6 - (stepIndex + 1) * 0.325;
    box(2, top, 0.6, -20.4, top / 2, 2.3 + stepIndex * 0.6, 'hairline');
  }
  box(0.3, 2.6, 0.3, -21.2, 1.3, -13, 'hairline');
  box(0.3, 2.6, 0.3, -19.6, 1.3, -13, 'hairline');
  const railMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.5, metalness: 0.5 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 16), railMat);
  rail.position.set(-19.45, 3.55, -6);
  group.add(rail);
  for (const postZ of [-13.5, -9, -4.5, 0]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railMat);
    post.position.set(-19.45, 3.07, postZ);
    group.add(post);
  }
  const northRail = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.06), railMat);
  northRail.position.set(-20.4, 3.55, -13.95);
  group.add(northRail);
  for (const postX of [-21, -20.4, -19.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railMat);
    post.position.set(postX, 3.07, -13.95);
    group.add(post);
  }
  colliders.push(new THREE.Box3(new THREE.Vector3(-19.5, 2.6, -14), new THREE.Vector3(-19.4, 3.55, 2)));
  colliders.push(new THREE.Box3(new THREE.Vector3(-21.4, 2.6, -14.1), new THREE.Vector3(-19.4, 3.55, -13.9)));

  const railSteel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#241d17'), roughness: 0.4, metalness: 0.6 });
  for (const trackZ of [4.5, 6.5]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(44, 0.05, 0.5), railSteel);
    track.position.set(0, 0.03, trackZ);
    group.add(track);
  }
  for (const lampX of [-4.5, 4.5]) {
    box(0.15, 3.2, 0.15, lampX, 1.6, 0, 'hairline');
    const lamp = new THREE.PointLight(new THREE.Color('#ffb066'), 5, 10);
    lamp.position.set(lampX, 3.1, 0);
    group.add(lamp);
  }
  const silhouette = new THREE.MeshStandardMaterial({ color: new THREE.Color('#241a14'), roughness: 1, metalness: 0 });
  function skylineBox(width, height, depth, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), silhouette);
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  skylineBox(6, 2.6, 2.6, -26, 1.3, -8, 0);
  skylineBox(6, 5.2, 2.6, -26, 2.6, -4, 0);
  skylineBox(6, 2.6, 2.6, 26, 1.3, 6, 0);
  skylineBox(2.6, 7.8, 2.6, 24, 3.9, -12, 0);
  for (const craneX of [-8, 12]) {
    skylineBox(0.9, 19, 0.9, craneX, 9.5, -21, 0);
    skylineBox(15, 0.7, 0.7, craneX + 3, 18.4, -21, 0);
    skylineBox(4, 0.7, 0.7, craneX - 5.5, 18.4, -21, 0);
    skylineBox(0.12, 6, 0.12, craneX + 8, 15, -21, 0);
    skylineBox(0.8, 0.8, 0.8, craneX + 8, 11.8, -21, 0);
  }

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(110, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(skyDome);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb066'), fog: false }),
  );
  sunDisc.position.set(-70, 22, -55);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  function siteMarker(letter, x, z) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), letter === 'A' ? siteA : siteB);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0.02, z);
    group.add(floor);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), emissive: new THREE.Color(PALETTE.accent), emissiveIntensity: 0.7, roughness: 0.5 }),
    );
    pole.position.set(x + 2.4, 1.7, z + 2.4);
    group.add(pole);
    const lamp = new THREE.PointLight(new THREE.Color(PALETTE.accent), 6, 9);
    lamp.position.set(x + 2.4, 3.2, z + 2.4);
    group.add(lamp);
  }
  siteMarker('A', -16, -10);
  siteMarker('B', 16, -10);

  const sky = new THREE.HemisphereLight(new THREE.Color('#8a7a68'), new THREE.Color(PALETTE.canvas), 0.9);
  scene.add(sky);
  const sun = new THREE.DirectionalLight(new THREE.Color('#ffb066'), 2.4);
  sun.position.set(-18, 10, 6);
  sun.target.position.set(0, 0, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -26;
  sun.shadow.camera.right = 26;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(new THREE.Color('#5a6a8a'), 0.5);
  fill.position.set(10, 12, 12);
  scene.add(fill);

  return {
    colliders,
    shootables,
    group,
    sites: {
      A: { center: new THREE.Vector3(-16, 0, -10), minX: -19.5, maxX: -12.5, minZ: -13.5, maxZ: -3 },
      B: { center: new THREE.Vector3(16, 0, -10), minX: 12.5, maxX: 19.5, minZ: -13.5, maxZ: -3 },
    },
    spawns: {
      atk: [new THREE.Vector3(-3, 0, 13), new THREE.Vector3(0, 0, 13.5), new THREE.Vector3(3, 0, 13)],
      def: [new THREE.Vector3(-6, 0, -13), new THREE.Vector3(0, 0, -13.5), new THREE.Vector3(6, 0, -13)],
    },
    waypoints: {
      atkA: [[-6, 8], [-12, 2], [-14, -4], [-16, -8], [-16, -5], [-16, -1]],
      atkB: [[6, 8], [12, 2], [14, -4], [16, -8], [16, -5], [16, -1]],
      atkMid: [[0, 6], [0, 0], [0, -6], [0, -11]],
      defPatrol: [[-16, -8], [-16, -5], [-16, -1], [-8, -8], [0, -10], [8, -8], [16, -8], [16, -5], [16, -1], [8, -8], [0, -10], [-8, -8]],
      defMid: [[0, -4], [-4, -6], [4, -6]],
      walkway: [[-20.4, 4], [-20.4, 0], [-20.4, -6], [-20.4, -12], [-20.4, -6], [-20.4, 0], [-20.4, 4], [-20.4, 8]],
    },
  };
}
