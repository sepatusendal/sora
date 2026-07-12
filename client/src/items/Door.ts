import Phaser from 'phaser'

/**
 * Auto sliding door.
 * - Closed: collidable static body + visible panel.
 * - Player within DOOR_OPEN_DISTANCE: panel slides open (tween) and collision is disabled.
 * - Purely client-side/cosmetic: movement in this codebase is client-authoritative,
 *   so every client resolves its own door collisions locally.
 */
export default class Door extends Phaser.Physics.Arcade.Sprite {
  readonly doorId: string
  private readonly orientation: 'h' | 'v'
  private isOpen = false
  private isLocked = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    orientation: 'h' | 'v'
  ) {
    super(scene, x, y, texture)
    this.doorId = id
    this.orientation = orientation
  }

  setOpenState(open: boolean) {
    if (open === this.isOpen) return
    this.isOpen = open

    const body = this.body as Phaser.Physics.Arcade.StaticBody
    if (body) body.enable = !open

    this.scene.tweens.killTweensOf(this)
    const target =
      this.orientation === 'h'
        ? { scaleX: open ? 0.08 : 1, alpha: open ? 0.25 : 1 }
        : { scaleY: open ? 0.08 : 1, alpha: open ? 0.25 : 1 }

    this.scene.tweens.add({
      targets: this,
      ...target,
      duration: 220,
      ease: 'Sine.easeInOut',
    })
  }

  get opened() {
    return this.isOpen
  }

  /**
   * Cosmetic-only: tints the door panel red-ish while a lockable zone is
   * locked, so players get a visual cue even before trying to walk through.
   * Does not affect collision — that's still driven by setOpenState/the
   * physics body, which Game.updateDoors keeps solid while locked.
   */
  setLockedState(locked: boolean) {
    if (locked === this.isLocked) return
    this.isLocked = locked

    this.scene.tweens.add({
      targets: this,
      duration: 220,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.progress
        const from = locked ? 0xffffff : 0xff6b6b
        const to = locked ? 0xff6b6b : 0xffffff
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(from),
          Phaser.Display.Color.ValueToColor(to),
          100,
          t * 100
        )
        this.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b))
      },
    })
  }
}

/**
 * Generates the pixel-art door textures at runtime so no extra assets are needed.
 * door_h: 32x32 panel, door_v: 32x64 panel.
 */
export function createDoorTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('door_h')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x4a3018, 1).fillRect(0, 0, 32, 32) // frame
    g.fillStyle(0x8a623a, 1).fillRect(2, 2, 28, 28) // panel
    g.fillStyle(0x6b4a2b, 1).fillRect(2, 14, 28, 3) // middle groove
    g.fillStyle(0xd9b26a, 1).fillRect(24, 13, 4, 5) // handle
    g.lineStyle(1, 0x2e1d0e, 1).strokeRect(0.5, 0.5, 31, 31)
    g.generateTexture('door_h', 32, 32)
    g.destroy()
  }

  if (!scene.textures.exists('door_v')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x4a3018, 1).fillRect(0, 0, 32, 64) // frame
    g.fillStyle(0x8a623a, 1).fillRect(2, 2, 28, 60) // panel
    g.fillStyle(0x6b4a2b, 1).fillRect(14, 2, 3, 60) // middle groove
    g.fillStyle(0xd9b26a, 1).fillRect(13, 28, 5, 8) // handle
    g.lineStyle(1, 0x2e1d0e, 1).strokeRect(0.5, 0.5, 31, 63)
    g.generateTexture('door_v', 32, 64)
    g.destroy()
  }
}
