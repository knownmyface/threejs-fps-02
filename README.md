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
  grenade ($300), smoke grenade ($400), kevlar ($600). Survive the round and you keep
  your loadout.
- **Gunplay**: hitscan with head-shot multipliers, recoil and spread that punish
  firing on the move, recoil bloom that grows while you hold the trigger, extra spread
  in the air, aim-down-sights (right mouse: tighter spread, narrower FOV, slower
  move), sprint, crouch and jump, AABB collision with the map, tracers and muzzle
  flash. A raised steel walkway runs the west wall — climb the stairs for high ground
  over site A; it is railed, so the only way down is the stairs again.
- **Grenades**: frag (G) and smoke (H). Smoke canisters arc, bounce and deploy a
  12-second cloud that blocks line of sight — bots on either side genuinely lose
  each other, and so do you.
- **Bots**: they patrol lanes, hold angles, react to what they see (line-of-sight
  rays, so they never see through walls or smoke) and to what they hear (gunfire draws
  them in), strafe while firing in bursts, lob a grenade at a distant target they can
  see, rotate to the other site after two fruitless loops, and run to defuse a planted
  bomb. Hollow, one of the defenders, spawns at the walkway stairs and holds the high
  ground. Getting hit flashes a bot's torso so you can see your hits land.
- **HUD**: health, armour, money, ammunition, weapon, round timer, team score,
  minimap, kill feed, bomb status, hit markers and a damage-direction flash, plus a
  live roster showing who on each team is still standing. Round and match end screens
  report accuracy, kills and headshots.
- **Sound**: every effect is synthesised with WebAudio — no audio files, no network.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

WASD move, mouse look, click fire, R reload, 1–4 weapons, G grenade, H smoke
grenade, B buy menu, E hold to plant the bomb, Ctrl crouch, Shift sprint, Space
jump. Right-click aims down sights (the sniper scopes instead).

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
