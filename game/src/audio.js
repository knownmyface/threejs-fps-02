// Procedural sound: every effect is synthesised with WebAudio, so the game ships no
// audio files and makes no network request. The context is created on the first user
// gesture and every call before that is a silent no-op.
export function createAudio() {
  let context = null;
  let master = null;
  let noiseBuffer = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.4;
      master.connect(context.destination);
      const length = Math.floor(context.sampleRate * 0.5);
      noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    } catch {
      return false;
    }
    return true;
  }

  function noise(duration, filterFrequency, gainValue, when = 0) {
    if (!ensure()) return;
    const time = context.currentTime + when;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start(time, Math.random() * 0.3, duration);
    source.stop(time + duration + 0.02);
  }

  function tone(frequency, duration, type, gainValue, slideTo = 0, when = 0) {
    if (!ensure()) return;
    const time = context.currentTime + when;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (slideTo > 0) oscillator.frequency.exponentialRampToValueAtTime(slideTo, time + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    shoot(far = false) {
      noise(0.12, far ? 900 : 2400, far ? 0.25 : 0.6);
      tone(far ? 120 : 170, 0.09, 'square', far ? 0.1 : 0.22, 60);
    },
    reload() {
      tone(1400, 0.05, 'square', 0.12);
      tone(900, 0.05, 'square', 0.12, 0, 0.18);
      tone(1600, 0.05, 'square', 0.14, 0, 0.55);
    },
    dryFire() {
      tone(1100, 0.04, 'square', 0.1);
    },
    hit(kill) {
      tone(2100, 0.06, 'sine', 0.25);
      if (kill) tone(2600, 0.12, 'sine', 0.25, 0, 0.07);
    },
    hurt() {
      noise(0.18, 500, 0.35);
      tone(90, 0.2, 'sine', 0.3, 55);
    },
    explosion() {
      noise(0.9, 320, 0.9);
      tone(70, 0.8, 'sine', 0.7, 30);
    },
    plantBeep() {
      tone(1200, 0.09, 'square', 0.2);
    },
    defuseBeep() {
      tone(900, 0.09, 'square', 0.18);
      tone(900, 0.09, 'square', 0.18, 0, 0.15);
    },
    roundWin() {
      tone(523, 0.14, 'triangle', 0.25);
      tone(659, 0.14, 'triangle', 0.25, 0, 0.14);
      tone(784, 0.22, 'triangle', 0.28, 0, 0.28);
    },
    roundLose() {
      tone(392, 0.16, 'triangle', 0.22);
      tone(311, 0.26, 'triangle', 0.22, 0, 0.16);
    },
    buy() {
      tone(1800, 0.05, 'sine', 0.2);
      tone(2400, 0.07, 'sine', 0.2, 0, 0.06);
    },
    click() {
      tone(1500, 0.04, 'square', 0.1);
    },
    grenadePin() {
      tone(2000, 0.04, 'square', 0.12);
    },
    swing() {
      noise(0.14, 2600, 0.22);
      tone(700, 0.12, 'sine', 0.1, 180);
    },
    flashPop() {
      noise(0.25, 3200, 0.5);
      tone(3200, 0.1, 'square', 0.16, 900);
    },
  };
}
