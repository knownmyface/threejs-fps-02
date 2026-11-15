// The DOM HUD: health, armour, ammo, money, timer, score, kill feed and every overlay
// panel. It never touches the simulation; main.js pushes numbers in and reads the play,
// buy and restart callbacks out.
import { WEAPONS, GRENADE_PRICE, SMOKE_PRICE, FLASH_PRICE, MOLOTOV_PRICE, DECOY_PRICE, ARMOR_PRICE, HELMET_PRICE } from './weapons.js';

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
    action: 'Watch teammate',
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

function weaponEntry(id) {
  return { id, label: WEAPONS[id].name, note: WEAPONS[id].note, price: WEAPONS[id].price };
}

export const BUY_COLUMNS = [
  { name: 'Equipment', items: [
    { id: 'armor', label: 'Kevlar Vest', note: 'absorbs 50% damage', price: ARMOR_PRICE },
    { id: 'helmet', label: 'Helmet', note: 'headshots deal 1.25x', price: HELMET_PRICE },
  ] },
  { name: 'Pistols', items: [
    { id: 'pistol', label: 'P-9 Sidearm', note: 'Default — owned', price: 0 },
    weaponEntry('p250'), weaponEntry('deagle'), weaponEntry('tec9'), weaponEntry('dualies'),
  ] },
  { name: 'Mid-Tier', items: [
    weaponEntry('nova'), weaponEntry('xm1014'), weaponEntry('smg'), weaponEntry('p90'), weaponEntry('mac10'),
  ] },
  { name: 'Rifles', items: [
    weaponEntry('rifle'), weaponEntry('m4'), weaponEntry('ak47'), weaponEntry('sniper'), weaponEntry('sg553'), weaponEntry('awp'),
  ] },
  { name: 'Grenades', items: [
    { id: 'flash', label: 'Flashbang', note: 'blinds bots + you', price: FLASH_PRICE },
    { id: 'smoke', label: 'Smoke grenade', note: 'blocks sight', price: SMOKE_PRICE },
    { id: 'grenade', label: 'High Explosive', note: 'frag damage', price: GRENADE_PRICE },
    { id: 'molotov', label: 'Molotov', note: 'burning zone 5s', price: MOLOTOV_PRICE },
    { id: 'decoy', label: 'Decoy grenade', note: 'fake gunshots', price: DECOY_PRICE },
  ] },
];

