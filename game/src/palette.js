// The look plan, in one place. Six base values carry the dusk yard; teal and ember are
export const PALETTE = {
  canvas: '#191411',
  surface: '#2b241e',
  hairline: '#40362c',
  ink: '#f0e8d8',
  muted: '#a89a86',
  accent: '#e07830',
  sand: '#c8a06a',
  teal: '#2fae8f',
  ember: '#e2543e',
};
export function shade(name) {
  return PALETTE[name];
}