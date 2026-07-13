import bcrypt from 'bcrypt'
import { Room, Client, ServerError } from 'colyseus'
import { Dispatcher } from '@colyseus/command'
import { Player, OfficeState, Computer, Whiteboard, MediaZone } from './schema/OfficeState'
import { Message } from '../../types/Messages'
import { IRoomData } from '../../types/Rooms'
import { whiteboardRoomIds } from './schema/OfficeState'
import PlayerUpdateCommand from './commands/PlayerUpdateCommand'
import PlayerUpdateNameCommand from './commands/PlayerUpdateNameCommand'
import {
  ComputerAddUserCommand,
  ComputerRemoveUserCommand,
} from './commands/ComputerUpdateArrayCommand'
import {
  WhiteboardAddUserCommand,
  WhiteboardRemoveUserCommand,
} from './commands/WhiteboardUpdateArrayCommand'
import ChatMessageUpdateCommand from './commands/ChatMessageUpdateCommand'

// media zones available in every office room
// ids must match client/src/config/mediaZones.ts
const MEDIA_ZONES: { id: string; label: string }[] = [
  { id: 'lounge', label: 'Lounge' },
  { id: 'studio', label: 'Meeting Room' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'ceo', label: 'CEO Room' },
  // annex rooms — map-annex.json is a byte-for-byte duplicate of map.json
  // (see client/src/scenes/Game.ts / config/mediaZones.ts), loaded into the
  // same persistent client scene as the main map and reached via portal
  // (client/src/config/portals.ts). World coords are pre-offset by
  // +1280,+0 (ANNEX_WORLD_OFFSET) so they sit directly beside the main
  // map's right edge without numerically colliding with the zones above.
  { id: 'annexLounge', label: 'Annex Lounge' },
  { id: 'annexStudio', label: 'Annex Meeting Room' },
  { id: 'annexWorkspace', label: 'Annex Workspace' },
  { id: 'annexCeo', label: 'Annex CEO Room' },
]

// pixel rects (32px tiles) mirroring client/src/config/mediaZones.ts —
// used server-side so lock/unlock can be verified against the player's
// actual position instead of trusting the client.
const ZONE_BOUNDS: { [id: string]: { x: number; y: number; width: number; height: number } } = {
  lounge: { x: 192, y: 192, width: 416, height: 160 },
  studio: { x: 192, y: 544, width: 416, height: 224 },
  workspace: { x: 800, y: 320, width: 448, height: 608 },
  ceo: { x: 640, y: 32, width: 416, height: 256 },
  annexLounge: { x: 1472, y: 192, width: 416, height: 160 },
  annexStudio: { x: 1472, y: 544, width: 416, height: 224 },
  annexWorkspace: { x: 2080, y: 320, width: 448, height: 608 },
  annexCeo: { x: 1920, y: 32, width: 416, height: 256 },
}

// only these zones can be locked — meeting room & CEO room are private
// spaces; the lounge and workspace stay open to everyone.
const LOCKABLE_ZONE_IDS = new Set(['studio', 'ceo', 'annexStudio', 'annexCeo'])

// how often (ms) the server sweeps locked zones for an auto-unlock safety net
const LOCK_SWEEP_INTERVAL = 5000

export class SkyOffice extends Room<OfficeState> {
  private dispatcher = new Dispatcher(this)
  private name: string
  private description: string
  private password: string | null = null

