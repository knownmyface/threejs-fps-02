// A top-down minimap on a 2D canvas: walls, sites, the player arrow, friendly dots and
// enemy dots the team has seen in the last few seconds. It reads the match, never writes.
import { PALETTE } from './palette.js';

const WORLD_MIN_X = -22.2;
const WORLD_MAX_X = 22.2;
const WORLD_MIN_Z = -16.2;
const WORLD_MAX_Z = 16.2;

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  function toMap(x, z) {
    return [
      ((x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)) * width,
      ((z - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z)) * height,
    ];
  }

  return {
    draw(state) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(20, 17, 14, 0.82)';
      ctx.fillRect(0, 0, width, height);
      // Walls as the border, sites as letters.
      ctx.strokeStyle = PALETTE.surface;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [letter, site] of [['A', state.sites.A], ['B', state.sites.B]]) {
        const [x, z] = toMap(site.center.x, site.center.z);
        ctx.beginPath();
        ctx.arc(x, z, 8, 0, Math.PI * 2);
        ctx.fillStyle = state.bombSite === letter ? PALETTE.ember : 'rgba(224, 120, 48, 0.35)';
        ctx.fill();
        ctx.fillStyle = PALETTE.ink;
        ctx.fillText(letter, x, z);
      }
      // Bomb: a blinking dot at the planted site.
      if (state.bombPlanted && state.bombSite) {
        const [x, z] = toMap(state.sites[state.bombSite].center.x, state.sites[state.bombSite].center.z);
        ctx.fillStyle = Math.floor(performance.now() / 300) % 2 === 0 ? PALETTE.ember : PALETTE.ink;
        ctx.beginPath();
        ctx.arc(x, z, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Smoke: grey circles that hide whatever is inside them.
      if (state.smokes) {
        for (const cloud of state.smokes) {
          const [sx, sz] = toMap(cloud.x, cloud.z);
          ctx.fillStyle = 'rgba(141, 133, 120, 0.55)';
          ctx.beginPath();
          ctx.arc(sx, sz, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Friendlies and recently seen enemies.
      for (const bot of state.bots) {
        if (!bot.alive) continue;
        const [x, z] = toMap(bot.x, bot.z);
        ctx.fillStyle = bot.team === 'atk' ? PALETTE.teal : PALETTE.ember;
        ctx.beginPath();
        ctx.arc(x, z, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // The player: an arrow that turns with the view.
      const [px, pz] = toMap(state.player.x, state.player.z);
      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(Math.atan2(Math.sin(state.player.yaw), Math.cos(state.player.yaw)) + Math.PI);
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
}
