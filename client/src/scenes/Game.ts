import Phaser from 'phaser'

// import { debugDraw } from '../utils/debug'
import { createCharacterAnims } from '../anims/CharacterAnims'

import Item from '../items/Item'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import Door, { createDoorTextures } from '../items/Door'
import Portal, { createPortalTexture } from '../items/Portal'
import NPC from '../items/NPC'
import '../characters/MyPlayer'
import '../characters/OtherPlayer'
import MyPlayer from '../characters/MyPlayer'
import OtherPlayer from '../characters/OtherPlayer'
import PlayerSelector from '../characters/PlayerSelector'
import Network from '../services/Network'
import { IPlayer } from '../../../types/IOfficeState'
import { PlayerBehavior } from '../../../types/PlayerBehavior'
import { ItemType } from '../../../types/Items'

import store from '../stores'
import { setFocused, setShowChat } from '../stores/ChatStore'
import { setCurrentMediaZone } from '../stores/MediaStore'
import { NavKeys, Keyboard } from '../../../types/KeyboardState'
import { phaserEvents, Event } from '../events/EventCenter'
import { mediaZoneConfigs, MediaZoneConfig, findZoneAt } from '../config/mediaZones'
import { doorConfigs, DOOR_OPEN_DISTANCE, DOOR_CLOSE_DISTANCE, DOOR_ZONE_MAP } from '../config/doors'
import { portalConfigs, ANNEX_WORLD_OFFSET } from '../config/portals'
import { npcConfigs } from '../config/npcs'

const MAIN_OFFSET = { x: 0, y: 0 }

interface MapObjectGroups {
  chairs: Phaser.Physics.Arcade.StaticGroup
  computers: Phaser.Physics.Arcade.StaticGroup
  whiteboards: Phaser.Physics.Arcade.StaticGroup
  vendingMachines: Phaser.Physics.Arcade.StaticGroup
  // solid (collidable) Tiled object-layer groups for this map — kept around
  // so addNPCs can collide roaming NPCs against the same furniture/walls
  // the player already collides with (see addGroupFromTiled)
  collidables: Phaser.Physics.Arcade.StaticGroup[]
}

export default class Game extends Phaser.Scene {
  network!: Network
  private cursors!: NavKeys
  private keyE!: Phaser.Input.Keyboard.Key
  private keyR!: Phaser.Input.Keyboard.Key
  // number keys — used to pick an NPC conversation topic from its menu (see NPC.ts)
  private topicKeys!: Phaser.Input.Keyboard.Key[]
  private map!: Phaser.Tilemaps.Tilemap
  private annexMap!: Phaser.Tilemaps.Tilemap
  myPlayer!: MyPlayer
  private playerSelector!: Phaser.GameObjects.Zone
  private otherPlayers!: Phaser.Physics.Arcade.Group
  private otherPlayerMap = new Map<string, OtherPlayer>()
  computerMap = new Map<string, Computer>()
  private whiteboardMap = new Map<string, Whiteboard>()
  private doors: Door[] = []
  private portals!: Phaser.Physics.Arcade.StaticGroup
  private npcs: NPC[] = []
  private currentMediaZoneId: string | null = null
  private lastMediaDistanceEmit = 0
  private mediaZoneLabels = new Map<string, Phaser.GameObjects.Text>()
  private unsubscribeLockWatcher?: () => void

  constructor() {
    super('game')
  }

  registerKeys() {
    this.cursors = {
      ...this.input.keyboard!.createCursorKeys(),
      ...(this.input.keyboard!.addKeys('W,S,A,D') as Keyboard),
    }

    // maybe we can have a dedicated method for adding keys if more keys are needed in the future
    this.keyE = this.input.keyboard!.addKey('E')
    this.keyR = this.input.keyboard!.addKey('R')
    this.topicKeys = [
      this.input.keyboard!.addKey('ONE'),
      this.input.keyboard!.addKey('TWO'),
      this.input.keyboard!.addKey('THREE'),
    ]
    this.input.keyboard!.disableGlobalCapture()
    this.input.keyboard!.on('keydown-ENTER', () => {
      store.dispatch(setShowChat(true))
      store.dispatch(setFocused(true))
    })
    this.input.keyboard!.on('keydown-ESC', () => {
      store.dispatch(setShowChat(false))
    })
  }

