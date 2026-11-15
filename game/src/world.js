// The map: DUSTLINE, a freight yard at dusk. 44 x 32 m, two bomb sites (A west, B east),
// a mid lane and two side lanes, containers and crates for cover. Every box is a collider
// for movement and a surface a bullet stops on. Plain geometry only, no models, no textures
// except two canvas-drawn site letters made at runtime.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

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
    },
  };
}
