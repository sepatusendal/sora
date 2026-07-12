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
 *  - hall-door    : V-gap col 24 y12-15 → center (784, 432) — entrance to Grand Hall,
 *                   right next to the wall tile at (768,480) and the Grand Hall
 *                   media zone's left edge (x:800, see mediaZones.ts)
 *
 * orientation:
 *   'h' = door in a horizontal (east-west running) wall → sprite shrinks on X axis when open
 *   'v' = door in a vertical (north-south running) wall → sprite shrinks on Y axis when open
 */
export interface DoorConfig {
  id: string
  x: number   // top-left pixel x
  y: number   // top-left pixel y
  width: number
  height: number
  orientation: 'h' | 'v'
}

export const doorConfigs: DoorConfig[] = [
  // lounge top-left room — horizontal wall gap at tile (12,11), center (400,368)
  { id: 'lounge-door', x: 384, y: 352, width: 32, height: 32, orientation: 'h' },
  // Meeting Room, bottom of same block — horizontal wall gap at tile (12,16), center (400,528)
  { id: 'studio-door', x: 384, y: 512, width: 32, height: 32, orientation: 'h' },
  // CEO Room — horizontal wall gap at tile (21,9), center (688,304)
  { id: 'ceo-door', x: 672, y: 288, width: 32, height: 32, orientation: 'h' },
  // entrance to grand hall — vertical wall gap at col 24, rows 12-15, center (784,432)
  { id: 'hall-door', x: 768, y: 384, width: 32, height: 96, orientation: 'v' },
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
  'hall-door': 'hall',
}