  disableKeys() {
    this.input.keyboard!.enabled = false
  }

  enableKeys() {
    this.input.keyboard!.enabled = true
  }

  create(data: { network: Network }) {
    this.events.once('shutdown', () => {
      this.unsubscribeLockWatcher?.()
      phaserEvents.off(Event.PLAYER_JOINED, this.handlePlayerJoined, this)
      phaserEvents.off(Event.PLAYER_LEFT, this.handlePlayerLeft, this)
      phaserEvents.off(Event.MY_PLAYER_READY, this.handleMyPlayerReady, this)
      phaserEvents.off(Event.MY_PLAYER_VIDEO_CONNECTED, this.handleMyVideoConnected, this)
      phaserEvents.off(Event.PLAYER_UPDATED, this.handlePlayerUpdated, this)
      phaserEvents.off(Event.ITEM_USER_ADDED, this.handleItemUserAdded, this)
      phaserEvents.off(Event.ITEM_USER_REMOVED, this.handleItemUserRemoved, this)
      phaserEvents.off(Event.UPDATE_DIALOG_BUBBLE, this.handleChatMessageAdded, this)
    })
    if (!data.network) {
      throw new Error('server instance missing')
    } else {
      this.network = data.network
    }

    createCharacterAnims(this.anims)

    // main office
    this.map = this.make.tilemap({ key: 'tilemap' })
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')!
    const groundLayer = this.map.createLayer('Ground', FloorAndGround)!
    groundLayer.setCollisionByProperty({ collides: true })
    this.bakeGroundLayer(groundLayer, this.map.widthInPixels, this.map.heightInPixels, MAIN_OFFSET)

    // annex — a second, physically separate area placed right beside the
    // main office (see ANNEX_WORLD_OFFSET), loaded into the SAME scene at
    // the same time as the main map. Nothing ever tears this down or
    // reloads it: crossing between the two areas is just an instant
    // reposition (see Portal / MyPlayer's keyR handling), so player input
    // bindings (registerKeys(), only ever called once from LoginDialog)
    // never go stale.
    this.annexMap = this.make.tilemap({ key: 'tilemap-annex' })
    const annexFloorAndGround = this.annexMap.addTilesetImage('FloorAndGround', 'tiles_wall')!
    const annexGroundLayer = this.annexMap.createLayer('Ground', annexFloorAndGround)!
    annexGroundLayer.setPosition(ANNEX_WORLD_OFFSET.x, ANNEX_WORLD_OFFSET.y)
    annexGroundLayer.setCollisionByProperty({ collides: true })
    this.bakeGroundLayer(
      annexGroundLayer,
      this.annexMap.widthInPixels,
      this.annexMap.heightInPixels,
      ANNEX_WORLD_OFFSET
    )

    // debugDraw(groundLayer, this)

    this.myPlayer = this.add.myPlayer(705, 500, 'adam', this.network.mySessionId)
    this.playerSelector = new PlayerSelector(this, 0, 0, 16, 16)

    const mainObjects = this.loadMapContent(this.map, MAIN_OFFSET, 'main')
    const annexObjects = this.loadMapContent(this.annexMap, ANNEX_WORLD_OFFSET, 'annex')

    // auto sliding doors at every room doorway (both maps)
    this.addDoors()

    // teleport points to/from the annex
    this.addPortals()

    // roaming decorative NPCs (OB, Satpam, Receptionist) — main office only
    const npcGroup = this.addNPCs(groundLayer, mainObjects, this.doors)

    // media zone floor labels (subtle, in-world hint of where shared media plays)
    this.addMediaZoneLabels()

    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer })

    this.cameras.main.zoom = 1.5
    this.cameras.main.setRoundPixels(true)
    this.cameras.main.startFollow(this.myPlayer, true)

    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer)
    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], annexGroundLayer)

    this.physics.add.overlap(
      this.playerSelector,
      [
        mainObjects.chairs,
        mainObjects.computers,
        mainObjects.whiteboards,
        mainObjects.vendingMachines,
        annexObjects.chairs,
        annexObjects.computers,
        annexObjects.whiteboards,
        annexObjects.vendingMachines,
        this.portals,
      ],
      this.handleItemSelectorOverlap,
      undefined,
      this
    )
    // separate call: npcGroup is a dynamic Group (NPCs move), which can't
    // share a mixed-type array with the StaticGroups above — Phaser's
    // ArcadeColliderType only allows homogeneous arrays
    this.physics.add.overlap(
      this.playerSelector,
      npcGroup,
      this.handleItemSelectorOverlap,
      undefined,
      this
    )

    this.physics.add.overlap(
      this.myPlayer,
      this.otherPlayers,
      this.handlePlayersOverlap,
      undefined,
      this
    )

    // register network event listeners
    this.network.onPlayerJoined(this.handlePlayerJoined, this)
    this.network.onPlayerLeft(this.handlePlayerLeft, this)
    this.network.onMyPlayerReady(this.handleMyPlayerReady, this)
    this.network.onMyPlayerVideoConnected(this.handleMyVideoConnected, this)
    this.network.onPlayerUpdated(this.handlePlayerUpdated, this)
    this.network.onItemUserAdded(this.handleItemUserAdded, this)
    this.network.onItemUserRemoved(this.handleItemUserRemoved, this)
    this.network.onChatMessageAdded(this.handleChatMessageAdded, this)
  }

  /**
   * The Ground layer is 100% static — nothing ever repaints it at runtime —
   * so bake it to one flat image instead of leaving it a live TilemapLayer.
   * TilemapLayer uses a specialized batched-tile render path that, unlike
   * regular Sprites/Images (furniture, players — none of which ever show
   * this), produces thin 1px seam/gap lines between some tile rows
   * depending on the camera's exact scroll position when it renders.
   * A baked Image goes through the normal render path instead, so it can't
   * have that per-tile-row problem. Collision keeps using the original
   * `layer` (now just hidden) — this only swaps what gets drawn.
   */
  private bakeGroundLayer(
    layer: Phaser.Tilemaps.TilemapLayer,
    width: number,
    height: number,
    offset: { x: number; y: number }
  ) {
    const bake = this.add.renderTexture(offset.x, offset.y, width, height).setOrigin(0, 0)
    bake.draw(layer, 0, 0)
    bake.setDepth(-1)
    layer.setVisible(false)
  }

  /**
   * Populates one tilemap's furniture/wall object layers into the scene,
   * offset by `offset` world pixels. Called once per map (main, annex) so
   * both can coexist in the same persistent scene.
   */
  private loadMapContent(
    map: Phaser.Tilemaps.Tilemap,
    offset: { x: number; y: number },
    mapPrefix: string
  ): MapObjectGroups {
    // import chair objects from Tiled map to Phaser
    const chairs = this.physics.add.staticGroup({ classType: Chair })
    map.getObjectLayer('Chair')!.objects.forEach((chairObj) => {
      const item = this.addObjectFromTiled(map, offset, chairs, chairObj, 'chairs', 'chair') as Chair
      // custom properties[0] is the object direction specified in Tiled
      item.itemDirection = chairObj.properties[0].value
    })

    // import computers objects from Tiled map to Phaser. Ids are prefixed
    // per-map ('main-0', 'annex-0', ...) because the annex is now a full
    // duplicate of the main map's Computer layer — without the prefix,
    // annex computer 0 and main computer 0 would resolve to the exact same
    // server-side Computer entry (see Sora.ts) and incorrectly share
    // screen-share state across two physically different desks.
    const computers = this.physics.add.staticGroup({ classType: Computer })
    map.getObjectLayer('Computer')!.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(
        map,
        offset,
        computers,
        obj,
        'computers',
        'computer'
      ) as Computer
      item.setDepth(item.y + item.height * 0.27)
      const id = `${mapPrefix}-${i}`
      item.id = id
      this.computerMap.set(id, item)
    })

    // import whiteboards objects from Tiled map to Phaser (same per-map id
    // prefixing as computers, and for the same reason)
    const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
    map.getObjectLayer('Whiteboard')!.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(
        map,
        offset,
        whiteboards,
        obj,
        'whiteboards',
        'whiteboard'
      ) as Whiteboard
      const id = `${mapPrefix}-${i}`
      item.id = id
      this.whiteboardMap.set(id, item)
    })

    // import vending machine objects from Tiled map to Phaser
    const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
    map.getObjectLayer('VendingMachine')!.objects.forEach((obj) => {
      this.addObjectFromTiled(map, offset, vendingMachines, obj, 'vendingmachines', 'vendingmachine')
    })
    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], vendingMachines)

    // import other objects from Tiled map to Phaser
    this.addGroupFromTiled(map, offset, 'Wall', 'tiles_wall', 'FloorAndGround', false)
    this.addGroupFromTiled(map, offset, 'Objects', 'office', 'Modern_Office_Black_Shadow', false)
    const objectsOnCollide = this.addGroupFromTiled(
      map,
      offset,
      'ObjectsOnCollide',
      'office',
      'Modern_Office_Black_Shadow',
      true
    )
    this.addGroupFromTiled(map, offset, 'GenericObjects', 'generic', 'Generic', false)
    const genericObjectsOnCollide = this.addGroupFromTiled(
      map,
      offset,
      'GenericObjectsOnCollide',
      'generic',
      'Generic',
      true
    )
    const basement = this.addGroupFromTiled(map, offset, 'Basement', 'basement', 'Basement', true)

    return {
      chairs,
      computers,
      whiteboards,
      vendingMachines,
      collidables: [objectsOnCollide, genericObjectsOnCollide, basement],
    }
  }

  private addDoors() {
    createDoorTextures(this)
    doorConfigs.forEach((config) => {
      const centerX = config.x + config.width * 0.5
      const centerY = config.y + config.height * 0.5
      const texture =
        config.style === 'glass'
          ? 'door_glass_v'
          : config.orientation === 'h'
          ? 'door_h'
          : 'door_v'
      const door = new Door(this, centerX, centerY, texture, config.id, config.orientation)
      this.add.existing(door)
      this.physics.add.existing(door, true) // static body
      if (config.orientation === 'h') {
        // door_h's sprite is 2 tiles tall (64px) for looks — the extra
        // tile is purely decorative, extending up into the room, while
        // only the BOTTOM tile is the real wall gap. Left at full size,
        // the collider blocked the player's separate name-tag hitbox
        // (which floats near head height, above the "feet" collision box)
        // even after the player's own body had already cleared the
        // doorway — that's what caused the "stuck entering/exiting" and
        // the name tag lagging behind when it got shoved off course.
        const body = door.body as Phaser.Physics.Arcade.StaticBody
        body.setSize(32, 32).setOffset(0, 32)
      }
      door.setDepth(centerY + config.height * 0.5)
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], door)
      this.doors.push(door)
    })
  }

  private addPortals() {
    createPortalTexture(this)
    this.portals = this.physics.add.staticGroup({ classType: Portal })
    portalConfigs.forEach((config) => {
      const portal = this.portals
        .get(config.x, config.y, 'portal')
        .setDepth(config.y) as Portal
      // static group's classType constructor only gets (scene, x, y, texture, frame) —
      // finish wiring the portal-specific fields it needs to activate correctly
      portal.setPortalData(config.id, config.targetX, config.targetY, config.label)
    })
  }

  /**
   * Roaming decorative NPCs (OB, Satpam, Receptionist) — main office only,
   * client-side only (see NPC.ts). Collides against the exact same solid
   * geometry the player does (walls, vending machines, doors, collidable
   * Tiled furniture) so they can't walk through objects while wandering.
   */
  private addNPCs(
    groundLayer: Phaser.Tilemaps.TilemapLayer,
    mainObjects: MapObjectGroups,
    doors: Door[]
  ): Phaser.Physics.Arcade.Group {
    const npcGroup = this.physics.add.group({ classType: NPC })
    npcConfigs.forEach((config) => {
      const npc = npcGroup.get(config.spawn.x, config.spawn.y, config.texture) as NPC
      npc.setNpcData(config)
      this.npcs.push(npc)
    })
    this.physics.add.collider(npcGroup, groundLayer)
    this.physics.add.collider(npcGroup, mainObjects.vendingMachines)
    mainObjects.collidables.forEach((group) => this.physics.add.collider(npcGroup, group))
    doors.forEach((door) => this.physics.add.collider(npcGroup, door))
    return npcGroup
  }

  private updateNPCs(time: number) {
    this.npcs.forEach((npc) => npc.update(time, this.myPlayer.x, this.myPlayer.y))

    // topicKeys is only set once registerKeys() runs (called from
    // LoginDialog on submit) — the game scene's update loop is already
    // ticking before that (myPlayer/npcs exist from create()), so this
    // must stay guarded or every frame before login crashes here
    if (!this.topicKeys) return

    // number keys pick a conversation topic from whichever NPC's menu is
    // currently open (see NPC.ts's openMenu/chooseTopic) — harmless no-op
    // for every NPC whose menu isn't open
    this.topicKeys.forEach((key, index) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.npcs.forEach((npc) => npc.chooseTopic(index, this.myPlayer))
      }
    })
  }

  private addMediaZoneLabels() {
    mediaZoneConfigs.forEach((zone) => {
      const centerX = zone.x + zone.width * 0.5
      const locked = !!store.getState().media.zones[zone.id]?.locked
      const label = zone.lockable ? `${locked ? '🔒' : '🔓'} ♪ ${zone.label}` : `♪ ${zone.label}`
      const text = this.add
        .text(centerX, zone.y + 6, label, {
          fontFamily: 'Arial',
          fontSize: '11px',
          color: '#1ea2df',
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.75)
        .setDepth(zone.y)
      this.mediaZoneLabels.set(zone.id, text)
    })

    // Keep lockable zone labels in sync with lock state (🔒/🔓 prefix) without
    // re-creating the text objects — only lockable zones react here, since
    // lounge/workspace never carry a meaningful `locked` flag.
    const prevLocked = new Map<string, boolean>(
      mediaZoneConfigs
        .filter((zone) => zone.lockable)
        .map((zone) => [zone.id, !!store.getState().media.zones[zone.id]?.locked])
    )
    this.unsubscribeLockWatcher = store.subscribe(() => {
      const zones = store.getState().media.zones
      mediaZoneConfigs.forEach((zone) => {
        if (!zone.lockable) return
        const locked = !!zones[zone.id]?.locked
        if (prevLocked.get(zone.id) === locked) return
        prevLocked.set(zone.id, locked)
        const text = this.mediaZoneLabels.get(zone.id)
        if (!text) return
        text.setText(`${locked ? '🔒' : '🔓'} ♪ ${zone.label}`)
      })
    })
  }

  private updateDoors() {
    if (!this.myPlayer) return
    const zones = store.getState().media.zones
    this.doors.forEach((door) => {
      const zoneId = DOOR_ZONE_MAP[door.doorId]
      const locked = zoneId ? !!zones[zoneId]?.locked : false
      door.setLockedState(locked)

      if (locked) {
        // Keep the collider solid and the panel shut regardless of distance —
        // a locked door never auto-opens by proximity.
        if (door.opened) door.setOpenState(false)
        return
      }

      const distance = Phaser.Math.Distance.Between(
        this.myPlayer.x,
        this.myPlayer.y,
        door.x,
        door.y
      )
      if (!door.opened && distance < DOOR_OPEN_DISTANCE) {
        door.setOpenState(true)
      } else if (door.opened && distance > DOOR_CLOSE_DISTANCE) {
        door.setOpenState(false)
      }
    })
  }

  private getMediaZoneAt(x: number, y: number): MediaZoneConfig | undefined {
    return findZoneAt(x, y)
  }

  private updateMediaZone(time: number) {
    if (!this.myPlayer) return
    const zone = this.getMediaZoneAt(this.myPlayer.x, this.myPlayer.y)
    const zoneId = zone?.id ?? null

    if (zoneId !== this.currentMediaZoneId) {
      this.currentMediaZoneId = zoneId
      store.dispatch(setCurrentMediaZone(zoneId))
    }

    // emit proximity ratio (1 = zone center, 0 = zone edge) ~5x per second
    if (zone && time - this.lastMediaDistanceEmit > 200) {
      this.lastMediaDistanceEmit = time
      const centerX = zone.x + zone.width * 0.5
      const centerY = zone.y + zone.height * 0.5
      const maxRadius = Math.sqrt(zone.width * zone.width + zone.height * zone.height) * 0.5
      const distance = Phaser.Math.Distance.Between(
        this.myPlayer.x,
        this.myPlayer.y,
        centerX,
        centerY
      )
      const ratio = 1 - Math.min(distance / maxRadius, 1)
      phaserEvents.emit(Event.MEDIA_DISTANCE, ratio)
    }
  }

  private handleItemSelectorOverlap(playerSelector, selectionItem) {
    const currentItem = playerSelector.selectedItem as Item
    // currentItem is undefined if nothing was perviously selected
    if (currentItem) {
      // if the selection has not changed, do nothing
      if (currentItem === selectionItem || currentItem.depth >= selectionItem.depth) {
        return
      }
      // if selection changes, clear pervious dialog
      if (this.myPlayer.playerBehavior !== PlayerBehavior.SITTING) currentItem.clearDialogBox()
    }

    // set selected item and set up new dialog
    playerSelector.selectedItem = selectionItem
    selectionItem.onOverlapDialog()
  }

  private addObjectFromTiled(
    map: Phaser.Tilemaps.Tilemap,
    offset: { x: number; y: number },
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ) {
    const actualX = object.x! + object.width! * 0.5 + offset.x
    const actualY = object.y! - object.height! * 0.5 + offset.y
    const obj = group
      .get(actualX, actualY, key, object.gid! - map.getTileset(tilesetName)!.firstgid)
      .setDepth(actualY)
    return obj
  }

  private addGroupFromTiled(
    map: Phaser.Tilemaps.Tilemap,
    offset: { x: number; y: number },
    objectLayerName: string,
    key: string,
    tilesetName: string,
    collidable: boolean
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup()
    const objectLayer = map.getObjectLayer(objectLayerName)!
    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5 + offset.x
      const actualY = object.y! - object.height! * 0.5 + offset.y
      group
        .get(actualX, actualY, key, object.gid! - map.getTileset(tilesetName)!.firstgid)
        .setDepth(actualY)
    })
    if (this.myPlayer && collidable)
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group)
    return group
  }

  // function to add new player to the otherPlayer group
  private handlePlayerJoined(newPlayer: IPlayer, id: string) {
    const otherPlayer = this.add.otherPlayer(newPlayer.x, newPlayer.y, 'adam', id, newPlayer.name)
    this.otherPlayers.add(otherPlayer)
    this.otherPlayerMap.set(id, otherPlayer)
  }

  // function to remove the player who left from the otherPlayer group
  private handlePlayerLeft(id: string) {
    if (this.otherPlayerMap.has(id)) {
      const otherPlayer = this.otherPlayerMap.get(id)
      if (!otherPlayer) return
      this.otherPlayers.remove(otherPlayer, true, true)
      this.otherPlayerMap.delete(id)
    }
  }

  private handleMyPlayerReady() {
    this.myPlayer.readyToConnect = true
  }

  private handleMyVideoConnected() {
    this.myPlayer.videoConnected = true
  }

  // function to update target position upon receiving player updates
  private handlePlayerUpdated(field: string, value: number | string, id: string) {
    const otherPlayer = this.otherPlayerMap.get(id)
    otherPlayer?.updateOtherPlayer(field, value)
  }

  private handlePlayersOverlap(myPlayer, otherPlayer) {
    otherPlayer.makeCall(myPlayer, this.network?.webRTC)
  }

  private handleItemUserAdded(playerId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) {
      const computer = this.computerMap.get(itemId)
      computer?.addCurrentUser(playerId)
    } else if (itemType === ItemType.WHITEBOARD) {
      const whiteboard = this.whiteboardMap.get(itemId)
      whiteboard?.addCurrentUser(playerId)
    }
  }

  private handleItemUserRemoved(playerId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) {
      const computer = this.computerMap.get(itemId)
      computer?.removeCurrentUser(playerId)
    } else if (itemType === ItemType.WHITEBOARD) {
      const whiteboard = this.whiteboardMap.get(itemId)
      whiteboard?.removeCurrentUser(playerId)
    }
  }

  private handleChatMessageAdded(playerId: string, content: string) {
    const otherPlayer = this.otherPlayerMap.get(playerId)
    otherPlayer?.updateDialogBubble(content)
  }

  update(t: number) {
    if (this.myPlayer && this.network) {
      this.playerSelector.update(this.myPlayer, this.cursors)
      this.myPlayer.update(this.playerSelector, this.cursors, this.keyE, this.keyR, this.network)
      this.updateDoors()
      this.updateMediaZone(t)
      this.updateNPCs(t)
    }
  }
}