  async onCreate(options: IRoomData) {
    const { name, description, password, autoDispose } = options
    this.name = name
    this.description = description
    this.autoDispose = autoDispose

    let hasPassword = false
    if (password) {
      const salt = await bcrypt.genSalt(10)
      this.password = await bcrypt.hash(password, salt)
      hasPassword = true
    }
    this.setMetadata({ name, description, hasPassword })

    this.setState(new OfficeState())

    // HARD-CODED: Add 5 computers + 3 whiteboards per map ('main', 'annex').
    // The annex is a full duplicate of the main map's tilemap (see
    // client/src/scenes/Game.ts), so ids are prefixed per-map — otherwise
    // annex computer/whiteboard 0 would resolve to the exact same state as
    // main's, incorrectly sharing screen-share/whiteboard-room state across
    // two physically different desks.
    ;['main', 'annex'].forEach((mapPrefix) => {
      for (let i = 0; i < 5; i++) {
        this.state.computers.set(`${mapPrefix}-${i}`, new Computer())
      }
      for (let i = 0; i < 3; i++) {
        this.state.whiteboards.set(`${mapPrefix}-${i}`, new Whiteboard())
      }
    })

    // add shared media zones (synced YouTube/Spotify playback per zone)
    MEDIA_ZONES.forEach(({ id, label }) => {
      const zone = new MediaZone()
      zone.label = label
      this.state.mediaZones.set(id, zone)
    })

    /**
     * Lock room (advanced):
     * - Only a player physically standing inside a lockable zone may lock it
     *   (verified server-side against ZONE_BOUNDS, never trusting the client).
     * - Once locked, entry is blocked for everyone else — the door stays shut
     *   client-side (see Game.ts) because the lock state is part of the
     *   synced room state.
     * - Unlocking is allowed for the player who locked it OR anyone currently
     *   standing inside the zone (so a meeting can "self-unlock" even if the
     *   original locker already left).
     * - Safety net: every LOCK_SWEEP_INTERVAL ms, any locked zone with nobody
     *   left inside it is automatically unlocked so a room can never stay
     *   locked forever if everyone disconnects/walks away.
     */
    this.onMessage(Message.LOCK_ZONE, (client, message: { zoneId: string }) => {
      const zoneId = message?.zoneId
      const zone = this.state.mediaZones.get(zoneId)
      if (!zone || !LOCKABLE_ZONE_IDS.has(zoneId) || zone.locked) return

      const player = this.state.players.get(client.sessionId)
      if (!player || !this.isPlayerInZone(player, zoneId)) return

      zone.locked = true
      zone.lockedBy = player.name || 'Someone'
      zone.lockedBySessionId = client.sessionId
      zone.lockedAt = Date.now()
    })

    this.onMessage(Message.UNLOCK_ZONE, (client, message: { zoneId: string }) => {
      const zoneId = message?.zoneId
      const zone = this.state.mediaZones.get(zoneId)
      if (!zone || !zone.locked) return

      const player = this.state.players.get(client.sessionId)
      if (!player) return

      const isOriginalLocker = client.sessionId === zone.lockedBySessionId
      const isCurrentlyInside = this.isPlayerInZone(player, zoneId)
      if (!isOriginalLocker && !isCurrentlyInside) return

      zone.locked = false
      zone.lockedBy = ''
      zone.lockedBySessionId = ''
      zone.lockedAt = 0
    })

    // auto-unlock safety net
    this.clock.setInterval(() => {
      this.state.mediaZones.forEach((zone, zoneId) => {
        if (!zone.locked || !LOCKABLE_ZONE_IDS.has(zoneId)) return
        const anyoneInside = Array.from(this.state.players.values()).some((player) =>
          this.isPlayerInZone(player, zoneId)
        )
        if (!anyoneInside) {
          zone.locked = false
          zone.lockedBy = ''
          zone.lockedBySessionId = ''
          zone.lockedAt = 0
        }
      })
    }, LOCK_SWEEP_INTERVAL)

    // when a player connect to a computer, add to the computer connectedUser array
    this.onMessage(Message.CONNECT_TO_COMPUTER, (client, message: { computerId: string }) => {
      this.dispatcher.dispatch(new ComputerAddUserCommand(), {
        client,
        computerId: message.computerId,
      })
    })

    // when a player disconnect from a computer, remove from the computer connectedUser array
    this.onMessage(Message.DISCONNECT_FROM_COMPUTER, (client, message: { computerId: string }) => {
      this.dispatcher.dispatch(new ComputerRemoveUserCommand(), {
        client,
        computerId: message.computerId,
      })
    })

    // when a player stop sharing screen
    this.onMessage(Message.STOP_SCREEN_SHARE, (client, message: { computerId: string }) => {
      const computer = this.state.computers.get(message.computerId)
      computer.connectedUser.forEach((id) => {
        this.clients.forEach((cli) => {
          if (cli.sessionId === id && cli.sessionId !== client.sessionId) {
            cli.send(Message.STOP_SCREEN_SHARE, client.sessionId)
          }
        })
      })
    })

    // when a player connect to a whiteboard, add to the whiteboard connectedUser array
    this.onMessage(Message.CONNECT_TO_WHITEBOARD, (client, message: { whiteboardId: string }) => {
      this.dispatcher.dispatch(new WhiteboardAddUserCommand(), {
        client,
        whiteboardId: message.whiteboardId,
      })
    })

    // when a player disconnect from a whiteboard, remove from the whiteboard connectedUser array
    this.onMessage(
      Message.DISCONNECT_FROM_WHITEBOARD,
      (client, message: { whiteboardId: string }) => {
        this.dispatcher.dispatch(new WhiteboardRemoveUserCommand(), {
          client,
          whiteboardId: message.whiteboardId,
        })
      }
    )

    /**
     * Media zone messages (shared YouTube/Spotify playback)
     * The server is the single source of truth for playback state:
     * - mediaId + mediaType: what is playing
     * - playbackTime: playhead position (seconds) at the moment of updatedAt
     * - updatedAt: server timestamp of the last state change
     * Clients derive the live position as playbackTime + (now - receivedAt).
     */
    this.onMessage(
      Message.MEDIA_SET,
      (client, message: { zoneId: string; mediaType: string; mediaId: string }) => {
        const zone = this.state.mediaZones.get(message.zoneId)
        if (!zone) return
        if (message.mediaType !== 'youtube' && message.mediaType !== 'spotify') return
        const player = this.state.players.get(client.sessionId)
        zone.mediaType = message.mediaType
        zone.mediaId = message.mediaId
        zone.isPlaying = true
        zone.playbackTime = 0
        zone.updatedAt = Date.now()
        zone.ownerName = player?.name || ''
      }
    )

    this.onMessage(Message.MEDIA_PLAY, (client, message: { zoneId: string; time?: number }) => {
      const zone = this.state.mediaZones.get(message.zoneId)
      if (!zone || !zone.mediaId) return
      if (typeof message.time === 'number' && message.time >= 0) {
        zone.playbackTime = message.time
      }
      zone.isPlaying = true
      zone.updatedAt = Date.now()
    })

    this.onMessage(Message.MEDIA_PAUSE, (client, message: { zoneId: string; time?: number }) => {
      const zone = this.state.mediaZones.get(message.zoneId)
      if (!zone || !zone.mediaId) return
      if (typeof message.time === 'number' && message.time >= 0) {
        // trust the pausing client's actual playhead for accuracy
        zone.playbackTime = message.time
      } else if (zone.isPlaying) {
        zone.playbackTime += (Date.now() - zone.updatedAt) / 1000
      }
      zone.isPlaying = false
      zone.updatedAt = Date.now()
    })

    this.onMessage(Message.MEDIA_SEEK, (client, message: { zoneId: string; time: number }) => {
      const zone = this.state.mediaZones.get(message.zoneId)
      if (!zone || !zone.mediaId) return
      if (typeof message.time !== 'number' || message.time < 0) return
      zone.playbackTime = message.time
      zone.updatedAt = Date.now()
    })

    this.onMessage(Message.MEDIA_STOP, (client, message: { zoneId: string }) => {
      const zone = this.state.mediaZones.get(message.zoneId)
      if (!zone) return
      zone.mediaType = ''
      zone.mediaId = ''
      zone.isPlaying = false
      zone.playbackTime = 0
      zone.updatedAt = Date.now()
      zone.ownerName = ''
    })

    // when receiving updatePlayer message, call the PlayerUpdateCommand
    this.onMessage(
      Message.UPDATE_PLAYER,
      (client, message: { x: number; y: number; anim: string }) => {
        this.dispatcher.dispatch(new PlayerUpdateCommand(), {
          client,
          x: message.x,
          y: message.y,
          anim: message.anim,
        })
      }
    )

    // when receiving updatePlayerName message, call the PlayerUpdateNameCommand
    this.onMessage(Message.UPDATE_PLAYER_NAME, (client, message: { name: string }) => {
      this.dispatcher.dispatch(new PlayerUpdateNameCommand(), {
        client,
        name: message.name,
      })
    })

    // when a player is ready to connect, call the PlayerReadyToConnectCommand
    this.onMessage(Message.READY_TO_CONNECT, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.readyToConnect = true
    })

