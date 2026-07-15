import Phaser from 'phaser'
import Item from './Item'
import { ItemType } from '../../../types/Items'
import { NPCConfig, NPCTopic, PANTRY_SPOT } from '../config/npcs'
import type MyPlayer from '../characters/MyPlayer'

const WALK_SPEED = 45
const ARRIVE_DISTANCE = 4
const MENU_TIMEOUT_MS = 8000
const OB_PANTRY_WAIT_MS = 3000
const OB_DRINKS = ['kopi item', 'kopi susu', 'teh anget']
const DEFAULT_PATROL_PAUSE_MS = 1500

// short local hops rather than long treks across the whole map — much less
// likely to need crossing a wall/door in a straight line, and reads as
// "puttering around the same spot" instead of "marching somewhere"
const WANDER_MIN_RADIUS = 50
const WANDER_MAX_RADIUS = 160
// mostly idle: stand around for a while, take a short walk, stand around
// again — a real office NPC doesn't pace nonstop
const IDLE_MIN_MS = 4000
const IDLE_MAX_MS = 9000

// if the sprite hasn't actually covered ground in this long despite trying
// to walk, treat the target as unreachable (blocked by a wall/object) and
// stop instead of endlessly pushing into it
const STUCK_CHECK_INTERVAL_MS = 500
const STUCK_MIN_MOVE_PX = 6

// typewriter dialogue — slow enough to actually read, not a instant dump
const TYPE_CHAR_DELAY_MS = 45
const TYPE_HOLD_MS = 2200

const GREET_RADIUS = 90
// hysteresis gap so a lingering player doesn't get re-greeted just for
// standing a couple pixels back and forth across one threshold
const GREET_RESET_RADIUS = 150
const GREET_COOLDOWN_MS = 15000

type Direction = 'up' | 'down' | 'left' | 'right'
type BusyStage = 'idle' | 'toPantry' | 'atPantry' | 'returning'
type PatrolState = 'toA' | 'waitA' | 'toB' | 'waitB'

