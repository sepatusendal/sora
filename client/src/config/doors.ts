/**
 * Door definitions (pixel rects on the tilemap, 32px tiles).
 *
 * Positions verified against the Ground layer collision map (40×30 tiles, 32px each).
 * x/y values are the TOP-LEFT corner of the door sprite in world pixels;
 * the door center (used for proximity detection) is x + width/2, y + height/2.
 *
 * Confirmed gap tiles → pixel centers:
 *  - lounge-door  : H-gap tile(12, 11) → center (400, 368)  — top wall of top-left room
 *  - studio-door  : H-gap tile(12, 16) → center (400, 528)  — bottom wall of Meeting Room
 *  - ceo-door     : H-gap tile(21,  9) → center (688, 304)  — entrance to the CEO Room
 *  - workspace-door: V-gap col 24 y12-15 → center (784, 432) — entrance to the
 *                   Workspace, right next to the wall tile at (768,480) and the
 *                   Workspace media zone's left edge (x:800, see mediaZones.ts)
 *
 * orientation:
 *   'h' = door in a horizontal (east-west running) wall → sprite shrinks on X axis when open
 *   'v' = door in a vertical (north-south running) wall → sprite shrinks on Y axis when open
 *
 * map-annex.json is a byte-for-byte duplicate of map.json (see mediaZones.ts),
 * so each annex door below is just its main-map counterpart's rect shifted
 * by ANNEX_WORLD_OFFSET (config/portals.ts). Both maps are loaded into the
 * same persistent scene (Game.ts), so every door in this list is always
 * active — no per-map filtering.
 */
export interface DoorConfig {
  id: string
  x: number   // top-left pixel x
  y: number   // top-left pixel y
  width: number
  height: number
  orientation: 'h' | 'v'
  style?: 'glass' // defaults to the plain wood panel
}

export const doorConfigs: DoorConfig[] = [
  // Horizontal doors are 2 tiles tall (32x64): the BOTTOM tile is the real
  // wall-gap tile — its y is unchanged from the exact-fit position (e.g.
  // lounge-door's bottom edge sits at 352+32=384, same as when it was
  // 32x32) — the extra tile is added purely ABOVE it (y shifted up by one
  // full tile, 32px), not centered/split across both sides. That keeps the
  // door flush with the actual wall on the bottom edge while still reading
  // as a bigger doorway, instead of floating detached from the wall like
  // the earlier centered version did.

  // lounge top-left room — horizontal wall gap at tile (12,11), bottom edge (384,384)
  { id: 'lounge-door', x: 384, y: 320, width: 32, height: 64, orientation: 'h' },
  // Meeting Room, bottom of same block — horizontal wall gap at tile (12,16), bottom edge (384,544)
  { id: 'studio-door', x: 384, y: 480, width: 32, height: 64, orientation: 'h' },
  // CEO Room — horizontal wall gap at tile (21,9), bottom edge (672,320)
  { id: 'ceo-door', x: 672, y: 256, width: 32, height: 64, orientation: 'h' },
  // entrance to the Workspace — vertical wall gap at col 24, rows 12-15, center (784,432)
  { id: 'workspace-door', x: 768, y: 384, width: 32, height: 96, orientation: 'v', style: 'glass' },
  // --- annex doors (map-annex.json), same as above + ANNEX_WORLD_OFFSET (1280,0) ---
  { id: 'annexLounge-door', x: 1664, y: 320, width: 32, height: 64, orientation: 'h' },
  { id: 'annexStudio-door', x: 1664, y: 480, width: 32, height: 64, orientation: 'h' },
  { id: 'annexCeo-door', x: 1952, y: 256, width: 32, height: 64, orientation: 'h' },
  {
    id: 'annexWorkspace-door',
    x: 2048,
    y: 384,
    width: 32,
    height: 96,
    orientation: 'v',
    style: 'glass',
  },
]

// distance (px) from door CENTER at which the door slides open / closed
export const DOOR_OPEN_DISTANCE = 56
export const DOOR_CLOSE_DISTANCE = 80

// which media/lock zone each door leads into — lets the renderer keep a
// locked room's door shut regardless of player proximity
export const DOOR_ZONE_MAP: { [doorId: string]: string } = {
  'lounge-door': 'lounge',
  'studio-door': 'studio',
  'ceo-door': 'ceo',
  'workspace-door': 'workspace',
  'annexLounge-door': 'annexLounge',
  'annexStudio-door': 'annexStudio',
  'annexCeo-door': 'annexCeo',
  'annexWorkspace-door': 'annexWorkspace',
}