export function createHud(onBuy, onColumn) {
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const copy = document.getElementById('overlay-copy');
  const play = document.getElementById('play');
  const settingsPanel = document.getElementById('settings');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const ammo = document.getElementById('ammo');
  const ammoLine = document.getElementById('ammo-line');
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
  const flashOverlay = document.getElementById('flash-overlay');
  const buyMenu = document.getElementById('buy-menu');
  const buyItems = document.getElementById('buy-items');
  const buyMoney = document.getElementById('buy-money');
  const crosshair = document.getElementById('crosshair');
  const hint = document.getElementById('hint');
  const roster = document.getElementById('roster');
  const scoreboard = document.getElementById('scoreboard');
  let hitTimer = 0;
  let last = {};
  let lastRoster = '';
  let lastScoreboard = '';

  const itemRows = {};
  const columnEls = [];
  BUY_COLUMNS.forEach((column, columnIndex) => {
    const col = document.createElement('div');
    col.className = 'buy-col';
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'buy-col-head';
    head.innerHTML = `<span class="buy-key">${columnIndex + 1}</span><span>${column.name}</span>`;
    head.addEventListener('click', () => onColumn(columnIndex));
    col.appendChild(head);
    column.items.forEach((item, itemIndex) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'buy-row';
      row.dataset.item = item.id;
      row.innerHTML = `<span class="buy-key">${itemIndex + 1}</span><span class="buy-label">${item.label}<small>${item.note}</small></span><span class="buy-price">${item.id === 'pistol' ? 'OWNED' : `$${item.price}`}</span>`;
      row.addEventListener('click', () => onBuy(item.id));
      col.appendChild(row);
      itemRows[item.id] = row;
    });
    buyItems.appendChild(col);
    columnEls.push(col);
  });

  function setText(element, value, key) {
    if (last[key] === value) return;
    last[key] = value;
    element.textContent = value;
  }

  return {
    setHealth(hp, armor, helmet = false) {
      healthFill.style.width = `${Math.max(0, Math.min(100, hp))}%`;
      setText(healthValue, String(Math.ceil(Math.max(0, hp))), 'hp');
      const armorText = armor > 0 && helmet ? `+${Math.ceil(armor)} · HELMET` : armor > 0 ? `+${Math.ceil(armor)}` : helmet ? 'HELMET' : '';
      setText(armorValue, armorText, 'armor');
      healthFill.classList.toggle('low', hp <= 30);
    },
    setAmmo(mag, reserve, show = true) {
      ammoLine.hidden = !show;
      if (!show) return;
      setText(ammoMag, String(mag), 'mag');
      setText(ammoReserve, `/ ${reserve}`, 'reserve');
      ammo.classList.toggle('empty', mag === 0);
    },
    setWeapon(name, counts = {}) {
      const parts = [name];
      const selKey = counts.sel === 'grenade' ? 'frag' : counts.sel;
      for (const [key, label] of [['frag', 'frag'], ['flash', 'flash'], ['smoke', 'smoke'], ['molotov', 'molotov'], ['decoy', 'decoy']]) {
        if (counts[key] > 0) parts.push(`${selKey === key ? '▸' : ''}${counts[key]} ${label}`);
      }
      setText(weaponName, parts.join('  ·  '), 'weapon');
    },
    setMoney(value) {
      setText(moneyValue, `$${value}`, 'money');
      setText(buyMoney, `$${value}`, 'buyMoney');
      for (const column of BUY_COLUMNS) {
        for (const item of column.items) {
          if (item.id === 'pistol') continue;
          itemRows[item.id].classList.toggle('cant', value < item.price);
        }
      }
    },
    setRoster(bots) {
      const key = bots.map((bot) => `${bot.team[0]}${bot.alive ? 1 : 0}`).join('');
      if (key === lastRoster) return;
      lastRoster = key;
      roster.innerHTML = '';
      for (const team of ['atk', 'def']) {
        const group = document.createElement('span');
        group.className = `roster-team ${team}`;
        for (const bot of bots.filter((item) => item.team === team)) {
          const dot = document.createElement('i');
          dot.className = bot.alive ? 'alive' : 'dead';
          dot.title = bot.name;
          group.appendChild(dot);
        }
        roster.appendChild(group);
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
    flashbang(strength = 1) {
      flashOverlay.style.setProperty('--flash-opacity', String(0.55 + 0.45 * Math.min(1, strength)));
      flashOverlay.classList.remove('on');
      void flashOverlay.offsetWidth;
      flashOverlay.classList.add('on');
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
      const statsLine = data.accuracy !== undefined
        ? ` Accuracy ${data.accuracy}% · ${data.kills} kills · ${data.deaths} deaths · ${data.headshots} headshots.`
        : '';
      if (mode === 'roundEnd') {
        title.textContent = data.winner === 'atk' ? 'Round won' : 'Round lost';
        copy.textContent = `${data.reason} Vanguard ${data.scoreAtk} — ${data.scoreDef} Ember.${statsLine}`;
        play.textContent = data.matchOver ? 'See the result' : 'Next round';
      } else if (mode === 'matchEnd') {
        title.textContent = data.winner === 'atk' ? 'Vanguard takes the yard' : 'Ember holds the yard';
        copy.textContent = `Final score: Vanguard ${data.scoreAtk} — ${data.scoreDef} Ember. ${data.winner === 'atk' ? 'The yard is yours.' : 'Run it back.'}${statsLine}`;
        play.textContent = 'Play again';
      } else {
        title.textContent = text.title;
        copy.textContent = text.copy;
        play.textContent = text.action;
      }
      overlay.hidden = false;
      settingsPanel.hidden = !(mode === 'start' || mode === 'paused');
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
    setBuyColumn(index) {
      columnEls.forEach((col, i) => col.classList.toggle('selected', i === index));
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
    showScoreboard(show) {
      scoreboard.hidden = !show;
    },
    setScoreboard(rows, scoreAtkValue, scoreDefValue) {
      const key = `${scoreAtkValue}-${scoreDefValue}|${rows.map((r) => `${r.name}:${r.kills}/${r.deaths}/${r.damage}${r.mvp ? '*' : ''}`).join(',')}`;
      if (key === lastScoreboard) return;
      lastScoreboard = key;
      const teamBlock = (team, label) => {
        const members = rows.filter((r) => r.team === team);
        const cells = members.map((r) => `<div class="sb-row"><span class="sb-name">${r.mvp ? '★ ' : ''}${r.name}</span><span>${r.kills}</span><span>${r.deaths}</span><span>${r.damage}</span></div>`).join('');
        return `<div class="sb-team ${team}"><div class="sb-team-head">${label}</div><div class="sb-row sb-head"><span>PLAYER</span><span>K</span><span>D</span><span>DMG</span></div>${cells}</div>`;
      };
      scoreboard.innerHTML = `<div class="sb-title">VANGUARD ${scoreAtkValue} — ${scoreDefValue} EMBER</div><div class="sb-cols">${teamBlock('atk', 'VANGUARD')}${teamBlock('def', 'EMBER')}</div><div class="sb-foot">Hold TAB to keep open · ★ round MVP</div>`;
    },
    bindSettings(settings) {
      const mouse = document.getElementById('sens-mouse');
      const touch = document.getElementById('sens-touch');
      const mouseVal = document.getElementById('sens-mouse-val');
      const touchVal = document.getElementById('sens-touch-val');
      mouse.value = String(settings.mouse);
      touch.value = String(settings.touch);
      mouseVal.textContent = settings.mouse.toFixed(1);
      touchVal.textContent = settings.touch.toFixed(1);
      const save = () => localStorage.setItem('dustline.settings.v1', JSON.stringify(settings));
      mouse.addEventListener('input', () => {
        settings.mouse = Number(mouse.value);
        mouseVal.textContent = settings.mouse.toFixed(1);
        save();
      });
      touch.addEventListener('input', () => {
        settings.touch = Number(touch.value);
        touchVal.textContent = settings.touch.toFixed(1);
        save();
      });
    },
  };
}
