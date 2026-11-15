// Shared movement: acceleration, friction, gravity, crouch, jump and step-up,
// resolved as a box against the world's colliders one axis at a time, so a wall
// never swallows a body. The player and every bot move through this one module;
// only the input differs. Step-up is what makes stairs and the walkway walkable:
// a ledge up to STEP_UP high is climbed instead of blocking the step, as long as
// the head stays clear of the ceiling above it.
import * as THREE from 'three';

const RADIUS = 0.34;
const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
const GRAVITY = 20;
const JUMP_SPEED = 6.2;
const STEP_UP = 0.55;

export function createMover(colliders, options = {}) {
  const walkSpeed = options.walkSpeed ?? 5.2;
  const crouchSpeed = options.crouchSpeed ?? 2.4;
  const groundAccel = options.groundAccel ?? 42;
  const airAccel = options.airAccel ?? 9;
  const friction = options.friction ?? 9;

  const mover = {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    eye: STAND_EYE,
    onGround: true,
    crouching: false,
    height: STAND_HEIGHT,
  };
  const probe = new THREE.Box3();
  const wish = new THREE.Vector3();

  function overlaps(x, y, z, height, lift) {
    probe.min.set(x - RADIUS, y + lift, z - RADIUS);
    probe.max.set(x + RADIUS, y + height - lift, z + RADIUS);
    for (const collider of colliders) if (probe.intersectsBox(collider)) return collider;
    return null;
  }

  function tryStepUp(x, y, z, height) {
    const blocker = overlaps(x, y, z, height, 0.04);
    if (!blocker) return false;
    const top = blocker.max.y;
    if (top - y > STEP_UP) return false;
    if (overlaps(x, top, z, height, 0.02)) return false;
    mover.position.y = top;
    mover.position.x = x;
    mover.position.z = z;
    mover.onGround = true;
    mover.velocity.y = 0;
    return true;
  }

  function look(dx, dy, sensitivity = 0.0022) {
    mover.yaw -= dx * sensitivity;
    mover.pitch = Math.max(-1.45, Math.min(1.45, mover.pitch - dy * sensitivity));
  }

  function recoil(pitchKick, yawKick) {
    mover.pitch = Math.min(1.45, mover.pitch + pitchKick);
    mover.yaw += yawKick;
  }

  function step(dt, input) {
    const crouching = !!input.crouch;
    if (crouching && !mover.crouching) {
      mover.crouching = true;
      mover.height = CROUCH_HEIGHT;
    } else if (!crouching && mover.crouching && !overlaps(mover.position.x, mover.position.y, mover.position.z, STAND_HEIGHT, 0.02)) {
      mover.crouching = false;
      mover.height = STAND_HEIGHT;
    }
    const eyeTarget = mover.crouching ? CROUCH_EYE : STAND_EYE;
    mover.eye += (eyeTarget - mover.eye) * Math.min(1, dt * 12);

    const forward = input.forward || 0;
    const strafe = input.strafe || 0;
    wish.set(0, 0, 0);
    if (forward || strafe) {
      const sin = Math.sin(mover.yaw);
      const cos = Math.cos(mover.yaw);
      wish.set(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe).normalize();
    }

    const speed = (mover.crouching ? crouchSpeed : walkSpeed) * (input.sprint && !mover.crouching ? 1.35 : 1) * (input.speedMult ?? 1);
    const blend = Math.min(1, (mover.onGround ? groundAccel : airAccel) * dt / speed);
    mover.velocity.x += (wish.x * speed - mover.velocity.x) * blend;
    mover.velocity.z += (wish.z * speed - mover.velocity.z) * blend;
    if (mover.onGround && !wish.lengthSq()) {
      const damp = Math.max(0, 1 - friction * dt);
      mover.velocity.x *= damp;
      mover.velocity.z *= damp;
    }

    if (input.jump && mover.onGround) {
      mover.velocity.y = JUMP_SPEED;
      mover.onGround = false;
    }
    mover.velocity.y -= GRAVITY * dt;

    const nextX = mover.position.x + mover.velocity.x * dt;
    if (!overlaps(nextX, mover.position.y, mover.position.z, mover.height, 0.04)) mover.position.x = nextX;
    else if (!tryStepUp(nextX, mover.position.y, mover.position.z, mover.height)) mover.velocity.x = 0;
    const nextZ = mover.position.z + mover.velocity.z * dt;
    if (!overlaps(mover.position.x, mover.position.y, nextZ, mover.height, 0.04)) mover.position.z = nextZ;
    else if (!tryStepUp(mover.position.x, mover.position.y, nextZ, mover.height)) mover.velocity.z = 0;

    mover.position.y += mover.velocity.y * dt;
    mover.onGround = false;
    const hit = overlaps(mover.position.x, mover.position.y, mover.position.z, mover.height, 0);
    if (hit && mover.velocity.y <= 0) {
      mover.position.y = hit.max.y;
      mover.velocity.y = 0;
      mover.onGround = true;
    } else if (hit) {
      mover.position.y = hit.min.y - mover.height;
      mover.velocity.y = 0;
    }
    if (mover.position.y < 0) {
      mover.position.y = 0;
      mover.velocity.y = 0;
      mover.onGround = true;
    }
    mover.velocity.y = Math.max(-30, mover.velocity.y);
  }

  return {
    state: mover,
    step,
    look,
    recoil,
    overlaps,
    groundSpeed() {
      return Math.hypot(mover.velocity.x, mover.velocity.z);
    },
    place(x, z, yaw) {
      mover.position.set(x, 0, z);
      mover.velocity.set(0, 0, 0);
      mover.yaw = yaw;
      mover.pitch = 0;
      mover.crouching = false;
      mover.height = STAND_HEIGHT;
      mover.eye = STAND_EYE;
      mover.onGround = true;
    },
  };
}
