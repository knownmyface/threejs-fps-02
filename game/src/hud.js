// The DOM HUD: health, armour, ammo, money, timer, score, kill feed and every overlay
// panel. It never touches the simulation; main.js pushes numbers in and reads the play,
// buy and restart callbacks out.
import { WEAPONS, GRENADE_PRICE, ARMOR_PRICE } from './weapons.js';

const COPY = {
  start: {
    title: 'DUSTLINE',
    copy: 'A freight yard at dusk. Plant the bomb at A or B, or clear the Ember team — first to 5 rounds takes the yard.',
    action: 'Click to play',
  },
  paused: {
    title: 'DUSTLINE',
    copy: 'Paused. Click to resume.',
    action: 'Click to resume',
  },
  down: {
    title: 'You are down',
    copy: 'Your team fights on without you. Watch a teammate until the round ends.',
    action: 'Spectating',
  },
  roundEnd: {
    title: '',
    copy: '',
    action: 'Next round',
  },
  matchEnd: {
    title: '',
    copy: '',
    action: 'Play again',
  },
};

const BUY_ITEMS = [
  { id: 'rifle', key: '1' },
  { id: 'smg', key: '2' },
  { id: 'sniper', key: '3' },
  { id: 'grenade', key: '4' },
  { id: 'armor', key: '5' },
];

