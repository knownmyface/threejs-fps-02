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
  canvas.width = 16;
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
  ctx.fillRect(0, 0, 16, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

  const colliders = [];
  const shootables = [];

  function box(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials[material]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  // Ground and perimeter: a yard 44 x 32 m, walls 5 m high, open to the dusk sky.
  box(44.4, 0.4, 32.4, 0, -0.2, 0, 'sand');
  box(0.4, 5, 32.4, -22.2, 2.5, 0, 'surface');
  box(0.4, 5, 32.4, 22.2, 2.5, 0, 'surface');
  box(44.4, 5, 0.4, 0, 2.5, -16.2, 'surface');
  box(44.4, 5, 0.4, 0, 2.5, 16.2, 'surface');

  // Lane walls: they split mid from the side lanes and leave a gap at each end.
  box(0.4, 3, 8, -10, 1.5, 0, 'surface');
  box(0.4, 3, 8, 10, 1.5, 0, 'surface');

  // Containers: site A stacks west, site B stacks east, one block in mid.
  box(6, 2.6, 2.6, -18.5, 1.3, -10, 'accent');
  box(2.6, 2.6, 6, -13, 1.3, -12.5, 'hairline');
  box(6, 2.6, 2.6, 18.5, 1.3, -10, 'accent');
  box(2.6, 2.6, 6, 13, 1.3, -12.5, 'hairline');
  box(4, 2.6, 2.6, 0, 1.3, 2, 'hairline');
  box(2.6, 5.2, 2.6, -6, 2.6, -8, 'surface');
  box(2.6, 5.2, 2.6, 6, 2.6, -8, 'surface');

  // Crates: full cover on the lanes, low crates that can be jumped onto.
  box(1.2, 1.2, 1.2, -14, 0.6, 6, 'sand');
  box(1.2, 1.2, 1.2, 14, 0.6, 6, 'sand');
  box(1.2, 1.2, 1.2, -14, 0.6, -4, 'sand');
  box(1.2, 1.2, 1.2, 14, 0.6, -4, 'sand');
  box(1.2, 1.2, 1.2, -4, 0.6, -12, 'sand');
  box(1.2, 1.2, 1.2, 4, 0.6, -12, 'sand');
  box(0.9, 0.9, 0.9, -3, 0.45, 8, 'hairline');
  box(0.9, 0.9, 0.9, 3, 0.45, 8, 'hairline');
  box(0.9, 0.9, 0.9, -3, 0.45, -4, 'hairline');
  box(0.9, 0.9, 0.9, 3, 0.45, -4, 'hairline');

  // The walkway: a steel deck 2.6 m up along the west wall, the yard's high ground.
  // Seven steps rise 0.325 m each from the ground to the deck; the mover's step-up
  // climbs them, and the deck overlooks site A and the west lane.
  box(2, 0.25, 16, -20.4, 2.475, -6, 'surface');
  for (let stepIndex = 0; stepIndex < 7; stepIndex += 1) {
    const top = 2.6 - (stepIndex + 1) * 0.325;
    box(2, top, 0.6, -20.4, top / 2, 2.3 + stepIndex * 0.6, 'hairline');
  }
  box(0.3, 2.6, 0.3, -21.2, 1.3, -13, 'hairline');
  box(0.3, 2.6, 0.3, -19.6, 1.3, -13, 'hairline');
  // Deck railing: a solid rail along the east edge and the north end, so nobody
  // walks off the high ground — the only way down is the stair run at the south
  // end. The rail is an invisible movement collider only (no mesh in shootables),
  // so bullets still fly over it and the deck keeps its firing lines.
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

  // Visual-only dressing: no colliders, so nothing here changes movement or bullets.
  // Rail tracks across the yard floor, two dark steel strips.
  const railSteel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#241d17'), roughness: 0.4, metalness: 0.6 });
  for (const trackZ of [4.5, 6.5]) {
    const track = new THREE.Mesh(new THREE.BoxGeometry(44, 0.05, 0.5), railSteel);
    track.position.set(0, 0.03, trackZ);
    group.add(track);
  }
  // Lamp posts flanking mid: warm pools of light on the lane.
  for (const lampX of [-4.5, 4.5]) {
    box(0.15, 3.2, 0.15, lampX, 1.6, 0, 'hairline');
    const lamp = new THREE.PointLight(new THREE.Color('#ffb066'), 5, 10);
    lamp.position.set(lampX, 3.1, 0);
    group.add(lamp);
  }
  // Skyline beyond the walls: container stacks and two gantry cranes in silhouette.
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

  // Sky: a gradient dome and a low sun disc, both unfogged so the dusk reads.
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

  // Site markers: a painted letter on the floor and a beacon pole that glows.
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

  // Light: a low warm sun from the west, a cool dusk fill, and a sky/ground gradient.
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
      A: { center: new THREE.Vector3(-16, 0, -10), minX: -19.5, maxX: -12.5, minZ: -13.5, maxZ: -6.5 },
      B: { center: new THREE.Vector3(16, 0, -10), minX: 12.5, maxX: 19.5, minZ: -13.5, maxZ: -6.5 },
    },
    spawns: {
      atk: [new THREE.Vector3(-3, 0, 13), new THREE.Vector3(0, 0, 13.5), new THREE.Vector3(3, 0, 13)],
      def: [new THREE.Vector3(-6, 0, -13), new THREE.Vector3(0, 0, -13.5), new THREE.Vector3(6, 0, -13)],
    },
    waypoints: {
      atkA: [[-6, 8], [-12, 2], [-14, -4], [-16, -8]],
      atkB: [[6, 8], [12, 2], [14, -4], [16, -8]],
      atkMid: [[0, 6], [0, 0], [0, -6], [0, -11]],
      defPatrol: [[-16, -8], [-8, -8], [0, -10], [8, -8], [16, -8], [8, -8], [0, -10], [-8, -8]],
      defMid: [[0, -4], [-4, -6], [4, -6]],
      // Up the stair run and along the deck: the walkway patrol, high ground over A.
      // The first point is the stair foot, so the patrol climbs straight up.
      walkway: [[-20.4, 4], [-20.4, 0], [-20.4, -6], [-20.4, -12], [-20.4, -6], [-20.4, 0], [-20.4, 4], [-20.4, 8]],
    },
  };
}
