// explicit values so inserting/reordering an entry never silently reassigns
// another message's wire ID (matters during a rolling deploy where old/new
// clients briefly coexist) — always add new entries at the end with the next number
export enum Message {
  UPDATE_PLAYER = 0,
  UPDATE_PLAYER_NAME = 1,
  READY_TO_CONNECT = 2,
  DISCONNECT_STREAM = 3,
  CONNECT_TO_COMPUTER = 4,
  DISCONNECT_FROM_COMPUTER = 5,
  STOP_SCREEN_SHARE = 6,
  CONNECT_TO_WHITEBOARD = 7,
  DISCONNECT_FROM_WHITEBOARD = 8,
  VIDEO_CONNECTED = 9,
  ADD_CHAT_MESSAGE = 10,
  SEND_ROOM_DATA = 11,
  MEDIA_SET = 12,
  MEDIA_PLAY = 13,
  MEDIA_PAUSE = 14,
  MEDIA_SEEK = 15,
  MEDIA_STOP = 16,
  LOCK_ZONE = 17,
  UNLOCK_ZONE = 18,
}
