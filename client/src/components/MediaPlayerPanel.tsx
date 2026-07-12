import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import InputBase from '@mui/material/InputBase'
import Tooltip from '@mui/material/Tooltip'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import SyncIcon from '@mui/icons-material/Sync'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'

import { useAppSelector } from '../hooks'
import { MediaZoneInfo, getExpectedMediaTime } from '../stores/MediaStore'
import { mediaZoneConfigs } from '../config/mediaZones'
import { phaserEvents, Event } from '../events/EventCenter'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

/* ------------------------------------------------------------------ */
/* External player API loaders (loaded once, lazily)                   */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
    onSpotifyIframeApiReady?: (api: any) => void
  }
}

let youTubeApiPromise: Promise<any> | null = null
function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!youTubeApiPromise) {
    youTubeApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(window.YT)
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    })
  }
  return youTubeApiPromise
}

let spotifyApiPromise: Promise<any> | null = null
function loadSpotifyApi(): Promise<any> {
  if (!spotifyApiPromise) {
    spotifyApiPromise = new Promise((resolve) => {
      window.onSpotifyIframeApiReady = (api: any) => resolve(api)
      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      document.head.appendChild(script)
    })
  }
  return spotifyApiPromise
}

/* ------------------------------------------------------------------ */
/* URL parsing                                                          */
/* ------------------------------------------------------------------ */

export function parseMediaUrl(
  input: string
): { type: 'youtube' | 'spotify'; id: string } | null {
  const str = input.trim()
  if (!str) return null

  const yt = str.match(
    /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/
  )
  if (yt) return { type: 'youtube', id: yt[1] }
  if (/^[\w-]{11}$/.test(str) && !str.includes('.')) return { type: 'youtube', id: str }

  const sp = str.match(
    /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/
  )
  if (sp) return { type: 'spotify', id: `spotify:${sp[1]}:${sp[2]}` }
  const spUri = str.match(/^spotify:(track|album|playlist|episode):([A-Za-z0-9]+)$/)
  if (spUri) return { type: 'spotify', id: str }

  return null
}

/* ------------------------------------------------------------------ */
/* Player controller handle shared with the parent panel               */
/* ------------------------------------------------------------------ */

export interface MediaPlayerHandle {
  getCurrentTime: () => number
  forceSync: () => void
}

/* ------------------------------------------------------------------ */
/* YouTube synced player                                                */
/* ------------------------------------------------------------------ */

const DRIFT_TOLERANCE = 1.5 // seconds

