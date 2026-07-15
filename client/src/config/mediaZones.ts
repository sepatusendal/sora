/**
 * Media zone definitions (pixel rects on the tilemap, 32px tiles).
 * The `id` values MUST match MEDIA_ZONES in server/rooms/Sora.ts.
 *
 * Zones were derived from the Ground layer collision map:
 * - lounge:    top-left room          (tiles x 6-18, y 6-10)
 * - studio:    bottom-left room, now the Meeting Room (tiles x 6-18, y 17-23)
 * - workspace: big right room, Workspace (formerly "Grand Hall") (tiles x 25-38, y 10-28)
 * - ceo:       top-right room, CEO Room  (tiles x 20-32, y 1-8)
 *           (verified against Ground layer collision: left wall @ x19, right wall @ x33 —
 *           interior floor is x20-32, so the zone starts one tile right of the wall, not on it)
 *
 * `lockable` marks zones that support the "lock room" feature — private
 * spaces (Meeting Room, CEO Room) can be locked from the inside; open social
 * spaces (Lounge, Workspace) cannot.
 *
 * map-annex.json is a byte-for-byte duplicate of map.json (same layout,
 * furniture, everything — see client/public/assets/map/map-annex.json),
 * loaded into the SAME persistent scene as the main map (Game.ts), placed
 * directly beside its right edge via ANNEX_WORLD_OFFSET (config/portals.ts).
 * So each annex zone below is just its main-map counterpart's rect shifted
 * by that offset, with an "annex"-prefixed id.
 */
export interface MediaZoneConfig {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  lockable: boolean
}

export const mediaZoneConfigs: MediaZoneConfig[] = [
  { id: 'lounge', label: 'Lounge', x: 192, y: 192, width: 416, height: 160, lockable: false },
  {
    id: 'studio',
    label: 'Meeting Room',
    x: 192,
    y: 544,
    width: 416,
    height: 224,
    lockable: true,
  },
  {
    id: 'workspace',
    label: 'Workspace',
    x: 800,
    y: 320,
    width: 448,
    height: 608,
    lockable: false,
  },
  { id: 'ceo', label: 'CEO Room', x: 640, y: 32, width: 416, height: 256, lockable: true },
  // --- annex (map-annex.json), same rects as above + ANNEX_WORLD_OFFSET (1280,0) ---
  {
    id: 'annexLounge',
    label: 'Annex Lounge',
    x: 1472,
    y: 192,
    width: 416,
    height: 160,
    lockable: false,
  },
  {
    id: 'annexStudio',
    label: 'Annex Meeting Room',
    x: 1472,
    y: 544,
    width: 416,
    height: 224,
    lockable: true,
  },
  {
    id: 'annexWorkspace',
    label: 'Annex Workspace',
    x: 2080,
    y: 320,
    width: 448,
    height: 608,
    lockable: false,
  },
  {
    id: 'annexCeo',
    label: 'Annex CEO Room',
    x: 1920,
    y: 32,
    width: 416,
    height: 256,
    lockable: true,
  },
]

/** Which zone (if any) a world position falls inside. Shared by Game.ts's
 * media-zone-under-player tracking and OtherPlayer.ts's locked-room call
 * isolation, so both agree on the same room boundaries. */
export function findZoneAt(x: number, y: number): MediaZoneConfig | undefined {
  return mediaZoneConfigs.find(
    (zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
  )
}
