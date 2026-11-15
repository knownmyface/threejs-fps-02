// Touch controls for phones: a floating virtual joystick, drag-to-look, and
// on-screen action buttons. It drives the SAME input state the keyboard and
// mouse use (input.state.keys / firing / scoped / lookX / lookY / touchMove),
// so the simulation never knows or cares which device is playing. The UI is
// built only on touch devices; on desktop it stays hidden and the pointer-lock
// flow is untouched. Buttons inject the same edge presses (KeyG/KeyH/KeyB)
// the keyboard uses, so buy, grenade and smoke behave identically.
const STICK_RADIUS = 52;

export function createTouch(input, actions) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const active = coarse || touchCapable;
  input.state.touchMove = { x: 0, y: 0 };

  const ui = document.createElement('div');
  ui.id = 'touch-ui';
  ui.hidden = !active;
  ui.innerHTML = `
    <div id="touch-stick"><div id="touch-knob"></div></div>
    <button type="button" class="touch-btn" id="touch-plant">HOLD TO PLANT</button>
    <button type="button" class="touch-btn" id="touch-score">SCORE</button>
    <div id="touch-btns">
      <button type="button" class="touch-btn" id="touch-buy">BUY</button>
      <button type="button" class="touch-btn" id="touch-crouch">CROUCH</button>
      <button type="button" class="touch-btn" id="touch-ads">ADS</button>
      <button type="button" class="touch-btn" id="touch-swap">SWAP</button>
      <button type="button" class="touch-btn" id="touch-reload">RLD</button>
      <button type="button" class="touch-btn" id="touch-frag">FRAG</button>
      <button type="button" class="touch-btn" id="touch-smoke">SMOKE</button>
      <button type="button" class="touch-btn" id="touch-jump">JUMP</button>
      <button type="button" class="touch-btn" id="touch-fire">FIRE</button>
    </div>`;
  document.body.appendChild(ui);

  const stick = ui.querySelector('#touch-stick');
  const knob = ui.querySelector('#touch-knob');
  const plantButton = ui.querySelector('#touch-plant');
  const buttons = {};
  for (const id of ['buy', 'crouch', 'ads', 'swap', 'reload', 'frag', 'smoke', 'jump', 'fire', 'score']) {
    buttons[id] = ui.querySelector(`#touch-${id}`);
  }

  let stickId = null;
  let stickBase = { x: 0, y: 0 };
  let lookId = null;
  let lookLast = { x: 0, y: 0 };
  let crouched = false;

  function isMenuTarget(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('button, #buy-menu, .overlay, #touch-btns');
  }

  function stickVector(dx, dy) {
    const length = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(length, STICK_RADIUS);
    const nx = (dx / length) * clamped;
    const ny = (dy / length) * clamped;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
    input.state.touchMove.x = nx / STICK_RADIUS;
    input.state.touchMove.y = ny / STICK_RADIUS;
  }

  function endStick() {
    stickId = null;
    stick.classList.remove('on');
    knob.style.transform = '';
    input.state.touchMove.x = 0;
    input.state.touchMove.y = 0;
  }

  function onTouchStart(event) {
    if (!active) return;
    for (const touch of event.changedTouches) {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (isMenuTarget(target)) continue;
      if (touch.clientX < window.innerWidth * 0.45 && touch.clientY > window.innerHeight * 0.4 && stickId === null) {
        stickId = touch.identifier;
        stickBase = { x: touch.clientX, y: touch.clientY };
        stick.style.left = `${touch.clientX}px`;
        stick.style.top = `${touch.clientY}px`;
        stick.classList.add('on');
        if (event.cancelable) event.preventDefault();
      } else if (lookId === null) {
        lookId = touch.identifier;
        lookLast = { x: touch.clientX, y: touch.clientY };
        if (event.cancelable) event.preventDefault();
      }
    }
  }

  function onTouchMove(event) {
    if (!active) return;
    for (const touch of event.changedTouches) {
      if (touch.identifier === stickId) {
        stickVector(touch.clientX - stickBase.x, touch.clientY - stickBase.y);
        if (event.cancelable) event.preventDefault();
      } else if (touch.identifier === lookId) {
        input.state.touchLookX += touch.clientX - lookLast.x;
        input.state.touchLookY += touch.clientY - lookLast.y;
        lookLast = { x: touch.clientX, y: touch.clientY };
        if (event.cancelable) event.preventDefault();
      }
    }
  }

  function onTouchEnd(event) {
    if (!active) return;
    for (const touch of event.changedTouches) {
      if (touch.identifier === stickId) endStick();
      if (touch.identifier === lookId) lookId = null;
    }
  }

  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);

  function holdButton(button, down, up) {
    button.addEventListener('touchstart', (event) => {
      event.preventDefault();
      event.stopPropagation();
      down();
    }, { passive: false });
    const release = (event) => {
      event.preventDefault();
      up();
    };
    button.addEventListener('touchend', release);
    button.addEventListener('touchcancel', release);
  }

  function tapButton(button, action) {
    button.addEventListener('touchstart', (event) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    }, { passive: false });
  }

  holdButton(buttons.fire,
    () => { input.pressFire(); },
    () => { input.releaseFire(); });
  holdButton(buttons.jump,
    () => { input.state.keys.add('Space'); },
    () => { input.state.keys.delete('Space'); });
  holdButton(buttons.reload,
    () => { input.state.keys.add('KeyR'); },
    () => { input.state.keys.delete('KeyR'); });
  tapButton(buttons.crouch, () => {
    crouched = !crouched;
    buttons.crouch.classList.toggle('on', crouched);
    if (crouched) input.state.keys.add('KeyC');
    else input.state.keys.delete('KeyC');
  });
  tapButton(buttons.ads, () => {
    input.state.scoped = !input.state.scoped;
    buttons.ads.classList.toggle('on', input.state.scoped);
  });
  tapButton(buttons.swap, () => actions.cycleWeapon());
  tapButton(buttons.score, () => actions.toggleScoreboard());
  tapButton(buttons.frag, () => input.press('KeyG'));
  tapButton(buttons.smoke, () => input.press('KeyH'));
  tapButton(buttons.buy, () => input.press('KeyB'));
  holdButton(plantButton,
    () => { input.state.keys.add('KeyE'); },
    () => { input.state.keys.delete('KeyE'); });

  const buyMenu = document.getElementById('buy-menu');
  const overlay = document.getElementById('overlay');
  function syncMenus() {
    ui.classList.toggle('menus-open', !buyMenu.hidden || !overlay.hidden);
  }
  new MutationObserver(syncMenus).observe(buyMenu, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(syncMenus).observe(overlay, { attributes: true, attributeFilter: ['hidden'] });
  syncMenus();

  return {
    active,
    setPlant(available) {
      plantButton.hidden = !available;
    },
  };
}
