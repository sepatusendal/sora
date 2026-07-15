export enum RoomType {
  LOBBY = 'lobby',
  PUBLIC = 'sora',
  CUSTOM = 'custom',
}

export interface IRoomData {
  name: string
  description: string
  password: string | null
  autoDispose: boolean
}
