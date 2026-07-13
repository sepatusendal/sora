/**
 * Portal definitions — teleport points that jump the player between the
 * main office and the annex. Both tilemaps are loaded into the SAME
 * persistent Game scene at all times (see Game.ts's loadMapContent), so
 * "using" a portal is just an instant setPosition (see MyPlayer.ts's
 * ItemType.PORTAL case) — no scene reload, no tilemap swap, no reconnect.
 *
 * Interact pattern matches Computer/Whiteboard/VendingMachine: walk close
 * enough for the dialog ("Press R to travel to ...") to appear, then press
 * R. Not an auto-trigger-on-touch — accidentally brushing past a portal
 * shouldn't yank you across the map.
 *
 * map-annex.json is a byte-for-byte duplicate of map.json (see
 * mediaZones.ts), loaded at ANNEX_WORLD_OFFSET — directly beside the main
 * office's right edge.
 *
 * The two portals sit at DIFFERENT corridor ends (not mirrored spots):
 *  - main office: bottom end of the vertical Meeting-Room<->Workspace
 *    corridor (cols 20-23, floor stops at row27 / wall caps at row28)
 *  - annex: left end of the horizontal Lounge<->Meeting corridor (row12,
 *    right against the building's outer wall at col5)
 */
export interface PortalConfig {
  id: string
  x: number
  y: number
  targetX: number
  targetY: number
  label: string
}

// main map is 40x30 tiles (1280x960px) — annex starts right past its right
// edge, y-aligned, so it reads as an extension rather than a separate place
export const ANNEX_WORLD_OFFSET = { x: 1280, y: 0 }

// main office: tile (21,27) — bottom end of the Meeting<->Workspace corridor,
// last walkable row before the wall cap at row28
const MAIN_PORTAL_TILE = { x: 21, y: 27 }

// annex: tile (6,12) — left end of the Lounge<->Meeting corridor, right
// against the outer wall at col5
const ANNEX_PORTAL_TILE = { x: 6, y: 12 }

export const portalConfigs: PortalConfig[] = [
  {
    id: 'to-annex',
    x: MAIN_PORTAL_TILE.x * 32,
    y: MAIN_PORTAL_TILE.y * 32,
    targetX: ANNEX_PORTAL_TILE.x * 32 + ANNEX_WORLD_OFFSET.x,
    targetY: ANNEX_PORTAL_TILE.y * 32 + ANNEX_WORLD_OFFSET.y,
    label: 'Annex',
  },
  {
    id: 'to-main',
    x: ANNEX_PORTAL_TILE.x * 32 + ANNEX_WORLD_OFFSET.x,
    y: ANNEX_PORTAL_TILE.y * 32 + ANNEX_WORLD_OFFSET.y,
    targetX: MAIN_PORTAL_TILE.x * 32,
    targetY: MAIN_PORTAL_TILE.y * 32,
    label: 'Main Office',
  },
]
