# Handoff: Meta Sora — Annex map, portal, doors, spatial audio

## Status (2026-07-13)

Feature-complete for what was asked this session. `tsc` (client + server) and ESLint are both
0 errors, `npm run build` succeeds end-to-end. **Not personally verified live in a browser** —
this sandbox's Browser pane cannot run Phaser's game loop at all (`document.visibilityState`
reports `"hidden"`, so `requestAnimationFrame` never fires — confirmed via
`window.game.loop.running === false`). Everything below was iteratively tested by the user in
their own Chrome and reported back; several rounds of back-and-forth were needed to get a couple
of things right (see "Known gotchas" below before touching related code again).

If you're picking this up in a fresh session: **read this whole file before changing anything**,
then ask the user what's next rather than assuming.

## What's in the codebase now

### 1. Annex map — a second office, same room/session

- `client/public/assets/map/map-annex.json` + `.tmx` — a **byte-for-byte duplicate** of
  `map.json`/`.tmx` (same tilesets, same Ground layer, same furniture). Do not hand-edit tile
  data in this file expecting it to diverge from the main map without a reason — the user
  explicitly asked for "plek ketiplek" (identical) after an earlier custom-room-design attempt
  didn't look right to them.
- Both `map.json` and `map-annex.json` load into the **same persistent Phaser scene**
  (`client/src/scenes/Game.ts`), at the same time, for the whole session. There is no
  `scene.restart()` anywhere in the map-switching path anymore — an earlier version used it and
  it permanently broke keyboard input (see gotcha #1 below).
- Annex content is rendered/collided at a world offset: `ANNEX_WORLD_OFFSET = { x: 1280, y: 0 }`
  (`client/src/config/portals.ts`), i.e. directly beside the main map's right edge (main map is
  1280×960px / 40×30 tiles). This offset is baked into every annex zone/door/portal coordinate
  in the client configs and mirrored in `server/rooms/SkyOffice.ts`'s `ZONE_BOUNDS`.
  - **Why an offset at all, if it's one shared room?** The server checks lock/zone membership
    purely by comparing a player's raw x/y against a rectangle — it has no concept of "which
    map". If the two maps' local coordinates overlapped, the server could see a player in the
    annex and think they're standing in the main map's Lounge. The offset just keeps the two
    maps' coordinate ranges from ever overlapping.

### 2. Portal — walk up, press R, instant teleport

- `client/src/items/Portal.ts` (extends `Item`, same interact pattern as Computer/Whiteboard —
  shows a "Press R to travel to X" dialog on overlap, activates on keyR in `MyPlayer.ts`'s
  `ItemType.PORTAL` case).
- `client/src/config/portals.ts` defines exactly two portals: main office (tile 21,27 — bottom
  end of the Meeting↔Workspace corridor) ↔ annex (tile 6,12 — left end of the Lounge↔Meeting
  corridor, against the outer wall). These are **asymmetric locations by the user's explicit
  request** ("beda spot, jangan cuma mirror") — don't "simplify" them back to mirrored positions.
- Activation just calls `MyPlayer.setPosition`/`network.updatePlayer` — no scene reload, so
  keyboard/input state is untouched.

### 3. Doors — sized bigger than their true 1-tile gap, but the collider is NOT

- `client/src/items/Door.ts` generates `door_h` (32×64, "wood"), `door_v` (32×96, "wood"), and
  `door_glass_v` (32×96, glass/transparent — used for the Workspace door specifically) at
  runtime via `Phaser.GameObjects.Graphics`, no external art assets.
