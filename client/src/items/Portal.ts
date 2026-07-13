import Phaser from 'phaser'
import { ItemType } from '../../../types/Items'
import Item from './Item'

/**
 * Teleport point: stand near it and press R (same interact pattern as
 * Computer/Whiteboard/VendingMachine) to jump to targetX/targetY. Both maps
 * live in the same persistent scene, so this is just an instant
 * setPosition — no scene reload, no tilemap swap.
 *
 * Constructed via a Phaser static group's classType (see Game.ts's
 * addPortals), which only ever calls (scene, x, y, texture, frame) — the
 * portal-specific fields are wired up right after via setPortalData().
 */
export default class Portal extends Item {
  portalId = ''
  targetX = 0
  targetY = 0
  label = ''

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)
    this.itemType = ItemType.PORTAL

    this.scene.tweens.add({
      targets: this,
      scale: { from: 0.85, to: 1.1 },
      alpha: { from: 0.75, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  setPortalData(id: string, targetX: number, targetY: number, label: string) {
    this.portalId = id
    this.targetX = targetX
    this.targetY = targetY
    this.label = label
  }

  onOverlapDialog() {
    this.setDialogBox(`Press R to travel to ${this.label}`)
  }
}

/** Generates a swirly placeholder portal texture at runtime; no extra asset needed. */
export function createPortalTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('portal')) return
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  g.fillStyle(0x2b1a4a, 0.9).fillCircle(24, 24, 22)
  g.fillStyle(0x6f42c1, 0.95).fillCircle(24, 24, 16)
  g.fillStyle(0xb388ff, 1).fillCircle(24, 24, 9)
  g.fillStyle(0xece3ff, 1).fillCircle(24, 24, 3)
  g.lineStyle(2, 0xd8c6ff, 0.85).strokeCircle(24, 24, 22)
  g.generateTexture('portal', 48, 48)
  g.destroy()
}
