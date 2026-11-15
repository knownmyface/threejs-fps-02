# DUSTLINE — a tactical FPS on three.js

A round-based tactical shooter in the style Counter-Strike made famous, built for the
make.fun threejs-fps-02 bounty. An original map, original names, original art — no
commercial game is copied.

## The game

A freight yard at dusk. Vanguard (you and two bots) attacks; Ember (three bots)
defends two bomb sites, A and B. First to 5 rounds takes the yard.

- **Rounds**: 12 s buy phase, 100 s round, 35 s bomb fuse. Win by planting and
  detonating the bomb, or by eliminating the other team. If the timer runs out with no
  plant, the defenders win.
- **Money and buy menu**: kills pay $300, a round win $2,000, a loss $1,400, a plant
  $300. Between rounds, press B: rifle ($1,500), SMG ($900), sniper ($2,800), frag
  grenade ($300), kevlar ($600). Survive the round and you keep your loadout.
- **Gunplay**: hitscan with head-shot multipliers, recoil and spread that punish
  firing on the move, sprint, crouch and jump, AABB collision with the map, tracers
  and muzzle flash.
- **Bots**: they patrol lanes, hold angles, react to what they see (line-of-sight
  rays, so they never see through walls) and to what they hear (gunfire draws them
  in), strafe while firing in bursts, and run to defuse a planted bomb.
- **HUD**: health, armour, money, ammunition, weapon, round timer, team score,
  minimap, kill feed, bomb status, hit markers and a damage-direction flash.
- **Sound**: every effect is synthesised with WebAudio — no audio files, no network.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

WASD move, mouse look, click fire, R reload, 1–4 weapons, G grenade, B buy menu,
E hold to plant the bomb, Ctrl crouch, Shift sprint, Space jump. Right-click scopes
the sniper.

## Shots

`shots.json` maps each screenshot to the deterministic setup that produced it
(`?shot=start|play|buy|end&seed=1`): the game renders the frame twice, freezes it
and sets `window.__shotReady`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output and writes
`dossier.json` with the kit's vendored `buildDossier`.

## License

MIT. three.js 0.187.0 is vendored under `game/vendor/three/` under its own license.