function YouTubeSyncPlayer({
  zone,
  handleRef,
}: {
  zone: MediaZoneInfo
  handleRef: React.MutableRefObject<MediaPlayerHandle | null>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const readyRef = useRef(false)
  const zoneRef = useRef(zone)
  zoneRef.current = zone

  const syncNow = useCallback(() => {
    const player = playerRef.current
    if (!player || !readyRef.current) return
    const z = zoneRef.current
    const expected = getExpectedMediaTime(z)
    try {
      const currentId = player.getVideoData?.()?.video_id
      if (currentId !== z.mediaId) {
        player.loadVideoById(z.mediaId, expected)
      } else {
        const current = player.getCurrentTime?.() ?? 0
        if (Math.abs(current - expected) > DRIFT_TOLERANCE) {
          player.seekTo(expected, true)
        }
      }
      if (z.isPlaying) {
        player.playVideo?.()
      } else {
        player.pauseVideo?.()
      }
    } catch (error) {
      console.error('YouTube sync error:', error)
    }
  }, [])

  // create the player once
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new YT.Player(containerRef.current, {
        width: '304',
        height: '171',
        videoId: zoneRef.current.mediaId,
        playerVars: {
          autoplay: zoneRef.current.isPlaying ? 1 : 0,
          playsinline: 1,
          start: Math.max(0, Math.floor(getExpectedMediaTime(zoneRef.current))),
        },
        events: {
          onReady: () => {
            readyRef.current = true
            syncNow()
          },
        },
      })
    })
    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy?.()
      } catch {}
      playerRef.current = null
      readyRef.current = false
    }
  }, [syncNow])

  // resync whenever the shared zone state changes
  useEffect(() => {
    syncNow()
  }, [zone.mediaId, zone.isPlaying, zone.playbackTime, zone.receivedAt, syncNow])

  // periodic drift correction while playing
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (zoneRef.current.isPlaying) syncNow()
    }, 7000)
    return () => window.clearInterval(interval)
  }, [syncNow])

  // proximity volume (ratio 1 = zone center)
  useEffect(() => {
    const onDistance = (ratio: number) => {
      try {
        playerRef.current?.setVolume?.(Math.round(35 + 65 * ratio))
      } catch {}
    }
    phaserEvents.on(Event.MEDIA_DISTANCE, onDistance)
    return () => {
      phaserEvents.off(Event.MEDIA_DISTANCE, onDistance)
    }
  }, [])

  // expose controls to parent
  useEffect(() => {
    handleRef.current = {
      getCurrentTime: () => {
        try {
          const t = playerRef.current?.getCurrentTime?.()
          if (typeof t === 'number' && t >= 0) return t
        } catch {}
        return getExpectedMediaTime(zoneRef.current)
      },
      forceSync: syncNow,
    }
    return () => {
      handleRef.current = null
    }
  }, [handleRef, syncNow])

  return (
    <VideoFrame>
      <div ref={containerRef} />
    </VideoFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Spotify synced player (Spotify iFrame API)                           */
/* ------------------------------------------------------------------ */

function SpotifySyncPlayer({
  zone,
  handleRef,
}: {
  zone: MediaZoneInfo
  handleRef: React.MutableRefObject<MediaPlayerHandle | null>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<any>(null)
  const readyRef = useRef(false)
  const positionRef = useRef(0)
  const loadedUriRef = useRef('')
  const zoneRef = useRef(zone)
  zoneRef.current = zone

  const syncNow = useCallback(() => {
    const controller = controllerRef.current
    if (!controller || !readyRef.current) return
    const z = zoneRef.current
    const expected = getExpectedMediaTime(z)
    try {
      if (loadedUriRef.current !== z.mediaId) {
        loadedUriRef.current = z.mediaId
        controller.loadUri(z.mediaId)
      }
      if (Math.abs(positionRef.current - expected) > 3) {
        controller.seek(Math.max(0, Math.floor(expected)))
      }
      if (z.isPlaying) {
        controller.play()
      } else {
        controller.pause()
      }
    } catch (error) {
      console.error('Spotify sync error:', error)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let controller: any = null
    loadSpotifyApi().then((api) => {
      if (cancelled || !containerRef.current) return
      api.createController(
        containerRef.current,
        {
          uri: zoneRef.current.mediaId,
          width: '100%',
          height: 90,
        },
        (embedController: any) => {
          controller = embedController
          controllerRef.current = embedController
          loadedUriRef.current = zoneRef.current.mediaId
          embedController.addListener('ready', () => {
            readyRef.current = true
            syncNow()
          })
          embedController.addListener('playback_update', (e: any) => {
            if (typeof e?.data?.position === 'number') {
              positionRef.current = e.data.position / 1000
            }
          })
        }
      )
    })
    return () => {
      cancelled = true
      try {
        controller?.destroy?.()
      } catch {}
      controllerRef.current = null
      readyRef.current = false
    }
  }, [syncNow])

  useEffect(() => {
    syncNow()
  }, [zone.mediaId, zone.isPlaying, zone.playbackTime, zone.receivedAt, syncNow])

  useEffect(() => {
    handleRef.current = {
      getCurrentTime: () =>
        positionRef.current > 0 ? positionRef.current : getExpectedMediaTime(zoneRef.current),
      forceSync: syncNow,
    }
    return () => {
      handleRef.current = null
    }
  }, [handleRef, syncNow])

  return (
    <>
      <SpotifyFrame ref={containerRef} />
      <Caveat>
        Full track butuh login Spotify di browser — tanpa login hanya preview 30 detik.
      </Caveat>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Main panel                                                           */
/* ------------------------------------------------------------------ */

export default function MediaPlayerPanel() {
  const zones = useAppSelector((state) => state.media.zones)
  const currentZoneId = useAppSelector((state) => state.media.currentZoneId)
  const [urlInput, setUrlInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const playerHandleRef = useRef<MediaPlayerHandle | null>(null)

  if (!currentZoneId) return null
  const zone = zones[currentZoneId]
  if (!zone) return null

  const game = phaserGame.scene.keys.game as Game | undefined
  const network = game?.network
  if (!network) return null

  const hasMedia = zone.mediaType === 'youtube' || zone.mediaType === 'spotify'
  const isLockable = mediaZoneConfigs.find((z) => z.id === zone.id)?.lockable ?? false

  const handleSetMedia = () => {
    const parsed = parseMediaUrl(urlInput)
    if (!parsed) {
      setInputError('Link tidak dikenali. Pakai link YouTube atau Spotify.')
      return
    }
    setInputError('')
    setUrlInput('')
    network.setZoneMedia(zone.id, parsed.type, parsed.id)
  }

  const handlePlay = () => network.playZoneMedia(zone.id)
  const handlePause = () =>
    network.pauseZoneMedia(zone.id, playerHandleRef.current?.getCurrentTime())
  const handleStop = () => network.stopZoneMedia(zone.id)
  const handleSync = () => playerHandleRef.current?.forceSync()
  const handleLock = () => network.lockZone(zone.id)
  const handleUnlock = () => network.unlockZone(zone.id)

  return (
    <Backdrop>
      <Header>
        <MusicNoteIcon fontSize="small" />
        <HeaderTitle>{zone.label}</HeaderTitle>
        <IconButton size="small" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>
      </Header>

      {!collapsed && (
        <Content>
          {isLockable && (
            <LockRow>
              {zone.locked ? (
                <>
                  <LockedText>
                    <LockIcon fontSize="inherit" /> Dikunci oleh {zone.lockedBy || 'seseorang'}
                  </LockedText>
                  <Button size="small" variant="outlined" onClick={handleUnlock}>
                    Buka Kunci
                  </Button>
                </>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LockOpenIcon fontSize="small" />}
                  onClick={handleLock}
                >
                  Kunci Ruangan
                </Button>
              )}
            </LockRow>
          )}
          {hasMedia ? (
            <>
              {zone.mediaType === 'youtube' ? (
                <YouTubeSyncPlayer zone={zone} handleRef={playerHandleRef} />
              ) : (
                <SpotifySyncPlayer zone={zone} handleRef={playerHandleRef} />
              )}
              {zone.ownerName && <OwnerText>Diputar oleh {zone.ownerName}</OwnerText>}
              <Controls>
                {zone.isPlaying ? (
                  <Tooltip title="Pause untuk semua">
                    <IconButton size="small" onClick={handlePause}>
                      <PauseIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Play untuk semua">
                    <IconButton size="small" onClick={handlePlay}>
                      <PlayArrowIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Stop & clear untuk semua">
                  <IconButton size="small" onClick={handleStop}>
                    <StopIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Sync ulang (hanya untukku)">
                  <IconButton size="small" onClick={handleSync}>
                    <SyncIcon />
                  </IconButton>
                </Tooltip>
              </Controls>
            </>
          ) : (
            <EmptyText>
              Belum ada media di zona ini. Tempel link YouTube atau Spotify untuk nonton/dengerin
              bareng semua orang di zona ini.
            </EmptyText>
          )}

          <InputRow>
            <StyledInput
              placeholder="Link YouTube / Spotify…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSetMedia()
                e.stopPropagation()
              }}
              fullWidth
            />
            <Button size="small" variant="contained" onClick={handleSetMedia}>
              Putar
            </Button>
          </InputRow>
          {inputError && <ErrorText>{inputError}</ErrorText>}
        </Content>
      )}
    </Backdrop>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const Backdrop = styled.div`
  position: fixed;
  /* Anchored to the bottom so the panel grows upward, staying clear of the
     webcam video grid (top-right) and sitting just above HelperButtonGroup's
     button row (bottom: 16px, ~40px tall Fabs) instead of overlapping it. */
  bottom: 78px;
  right: 16px;
  width: 336px;
  max-height: calc(100vh - 100px);
  background: #222639ee;
  border-radius: 16px;
  box-shadow: 0px 0px 5px #0000006f;
  color: #eee;
  overflow: hidden;
  z-index: 30;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #1c1f2e;

  svg {
    color: #1ea2df;
  }

  button {
    color: #eee;
  }
`

const HeaderTitle = styled.div`
  flex: 1;
  font-weight: bold;
  font-size: 15px;
`

const Content = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const VideoFrame = styled.div`
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  display: flex;
  justify-content: center;

  iframe {
    display: block;
  }
`

const SpotifyFrame = styled.div`
  border-radius: 8px;
  overflow: hidden;
`

const OwnerText = styled.div`
  font-size: 12px;
  color: #c2c2c2;
`

const LockRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333954;

  button {
    color: #eee;
    border-color: #4a5170;
    white-space: nowrap;
  }
`

const LockedText = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #ffb26b;

  svg {
    font-size: 14px;
  }
`

const Controls = styled.div`
  display: flex;
  gap: 6px;

  button {
    color: #eee;
    background: #33395480;
  }
`

const EmptyText = styled.div`
  font-size: 13px;
  color: #c2c2c2;
  line-height: 1.5;
`

const Caveat = styled.div`
  font-size: 11px;
  color: #8f95ad;
  line-height: 1.4;
`

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const StyledInput = styled(InputBase)`
  && {
    background: #333954;
    border-radius: 8px;
    padding: 4px 10px;
    color: #eee;
    font-size: 13px;
  }
`

const ErrorText = styled.div`
  font-size: 12px;
  color: #ff7e50;
`
