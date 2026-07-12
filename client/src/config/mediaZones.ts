/**
 * Media zone definitions (pixel rects on the tilemap, 32px tiles).
 * The `id` values MUST match MEDIA_ZONES in server/rooms/SkyOffice.ts.
 *
 * Zones were derived from the Ground layer collision map:
 * - lounge: top-left room          (tiles x 6-18, y 6-10)
 * - studio: bottom-left room, now the Meeting Room (tiles x 6-18, y 17-23)
 * - hall:   big right room, Grand Hall (tiles x 25-38, y 10-28)
 * - ceo:    top-right room, CEO Room  (tiles x 20-32, y 1-8)
 *           (verified against Ground layer collision: left wall @ x19, right wall @ x33 —
 *           interior floor is x20-32, so the zone starts one tile right of the wall, not on it)
 *
 * `lockable` marks zones that support the "lock room" feature — private
 * spaces (Meeting Room, CEO Room) can be locked from the inside; open social
 * spaces (Lounge, Grand Hall) cannot.
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
  { id: 'hall', label: 'Grand Hall', x: 800, y: 320, width: 448, height: 608, lockable: false },
  { id: 'ceo', label: 'CEO Room', x: 640, y: 32, width: 416, height: 256, lockable: true },
]
