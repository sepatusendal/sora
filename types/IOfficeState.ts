import { Schema, ArraySchema, SetSchema, MapSchema } from '@colyseus/schema'

export interface IPlayer extends Schema {
  name: string
  x: number
  y: number
  anim: string
  readyToConnect: boolean
  videoConnected: boolean
}

export interface IComputer extends Schema {
  connectedUser: SetSchema<string>
}

export interface IWhiteboard extends Schema {
  roomId: string
  connectedUser: SetSchema<string>
}

export interface IChatMessage extends Schema {
  author: string
  createdAt: number
  content: string
}

export interface IMediaZone extends Schema {
  label: string
  mediaType: string // '' | 'youtube' | 'spotify'
  mediaId: string // youtube videoId or spotify uri
  isPlaying: boolean
  playbackTime: number // seconds, position at the moment of updatedAt
  updatedAt: number // server timestamp (ms) of last state change
  ownerName: string // name of the player who set the media
  locked: boolean // whether the room is currently locked (entry blocked)
  lockedBy: string // display name of the player who locked it
  lockedBySessionId: string // sessionId of the player who locked it
  lockedAt: number // server timestamp (ms) when it was locked
}

export interface IOfficeState extends Schema {
  players: MapSchema<IPlayer>
  computers: MapSchema<IComputer>
  whiteboards: MapSchema<IWhiteboard>
  chatMessages: ArraySchema<IChatMessage>
  mediaZones: MapSchema<IMediaZone>
}