export function createHud(onBuy) {
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const copy = document.getElementById('overlay-copy');
  const play = document.getElementById('play');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const ammo = document.getElementById('ammo');
  const weaponName = document.getElementById('weapon-name');
  const healthFill = document.getElementById('health-fill');
  const healthValue = document.getElementById('health-value');
  const armorValue = document.getElementById('armor-value');
  const moneyValue = document.getElementById('money-value');
  const timerValue = document.getElementById('timer-value');
  const scoreAtk = document.getElementById('score-atk');
  const scoreDef = document.getElementById('score-def');
  const roundValue = document.getElementById('round-value');
  const bombStatus = document.getElementById('bomb-status');
  const killfeed = document.getElementById('killfeed');
  const hitmarker = document.getElementById('hitmarker');
  const damageFlash = document.getElementById('damage-flash');
  const buyMenu = document.getElementById('buy-menu');
  const buyItems = document.getElementById('buy-items');
  const buyMoney = document.getElementById('buy-money');
  const crosshair = document.getElementById('crosshair');
  const hint = document.getElementById('hint');
  let hitTimer = 0;
  let last = {};

  const itemRows = {};
  for (const item of BUY_ITEMS) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'buy-row';
    row.dataset.item = item.id;
    const label = item.id === 'grenade' ? 'Frag grenade' : item.id === 'armor' ? 'Kevlar armour' : WEAPONS[item.id].name;
    const price = item.id === 'grenade' ? GRENADE_PRICE : item.id === 'armor' ? ARMOR_PRICE : WEAPONS[item.id].price;
    row.innerHTML = `<span class="buy-key">${item.key}</span><span class="buy-label">${label}</span><span class="buy-price">$${price}</span>`;
    row.addEventListener('click', () => onBuy(item.id));
    buyItems.appendChild(row);
    itemRows[item.id] = row;
  }

  function setText(element, value, key) {
    if (last[key] === value) return;
    last[key] = value;
    element.textContent = value;
  }

  return {
    setHealth(hp, armor) {
      healthFill.style.width = `${Math.max(0, Math.min(100, hp))}%`;
      setText(healthValue, String(Math.ceil(Math.max(0, hp))), 'hp');
      setText(armorValue, armor > 0 ? `+${Math.ceil(armor)}` : '', 'armor');
      healthFill.classList.toggle('low', hp <= 30);
    },
    setAmmo(mag, reserve) {
      setText(ammoMag, String(mag), 'mag');
      setText(ammoReserve, `/ ${reserve}`, 'reserve');
      ammo.classList.toggle('empty', mag === 0);
    },
    setWeapon(name, grenades) {
      setText(weaponName, grenades > 0 ? `${name}  ·  ${grenades} grenade${grenades > 1 ? 's' : ''}` : name, 'weapon');
    },
    setMoney(value) {
      setText(moneyValue, `$${value}`, 'money');
      setText(buyMoney, `$${value}`, 'buyMoney');
      for (const item of BUY_ITEMS) {
        const price = item.id === 'grenade' ? GRENADE_PRICE : item.id === 'armor' ? ARMOR_PRICE : WEAPONS[item.id].price;
        itemRows[item.id].classList.toggle('cant', value < price);
      }
    },
    setTimer(seconds, phase) {
      const total = Math.max(0, Math.ceil(seconds));
      const text = phase === 'buy' ? `BUY ${total}` : `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
      setText(timerValue, text, 'timer');
      timerValue.classList.toggle('urgent', phase !== 'buy' && total <= 10);
    },
    setScore(atk, def, round) {
      setText(scoreAtk, String(atk), 'scoreAtk');
      setText(scoreDef, String(def), 'scoreDef');
      setText(roundValue, `ROUND ${round}`, 'round');
    },
    setBomb(status) {
      setText(bombStatus, status, 'bomb');
      bombStatus.classList.toggle('planted', status.includes('PLANTED'));
    },
    setCrosshairGap(pixels) {
      crosshair.style.setProperty('--gap', `${pixels}px`);
    },
    hitMarker(killed, holdMs = 90) {
      hitmarker.classList.add('on');
      hitmarker.classList.toggle('kill', killed);
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => {
        hitmarker.classList.remove('on');
        hitmarker.classList.remove('kill');
      }, holdMs);
    },
    damageFrom(angle) {
      damageFlash.style.setProperty('--angle', `${angle}deg`);
      damageFlash.classList.remove('on');
      void damageFlash.offsetWidth;
      damageFlash.classList.add('on');
    },
    killfeed(html) {
      const entry = document.createElement('div');
      entry.className = 'killfeed-entry';
      entry.innerHTML = html;
      killfeed.prepend(entry);
      while (killfeed.children.length > 5) killfeed.removeChild(killfeed.lastChild);
      setTimeout(() => entry.remove(), 6000);
    },
    showHint(text) {
      hint.textContent = text;
      hint.hidden = !text;
    },
    showOverlay(mode, data = {}) {
      const text = COPY[mode];
      if (mode === 'roundEnd') {
        title.textContent = data.winner === 'atk' ? 'Round won' : 'Round lost';
        copy.textContent = `${data.reason} Vanguard ${data.scoreAtk} — ${data.scoreDef} Ember.`;
        play.textContent = data.matchOver ? 'See the result' : 'Next round';
      } else if (mode === 'matchEnd') {
        title.textContent = data.winner === 'atk' ? 'Vanguard takes the yard' : 'Ember holds the yard';
        copy.textContent = `Final score: Vanguard ${data.scoreAtk} — ${data.scoreDef} Ember. ${data.winner === 'atk' ? 'The yard is yours.' : 'Run it back.'}`;
        play.textContent = 'Play again';
      } else {
        title.textContent = text.title;
        copy.textContent = text.copy;
        play.textContent = text.action;
      }
      overlay.hidden = false;
      if (mode !== 'down') play.focus();
    },
    hideOverlay() {
      overlay.hidden = true;
    },
    showBuy(open) {
      buyMenu.hidden = !open;
      if (open) {
        const first = buyItems.querySelector('.buy-row:not(.cant)');
        if (first) first.focus();
      }
    },
    markBought(id) {
      const row = itemRows[id];
      if (!row) return;
      row.classList.add('bought');
      setTimeout(() => row.classList.remove('bought'), 600);
    },
    onPlay(handler) {
      play.addEventListener('click', handler);
    },
  };
}
