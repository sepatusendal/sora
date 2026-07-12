import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface MediaZoneInfo {
  id: string
  label: string
  mediaType: string // '' | 'youtube' | 'spotify'
  mediaId: string
  isPlaying: boolean
  playbackTime: number // playhead (seconds) at the moment this update was received
  updatedAt: number // server timestamp of the last change (informational)
  receivedAt: number // local Date.now() when this update arrived (used for live position)
  ownerName: string
  locked: boolean // whether the room is currently locked (entry blocked)
  lockedBy: string // display name of the player who locked it
  lockedBySessionId: string // sessionId of the player who locked it
  lockedAt: number // server timestamp (ms) when it was locked
}

/**
 * Live playhead position of a zone.
 * Uses receivedAt (local clock) instead of the server clock so client/server
 * clock skew doesn't matter — only network latency (tens of ms) remains.
 */
export function getExpectedMediaTime(zone: MediaZoneInfo) {
  if (!zone.isPlaying) return zone.playbackTime
  return zone.playbackTime + (Date.now() - zone.receivedAt) / 1000
}

interface MediaState {
  zones: { [id: string]: MediaZoneInfo }
  currentZoneId: string | null
}

const initialState: MediaState = {
  zones: {},
  currentZoneId: null,
}

export const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    updateMediaZone: (state, action: PayloadAction<MediaZoneInfo>) => {
      state.zones[action.payload.id] = action.payload
    },
    setCurrentMediaZone: (state, action: PayloadAction<string | null>) => {
      state.currentZoneId = action.payload
    },
  },
})

export const { updateMediaZone, setCurrentMediaZone } = mediaSlice.actions

export default mediaSlice.reducer