function directionFromVelocity(vx: number, vy: number, fallback: Direction): Direction {
  if (vx === 0 && vy === 0) return fallback
  if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? 'right' : 'left'
  return vy > 0 ? 'down' : 'up'
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Roaming decorative NPC (OB/Satpam/Receptionist). Two movement modes:
 * - default: mostly stands around, occasionally takes a short walk nearby
 *   within its configured bounds (see WANDER_MIN/MAX_RADIUS + IDLE_MIN/MAX_MS)
 * - patrol (Satpam): continuous back-and-forth between two fixed points
 *   (see updatePatrol) — a corridor guard doesn't idle around, it paces
 *
 * Every NPC greets nearby players automatically, and offers a jobdesk-
 * flavored conversation menu on interact (press R, then 1/2/3 to pick a
 * topic). Dialogue types out character-by-character rather than appearing
 * instantly, and the NPC stands completely still for the whole exchange —
 * the bubble is drawn once at the NPC's (now frozen) position, so it never
 * drifts away from a sprite that kept walking. OB's "kopi/teh" topic
 * triggers a scripted walk to the Lounge (the closest thing to a "pantry"
 * — no dedicated kitchen art exists), a wait, then a walk back to wherever
 * the requesting player was standing.
 *
 * Client-side only, not synced through Colyseus — every connected client
 * simulates its own copy, so NPC positions may drift slightly between
 * clients. That's fine since NPCs are decorative and not interacted with
 * cross-player.
 *
 * Follows the same "classType group + finish wiring after construction"
 * pattern as Portal (see Portal.ts / Game.ts's addPortals): the group's
 * classType constructor only gets (scene, x, y, texture, frame), so
 * NPC-specific config is applied via setNpcData() right after.
 */
export default class NPC extends Item {
  npcId = ''
  role = ''
  private greetings: string[] = []
  private topics: NPCTopic[] = []
  private coffeeReturnLines: string[] = []
  private bounds = { x: 0, y: 0, width: 0, height: 0 }
  private patrol?: { a: { x: number; y: number }; b: { x: number; y: number }; pauseMs: number }
  private patrolState: PatrolState = 'toB'
  private patrolWaitUntil = 0
  private isOB = false
  private facing: Direction = 'down'
  private targetX = 0
  private targetY = 0
  private nextDecisionAt = 0
  private busyUntil = 0
  private busyStage: BusyStage = 'idle'
  private talking = false
  private menuOpen = false
  private menuTimeoutEvent?: Phaser.Time.TimerEvent
  private returnSpot = { x: 0, y: 0 }
  private lastGreetAt = -Infinity
  private hasGreetedThisPass = false

  // stuck-against-a-wall detection (see moveTowardsTarget)
  private lastStuckCheckAt = -Infinity
  private lastStuckX = 0
  private lastStuckY = 0

  // shared floating text bubble — both the topic menu and spoken dialogue
  // go through drawBubble() so they're positioned identically (no jump
  // between the two) and always reflect wherever the NPC is CURRENTLY
  // standing, not some stale position from a previous frame
  private bubbleContainer?: Phaser.GameObjects.Container
  private typeTimer?: Phaser.Time.TimerEvent
  private clearSayTimer?: Phaser.Time.TimerEvent

  onOverlapDialog() {
    this.setDialogBox(`Tekan R untuk ngobrol sama ${this.role}`)
  }

  setNpcData(config: NPCConfig) {
    this.itemType = ItemType.NPC
    this.npcId = config.id
    this.role = config.role
    this.greetings = config.greetings
    this.topics = config.topics
    this.coffeeReturnLines = config.coffeeReturnLines ?? []
    this.bounds = config.bounds
    this.isOB = config.id === 'ob'
    this.targetX = this.x
    this.targetY = this.y
    if (config.patrol) {
      this.patrol = { pauseMs: DEFAULT_PATROL_PAUSE_MS, ...config.patrol }
      this.patrolState = 'toB'
      this.setWanderTarget(config.patrol.b.x, config.patrol.b.y)
    }
    this.play(`${this.texture.key}_idle_down`, true)
  }

  /** Called from MyPlayer's keyR handler when a player interacts with this NPC. */
  talk() {
    if (this.talking) return

    if (this.busyStage !== 'idle') {
      this.say('Bentar ya, lagi jalan nih!')
      return
    }

    if (this.menuOpen) {
      this.closeMenu()
      return
    }

    this.openMenu()
  }

  /** Called from Game.ts when the player presses 1/2/3 while this NPC's menu is open. */
  chooseTopic(index: number, player: MyPlayer) {
    if (!this.menuOpen) return
    const topic = this.topics[index]
    if (!topic) return
    this.closeMenu()

    if (topic.action === 'coffee-run' && this.busyStage === 'idle') {
      this.returnSpot = { x: player.x, y: player.y }
      const ack = pickRandom(topic.lines)
      this.say(ack, () => {
        this.busyStage = 'toPantry'
        this.setWanderTarget(PANTRY_SPOT.x, PANTRY_SPOT.y)
      })
      return
    }

    this.say(pickRandom(topic.lines))
  }

  private openMenu() {
    this.menuOpen = true
    this.setVelocity(0, 0)
    const menuText = this.topics.map((t, i) => `${i + 1}. ${t.label}`).join('\n')
    this.drawBubble(menuText)
    this.menuTimeoutEvent = this.scene.time.delayedCall(MENU_TIMEOUT_MS, () => this.closeMenu())
  }

  private closeMenu() {
    if (!this.menuOpen) return
    this.menuOpen = false
    this.menuTimeoutEvent?.remove()
    this.clearBubble()
  }

  /**
   * Draws (and returns) the text object for a floating bubble above the
   * sprite, sized up front for the FULL string so it never resizes
   * mid-reveal — only the visible substring grows. Shared by the topic
   * menu (shown instantly) and say() (revealed via typewriter).
   */
  private drawBubble(text: string): Phaser.GameObjects.Text {
    this.clearBubble()

    const innerText = this.scene.add
      .text(0, 0, text, { wordWrap: { width: 180, useAdvancedWrap: true } })
      .setFontFamily('Arial')
      .setFontSize(12)
      .setColor('#000000')

    const boxWidth = innerText.width + 10
    const boxHeight = innerText.height + 6
    const boxX = this.x - boxWidth * 0.5
    const boxY = this.y - this.height * 0.5 - boxHeight - 6

    const bg = this.scene.add
      .graphics()
      .fillStyle(0xffffff, 1)
      .fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 4)
      .lineStyle(1.5, 0x000000, 1)
      .strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 4)

    innerText.setPosition(boxX + 5, boxY + 3)

    this.bubbleContainer = this.scene.add.container(0, 0, [bg, innerText]).setDepth(10000)
    return innerText
  }

  private clearBubble() {
    this.typeTimer?.remove()
    this.clearSayTimer?.remove()
    this.bubbleContainer?.destroy(true)
    this.bubbleContainer = undefined
  }

  /**
   * Types `text` out character-by-character in a bubble above the sprite.
   * The NPC is frozen (velocity zeroed, update()'s movement code skipped
   * via the `talking` flag) for the whole exchange, so the bubble — drawn
   * once at the position the NPC stops at — never has to chase a moving
   * sprite.
   */
  private say(text: string, onDone?: () => void) {
    this.talking = true
    this.setVelocity(0, 0)
    const innerText = this.drawBubble(text)
    innerText.setText('')

    let shown = 0
    this.typeTimer = this.scene.time.addEvent({
      delay: TYPE_CHAR_DELAY_MS,
      repeat: Math.max(0, text.length - 1),
      callback: () => {
        shown++
        innerText.setText(text.substring(0, shown))
      },
    })

    const totalMs = TYPE_CHAR_DELAY_MS * text.length + TYPE_HOLD_MS
    this.clearSayTimer = this.scene.time.delayedCall(totalMs, () => {
      this.clearBubble()
      this.talking = false
      onDone?.()
    })
  }

  private setWanderTarget(x: number, y: number) {
    this.targetX = x
    this.targetY = y
    // a fresh target means "stuck" checks should start over, not compare
    // against a checkpoint recorded while chasing the PREVIOUS target
    this.lastStuckCheckAt = -Infinity
  }

  private pickNewWanderTarget() {
    const angle = Math.random() * Math.PI * 2
    const radius = WANDER_MIN_RADIUS + Math.random() * (WANDER_MAX_RADIUS - WANDER_MIN_RADIUS)
    const rawX = this.x + Math.cos(angle) * radius
    const rawY = this.y + Math.sin(angle) * radius
    const x = Phaser.Math.Clamp(rawX, this.bounds.x, this.bounds.x + this.bounds.width)
    const y = Phaser.Math.Clamp(rawY, this.bounds.y, this.bounds.y + this.bounds.height)
    this.setWanderTarget(x, y)
  }

  /**
   * Continuous back-and-forth patrol between patrol.a and patrol.b (e.g.
   * Satpam pacing a corridor), replacing the default idle/wander behavior
   * entirely for NPCs configured with one.
   */
  private updatePatrol(time: number) {
    const patrol = this.patrol
    if (!patrol) return

    if (this.patrolState === 'waitA' || this.patrolState === 'waitB') {
      if (time < this.patrolWaitUntil) {
        this.setVelocity(0, 0)
        this.play(`${this.texture.key}_idle_${this.facing}`, true)
        return
      }
      this.patrolState = this.patrolState === 'waitA' ? 'toB' : 'toA'
      const next = this.patrolState === 'toA' ? patrol.a : patrol.b
      this.setWanderTarget(next.x, next.y)
    }

    const arrived = this.moveTowardsTarget()
    if (arrived) {
      this.patrolState = this.patrolState === 'toA' ? 'waitA' : 'waitB'
      this.patrolWaitUntil = time + patrol.pauseMs
    }
  }

  /**
   * Proximity auto-greet: fires once per "pass" (player has to leave
   * GREET_RESET_RADIUS before it can fire again), and only while idle so a
   * mid-errand NPC (e.g. OB on a coffee run) doesn't stop for chit-chat.
   */
  private notice(playerX: number, playerY: number, time: number) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY)
    if (dist <= GREET_RADIUS) {
      if (!this.hasGreetedThisPass && time - this.lastGreetAt > GREET_COOLDOWN_MS) {
        this.hasGreetedThisPass = true
        this.lastGreetAt = time
        this.say(pickRandom(this.greetings))
      }
    } else if (dist > GREET_RESET_RADIUS) {
      this.hasGreetedThisPass = false
    }
  }

  /** Called every frame from Game.ts's main update loop (see updateNPCs). */
  update(time: number, playerX: number, playerY: number) {
    this.setDepth(this.y)

    if (this.talking || this.menuOpen) return

    if (this.busyStage === 'idle') this.notice(playerX, playerY, time)
    // notice() may have just started a greeting (say() zeroes velocity and
    // sets `talking`) — bail out now, or the movement code below would
    // immediately overwrite that same-frame velocity-zero
    if (this.talking) return

    if (this.patrol && this.busyStage === 'idle') {
      this.updatePatrol(time)
      return
    }

    // OB's scripted coffee-run overrides normal idle/wander target-picking
    if (this.busyStage === 'atPantry') {
      if (time >= this.busyUntil) {
        this.busyStage = 'returning'
        this.setWanderTarget(this.returnSpot.x, this.returnSpot.y)
      } else {
        this.moveTowardsTarget()
        return
      }
    }

    if (this.busyStage === 'toPantry' || this.busyStage === 'returning') {
      const arrived = this.moveTowardsTarget()
      if (arrived && this.busyStage === 'toPantry') {
        this.busyStage = 'atPantry'
        this.busyUntil = time + OB_PANTRY_WAIT_MS
      } else if (arrived && this.busyStage === 'returning') {
        const drink = pickRandom(OB_DRINKS)
        const line = pickRandom(this.coffeeReturnLines).replace('{drink}', drink)
        this.busyStage = 'idle'
        this.say(line, () => {
          this.nextDecisionAt = this.scene.time.now + 500
        })
      }
      return
    }

    // mostly idle, occasionally take a short walk nearby
    if (time >= this.nextDecisionAt) {
      this.pickNewWanderTarget()
      this.nextDecisionAt = time + IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS)
    }
    this.moveTowardsTarget()
  }

  /** Returns true once the sprite has (approximately) arrived at targetX/targetY. */
  private moveTowardsTarget(): boolean {
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const dist = Math.hypot(dx, dy)

    if (dist <= ARRIVE_DISTANCE) {
      this.setVelocity(0, 0)
      this.play(`${this.texture.key}_idle_${this.facing}`, true)
      return true
    }

    const now = this.scene.time.now
    if (now - this.lastStuckCheckAt > STUCK_CHECK_INTERVAL_MS) {
      if (this.lastStuckCheckAt !== -Infinity) {
        const moved = Phaser.Math.Distance.Between(this.x, this.y, this.lastStuckX, this.lastStuckY)
        if (moved < STUCK_MIN_MOVE_PX) {
          // blocked by something (wall/furniture) — stop here instead of
          // endlessly pushing into it until the next scheduled decision
          this.setVelocity(0, 0)
          this.play(`${this.texture.key}_idle_${this.facing}`, true)
          return true
        }
      }
      this.lastStuckCheckAt = now
      this.lastStuckX = this.x
      this.lastStuckY = this.y
    }

    const vx = (dx / dist) * WALK_SPEED
    const vy = (dy / dist) * WALK_SPEED
    this.setVelocity(vx, vy)
    this.facing = directionFromVelocity(vx, vy, this.facing)
    this.play(`${this.texture.key}_run_${this.facing}`, true)
    return false
  }
}