    // when a player is ready to connect, call the PlayerReadyToConnectCommand
    this.onMessage(Message.VIDEO_CONNECTED, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.videoConnected = true
    })

    // when a player disconnect a stream, broadcast the signal to the other player connected to the stream
    this.onMessage(Message.DISCONNECT_STREAM, (client, message: { clientId: string }) => {
      this.clients.forEach((cli) => {
        if (cli.sessionId === message.clientId) {
          cli.send(Message.DISCONNECT_STREAM, client.sessionId)
        }
      })
    })

    // when a player send a chat message, update the message array and broadcast to all connected clients except the sender
    this.onMessage(Message.ADD_CHAT_MESSAGE, (client, message: { content: string }) => {
      // update the message array (so that players join later can also see the message)
      this.dispatcher.dispatch(new ChatMessageUpdateCommand(), {
        client,
        content: message.content,
      })

      // broadcast to all currently connected clients except the sender (to render in-game dialog on top of the character)
      this.broadcast(
        Message.ADD_CHAT_MESSAGE,
        { clientId: client.sessionId, content: message.content },
        { except: client }
      )
    })
  }

  private isPlayerInZone(player: Player, zoneId: string): boolean {
    const bounds = ZONE_BOUNDS[zoneId]
    if (!bounds) return false
    return (
      player.x >= bounds.x &&
      player.x <= bounds.x + bounds.width &&
      player.y >= bounds.y &&
      player.y <= bounds.y + bounds.height
    )
  }

  async onAuth(client: Client, options: { password: string | null }) {
    if (this.password) {
      const validPassword = await bcrypt.compare(options.password, this.password)
      if (!validPassword) {
        throw new ServerError(403, 'Password is incorrect!')
      }
    }
    return true
  }

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new Player())
    client.send(Message.SEND_ROOM_DATA, {
      id: this.roomId,
      name: this.name,
      description: this.description,
    })
  }

  onLeave(client: Client) {
    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId)
    }
    // if the player who leaves was holding a lock and nobody else is left
    // inside that room, release it immediately instead of waiting for the
    // periodic sweep
    this.state.mediaZones.forEach((zone, zoneId) => {
      if (!zone.locked || zone.lockedBySessionId !== client.sessionId) return
      const anyoneElseInside = Array.from(this.state.players.values()).some((player) =>
        this.isPlayerInZone(player, zoneId)
      )
      if (!anyoneElseInside) {
        zone.locked = false
        zone.lockedBy = ''
        zone.lockedBySessionId = ''
        zone.lockedAt = 0
      }
    })
    this.state.computers.forEach((computer) => {
      if (computer.connectedUser.has(client.sessionId)) {
        computer.connectedUser.delete(client.sessionId)
      }
    })
    this.state.whiteboards.forEach((whiteboard) => {
      if (whiteboard.connectedUser.has(client.sessionId)) {
        whiteboard.connectedUser.delete(client.sessionId)
      }
    })
  }

  onDispose() {
    this.state.whiteboards.forEach((whiteboard) => {
      if (whiteboardRoomIds.has(whiteboard.roomId)) whiteboardRoomIds.delete(whiteboard.roomId)
    })

    console.log('room', this.roomId, 'disposing...')
    this.dispatcher.stop()
  }
}