- **Critical detail, easy to break again:** for horizontal doors, only the BOTTOM 32×32 of the
  64px-tall sprite is the real wall gap; the top 32px is a purely decorative extension into the
  room (the user wanted the panel to visually "reach the wall" without the gap itself changing).
  `Game.ts`'s `addDoors()` explicitly resizes the physics body back down to the true 32×32 gap
  (`body.setSize(32,32).setOffset(0,32)`) for every `orientation: 'h'` door. If you ever resize
  the visual sprite again, you must keep this collider restriction in sync, or you'll reintroduce
  the "stuck entering rooms" / "name tag lags behind" bug (see gotcha #2).
- `client/src/config/doors.ts`: horizontal door y-position math is **anchored to the bottom edge**
  (the true gap), not centered — `y = trueGapY - 32, height = 64`. Getting this backwards
  (centering the taller sprite on the old center) visibly detaches the door from the wall.

### 4. Media zones — "Grand Hall" renamed to "Workspace"

- `client/src/config/mediaZones.ts` / `server/rooms/SkyOffice.ts`: ids `hall`/`annexHall` are now
  `workspace`/`annexWorkspace` everywhere (zone bounds, door-zone map, lock logic, UI copy in
  `Sidebar.tsx`). Don't reintroduce the old id — nothing reads it anymore.
- `findZoneAt(x, y)` (exported from `mediaZones.ts`) is the single shared helper for "which zone
  is this point in" — used by both `Game.ts` (for the local player's current-zone UI state) and
  `OtherPlayer.ts` (for spatial-audio/lock-isolation below). Keep using this instead of
  reimplementing the zone-rect lookup.

### 5. Spatial audio + locked-room privacy

- `OtherPlayer.ts`'s `updateCallVolume()` (called every frame from `preUpdate`) sets each
  connected peer's call volume based on distance (`MAX_HEARING_DISTANCE = 260`, linear falloff),
  via a new `WebRTC.setPeerVolume(userId, volume)` method (`client/src/web/WebRTC.ts`).
- **Why isolation is needed at all:** the WebRTC call itself connects based on a proximity hitbox
  that's 6×/4× the player sprite's size (set in `OtherPlayer.ts`'s `GameObjectFactory.register`
  block) — that box does not know about walls, so two players separated by a locked door's wall
  can still fall inside each other's connect-radius. `updateCallVolume()` checks
  `findZoneAt` for both players; if they're in different zones and either zone is currently
  locked (`store.getState().media.zones[...].locked`), volume is forced to 0 regardless of raw
  distance. Video is not hidden, only audio is muted — that was the literal ask.

### 6. Computer/Whiteboard ids are map-prefixed

- Since the annex duplicates the main map's `Computer`/`Whiteboard` object layers, ids are
  `main-0`, `main-1`, ..., `annex-0`, ... (both `Game.ts`'s `loadMapContent(map, offset,
  mapPrefix)` and `server/rooms/SkyOffice.ts`'s `onCreate`, which now creates 10 computers + 6
  whiteboards total, not 5 + 3). Without the prefix, two physically different desks in different
  maps would resolve to the same server-side Computer entry and incorrectly share screen-share
  state.

### 7. Misc smaller fixes this session

- `.eslintrc.js` had a malformed rule config (`no-namespace` severity) that silently made ESLint
  refuse to run at all — fixed.
- Client `tsc` (not `--noEmit`, the actual `npm run build` path) had ~40 pre-existing type errors
  (Phaser API nullable-return patterns, a peerjs `Peer.MediaConnection` namespace-vs-type issue
  after a peerjs version bump, a missing `x` in `PhaserGame.ts`'s gravity config, a react-redux 7
  vs `@types/react` 18 `Provider` JSX incompatibility) — all fixed, build is green now.
- `MediaPlayerPanel.tsx` shrunk (336px → 252px wide, smaller embeds) per request.
- `Bootstrap.ts` no longer auto-connects the webcam/mic based on a remembered browser permission
  grant (`WebRTC.checkPreviousPermission` removed) — camera/mic now only ever turn on from an
  explicit "Connect Webcam" click, per the user's privacy expectation.

## Known gotchas (read before touching related code)

1. **Never reintroduce `scene.restart()` for map switching.** It broke keyboard input
   permanently, because `registerKeys()` is called exactly once, from `LoginDialog.tsx`, not from
   `Game.create()`. The dual-tilemap-single-scene approach exists specifically to avoid ever
   needing a scene restart.
2. **Door visual size ≠ door collider size.** See section 3 above. If you resize a door sprite
   for looks, the collider needs an explicit, separate size that matches the TRUE wall gap, not
   the decorative sprite bounds — otherwise the player's separate name-tag/container physics body
   (it collides independently, floating ~30px above the character) can get blocked even after the
   main sprite has cleared the doorway, which looks like "stuck" + "name lags behind."
3. **This sandbox cannot visually test Meta Sora.** See "Status" above. Don't claim a visual/
   timing bug is fixed without the user confirming — for one seam/render bug this session, ~7
   turns were burned on sequential guesses before switching to "give the user a console script to
   run and report back real numbers," which converged fast. Prefer that pattern over guessing
   again for future rendering bugs.
4. **Follow literal visual-correction instructions exactly**, don't "clean up" into a symmetric
   version. E.g. "2 kotak ke atas, bukan ke samping, bagian bawah tetap di tembok" meant: grow the
   door sprite by exactly one tile, anchored so the ORIGINAL bottom edge doesn't move — not
   centered growth.

## Dev environment

- `npm run start` from repo root — Colyseus server on `:2567`.
- `npm run dev` from `client/` — Vite on `:5173`.
- If the server seems unresponsive after a restart, check for a zombie process holding `:2567`
  (`lsof -i :2567`) — `ts-node-dev`'s respawn occasionally races and leaves one behind.
