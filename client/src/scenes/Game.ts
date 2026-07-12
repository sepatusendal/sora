import Phaser from 'phaser'

// import { debugDraw } from '../utils/debug'
import { createCharacterAnims } from '../anims/CharacterAnims'

import Item from '../items/Item'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import Door, { createDoorTextures } from '../items/Door'
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
import { mediaZoneConfigs, MediaZoneConfig } from '../config/mediaZones'
import { doorConfigs, DOOR_OPEN_DISTANCE, DOOR_CLOSE_DISTANCE, DOOR_ZONE_MAP } from '../config/doors'

export default class Game extends Phaser.Scene {
  network!: Network
  private cursors!: NavKeys
  private keyE!: Phaser.Input.Keyboard.Key
  private keyR!: Phaser.Input.Keyboard.Key
  private map!: Phaser.Tilemaps.Tilemap
  myPlayer!: MyPlayer
  private playerSelector!: Phaser.GameObjects.Zone
  private otherPlayers!: Phaser.Physics.Arcade.Group
  private otherPlayerMap = new Map<string, OtherPlayer>()
  computerMap = new Map<string, Computer>()
  private whiteboardMap = new Map<string, Whiteboard>()
  private doors: Door[] = []
  private currentMediaZoneId: string | null = null
  private lastMediaDistanceEmit = 0
  private mediaZoneLabels = new Map<string, Phaser.GameObjects.Text>()
  private unsubscribeLockWatcher?: () => void

  constructor() {
    super('game')
  }

  registerKeys() {
    this.cursors = {
      ...this.input.keyboard.createCursorKeys(),
      ...(this.input.keyboard.addKeys('W,S,A,D') as Keyboard),
    }

    // maybe we can have a dedicated method for adding keys if more keys are needed in the future
    this.keyE = this.input.keyboard.addKey('E')
    this.keyR = this.input.keyboard.addKey('R')
    this.input.keyboard.disableGlobalCapture()
    this.input.keyboard.on('keydown-ENTER', (event) => {
      store.dispatch(setShowChat(true))
      store.dispatch(setFocused(true))
    })
    this.input.keyboard.on('keydown-ESC', (event) => {
      store.dispatch(setShowChat(false))
    })
  }

  disableKeys() {
    this.input.keyboard.enabled = false
  }

  enableKeys() {
    this.input.keyboard.enabled = true
  }

  create(data: { network: Network }) {
    this.events.once('shutdown', () => {
      this.unsubscribeLockWatcher?.()
    })
    if (!data.network) {
      throw new Error('server instance missing')
    } else {
      this.network = data.network
    }

    createCharacterAnims(this.anims)

    this.map = this.make.tilemap({ key: 'tilemap' })
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')

    const groundLayer = this.map.createLayer('Ground', FloorAndGround)
    groundLayer.setCollisionByProperty({ collides: true })

    // debugDraw(groundLayer, this)

    this.myPlayer = this.add.myPlayer(705, 500, 'adam', this.network.mySessionId)
    this.playerSelector = new PlayerSelector(this, 0, 0, 16, 16)

    // import chair objects from Tiled map to Phaser
    const chairs = this.physics.add.staticGroup({ classType: Chair })
    const chairLayer = this.map.getObjectLayer('Chair')
    chairLayer.objects.forEach((chairObj) => {
      const item = this.addObjectFromTiled(chairs, chairObj, 'chairs', 'chair') as Chair
      // custom properties[0] is the object direction specified in Tiled
      item.itemDirection = chairObj.properties[0].value
    })

    // import computers objects from Tiled map to Phaser
    const computers = this.physics.add.staticGroup({ classType: Computer })
    const computerLayer = this.map.getObjectLayer('Computer')
    computerLayer.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(computers, obj, 'computers', 'computer') as Computer
      item.setDepth(item.y + item.height * 0.27)
      const id = `${i}`
      item.id = id
      this.computerMap.set(id, item)
    })

    // import whiteboards objects from Tiled map to Phaser
    const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
    const whiteboardLayer = this.map.getObjectLayer('Whiteboard')
    whiteboardLayer.objects.forEach((obj, i) => {
      const item = this.addObjectFromTiled(
        whiteboards,
        obj,
        'whiteboards',
        'whiteboard'
      ) as Whiteboard
      const id = `${i}`
      item.id = id
      this.whiteboardMap.set(id, item)
    })

    // import vending machine objects from Tiled map to Phaser
    const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
    const vendingMachineLayer = this.map.getObjectLayer('VendingMachine')
    vendingMachineLayer.objects.forEach((obj, i) => {
      this.addObjectFromTiled(vendingMachines, obj, 'vendingmachines', 'vendingmachine')
    })

    // import other objects from Tiled map to Phaser
    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround', false)
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false)
    this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true)
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false)
    this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true)
    this.addGroupFromTiled('Basement', 'basement', 'Basement', true)

    // auto sliding doors at every room doorway
    this.addDoors()

    // media zone floor labels (subtle, in-world hint of where shared media plays)
    this.addMediaZoneLabels()

    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer })

    this.cameras.main.zoom = 1.5
    this.cameras.main.startFollow(this.myPlayer, true)

    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer)
    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], vendingMachines)

    this.physics.add.overlap(
      this.playerSelector,
      [chairs, computers, whiteboards, vendingMachines],
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

  private addDoors() {
    createDoorTextures(this)
    doorConfigs.forEach((config) => {
      const centerX = config.x + config.width * 0.5
      const centerY = config.y + config.height * 0.5
      const texture = config.orientation === 'h' ? 'door_h' : 'door_v'
      const door = new Door(this, centerX, centerY, texture, config.id, config.orientation)
      this.add.existing(door)
      this.physics.add.existing(door, true) // static body
      door.setDepth(centerY + config.height * 0.5)
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], door)
      this.doors.push(door)
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
    // lounge/hall never carry a meaningful `locked` flag.
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
    return mediaZoneConfigs.find(
      (zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
    )
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
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ) {
    const actualX = object.x! + object.width! * 0.5
    const actualY = object.y! - object.height! * 0.5
    const obj = group
      .get(actualX, actualY, key, object.gid! - this.map.getTileset(tilesetName).firstgid)
      .setDepth(actualY)
    return obj
  }

  private addGroupFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string,
    collidable: boolean
  ) {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)
    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5
      const actualY = object.y! - object.height! * 0.5
      group
        .get(actualX, actualY, key, object.gid! - this.map.getTileset(tilesetName).firstgid)
        .setDepth(actualY)
    })
    if (this.myPlayer && collidable)
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group)
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

  update(t: number, dt: number) {
    if (this.myPlayer && this.network) {
      this.playerSelector.update(this.myPlayer, this.cursors)
      this.myPlayer.update(this.playerSelector, this.cursors, this.keyE, this.keyR, this.network)
      this.updateDoors()
      this.updateMediaZone(t)
    }
  }
}
