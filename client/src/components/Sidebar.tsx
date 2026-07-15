import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import InputBase from '@mui/material/InputBase'
import Button from '@mui/material/Button'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import EditIcon from '@mui/icons-material/Edit'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'

import Adam from '../images/login/Adam_login.png'
import Ash from '../images/login/Ash_login.png'
import Lucy from '../images/login/Lucy_login.png'
import Nancy from '../images/login/Nancy_login.png'

import { useAppSelector, useAppDispatch } from '../hooks'
import { toggleBackgroundMode } from '../stores/UserStore'
import { BackgroundMode } from '../../../types/BackgroundMode'
import { getColorByString } from '../util'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

const SIDEBAR_WIDTH = 300

const avatarOptions = [
  { name: 'adam', img: Adam },
  { name: 'ash', img: Ash },
  { name: 'lucy', img: Lucy },
  { name: 'nancy', img: Nancy },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [myName, setMyName] = useState('')
  const [myAvatar, setMyAvatar] = useState('adam')
  const [copied, setCopied] = useState(false)
  const [clock, setClock] = useState('')

  const dispatch = useAppDispatch()
  const backgroundMode = useAppSelector((state) => state.user.backgroundMode)
  const sessionId = useAppSelector((state) => state.user.sessionId)
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)
  const roomId = useAppSelector((state) => state.room.roomId)
  const roomName = useAppSelector((state) => state.room.roomName)
  const roomDescription = useAppSelector((state) => state.room.roomDescription)
  const mediaZones = useAppSelector((state) => state.media.zones)

  const game = phaserGame.scene.keys.game as Game | undefined

  // read my current name/avatar from the Phaser player when opening the sidebar
  useEffect(() => {
    if (open && game?.myPlayer) {
      setMyName(game.myPlayer.playerName.text)
      setMyAvatar(game.myPlayer.playerTexture)
    }
  }, [open, game])

  // WIB clock
  useEffect(() => {
    const format = () =>
      new Date().toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    setClock(format())
    const interval = window.setInterval(() => setClock(format()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    if (trimmed && game?.myPlayer) {
      game.myPlayer.setPlayerName(trimmed)
      setMyName(trimmed)
    }
    setEditingName(false)
  }

  const handleChangeAvatar = (texture: string) => {
    if (game?.myPlayer && texture !== myAvatar) {
      game.myPlayer.setPlayerTexture(texture)
      setMyAvatar(texture)
    }
  }

  const handleCopyRoomId = () => {
    navigator.clipboard?.writeText(roomId).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  const otherPlayers = Array.from(playerNameMap.entries())
  const activeMediaZones = Object.values(mediaZones).filter((zone) => zone.mediaType !== '')
  const myAvatarImg = avatarOptions.find((a) => a.name === myAvatar)?.img

  return (
    <>
      <ToggleButton $open={open}>
        <Tooltip title={open ? 'Tutup sidebar' : 'Buka sidebar'} placement="right">
          <IconButton onClick={() => setOpen(!open)} size="small">
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </Tooltip>
      </ToggleButton>

      <Container $open={open}>
        <SidebarHeader>
          <h2>SORA</h2>
          <Clock>{clock} WIB</Clock>
        </SidebarHeader>

        <Scrollable>
          {/* ---------- Profile ---------- */}
          <Section>
            <SectionTitle>
              <AccountCircleIcon fontSize="small" /> Profil
            </SectionTitle>
            <ProfileCard>
              <ProfileAvatar>
                {myAvatarImg ? (
                  <img src={myAvatarImg} alt={myAvatar} />
                ) : (
                  <Avatar>{myName.charAt(0)}</Avatar>
                )}
              </ProfileAvatar>
              <ProfileInfo>
                {editingName ? (
                  <NameEditRow>
                    <NameInput
                      autoFocus
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName()
                        if (e.key === 'Escape') setEditingName(false)
                        e.stopPropagation()
                      }}
                      placeholder="Nama baru…"
                    />
                    <Button size="small" variant="contained" onClick={handleSaveName}>
                      OK
                    </Button>
                  </NameEditRow>
                ) : (
                  <NameRow>
                    <PlayerName>{myName || 'Anonymous'}</PlayerName>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setNameInput(myName)
                        setEditingName(true)
                      }}
                    >
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                  </NameRow>
                )}
                <SessionId>ID: {sessionId}</SessionId>
              </ProfileInfo>
            </ProfileCard>
            <AvatarPicker>
              {avatarOptions.map((option) => (
                <AvatarOption
                  key={option.name}
                  $selected={option.name === myAvatar}
                  onClick={() => handleChangeAvatar(option.name)}
                >
                  <img src={option.img} alt={option.name} />
                </AvatarOption>
              ))}
            </AvatarPicker>
          </Section>

          {/* ---------- Room ---------- */}
          <Section>
            <SectionTitle>
              <MeetingRoomIcon fontSize="small" /> Room
            </SectionTitle>
            <RoomCard>
              <RoomTitleRow>
                <Avatar
                  sx={{ width: 28, height: 28, fontSize: 14 }}
                  style={{ background: getColorByString(roomName || 'M') }}
                >
                  {(roomName || 'M').charAt(0)}
                </Avatar>
                <RoomName>{roomName}</RoomName>
              </RoomTitleRow>
              {roomDescription && <RoomDescription>{roomDescription}</RoomDescription>}
              <RoomIdRow>
                <RoomIdText>{roomId}</RoomIdText>
                <Tooltip title={copied ? 'Copied!' : 'Copy room ID'}>
                  <IconButton size="small" onClick={handleCopyRoomId}>
                    {copied ? <CheckIcon fontSize="inherit" /> : <ContentCopyIcon fontSize="inherit" />}
                  </IconButton>
                </Tooltip>
              </RoomIdRow>
            </RoomCard>
          </Section>

          {/* ---------- Online players ---------- */}
          <Section>
            <SectionTitle>
              <PeopleAltIcon fontSize="small" /> Online ({otherPlayers.length + 1})
            </SectionTitle>
            <PlayerList>
              <PlayerRow>
                <Avatar
                  sx={{ width: 24, height: 24, fontSize: 12 }}
                  style={{ background: getColorByString(myName || 'Y') }}
                >
                  {(myName || 'Y').charAt(0)}
                </Avatar>
                <span>
                  {myName || 'Anonymous'} <You>(you)</You>
                </span>
              </PlayerRow>
              {otherPlayers.map(([id, name]) => (
                <PlayerRow key={id}>
                  <Avatar
                    sx={{ width: 24, height: 24, fontSize: 12 }}
                    style={{ background: getColorByString(name || '?') }}
                  >
                    {(name || '?').charAt(0)}
                  </Avatar>
                  <span>{name}</span>
                </PlayerRow>
              ))}
            </PlayerList>
          </Section>

          {/* ---------- Now playing ---------- */}
          <Section>
            <SectionTitle>
              <MusicNoteIcon fontSize="small" /> Now Playing
            </SectionTitle>
            {activeMediaZones.length === 0 ? (
              <MutedText>
                Belum ada media diputar. Masuk ke zona bertanda ♪ di map (Lounge, Meeting Room,
                CEO Room, Workspace) lalu tempel link YouTube/Spotify.
              </MutedText>
            ) : (
              activeMediaZones.map((zone) => (
                <MediaRow key={zone.id}>
                  <MediaBadge>{zone.mediaType === 'youtube' ? '▶' : '♪'}</MediaBadge>
                  <MediaInfo>
                    <MediaZoneName>
                      {zone.locked && '🔒 '}
                      {zone.label} {zone.isPlaying ? '· playing' : '· paused'}
                    </MediaZoneName>
                    {zone.ownerName && <MediaOwner>oleh {zone.ownerName}</MediaOwner>}
                  </MediaInfo>
                </MediaRow>
              ))
            )}
          </Section>

          {/* ---------- Controls ---------- */}
          <Section>
            <SectionTitle>
              <SportsEsportsIcon fontSize="small" /> Kontrol
            </SectionTitle>
            <ControlList>
              <li>
                <strong>W, A, S, D / panah</strong> — jalan
              </li>
              <li>
                <strong>E</strong> — duduk (di depan kursi)
              </li>
              <li>
                <strong>R</strong> — pakai komputer / whiteboard
              </li>
              <li>
                <strong>Enter</strong> — buka chat, <strong>ESC</strong> — tutup
              </li>
              <li>Video call otomatis nyala kalau dekat pemain lain</li>
              <li>Pintu ruangan otomatis kebuka kalau kamu mendekat</li>
              <li>
                Masuk ke Meeting Room / CEO Room lalu kunci ruangan dari panel media di
                kanan-bawah
              </li>
            </ControlList>
          </Section>
        </Scrollable>

        <SidebarFooter>
          <Tooltip title="Ganti tema background">
            <IconButton size="small" onClick={() => dispatch(toggleBackgroundMode())}>
              {backgroundMode === BackgroundMode.DAY ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
          <FooterText>SORA · Wiraraja Inovasi</FooterText>
        </SidebarFooter>
      </Container>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                               */
/* ------------------------------------------------------------------ */

const Container = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: ${SIDEBAR_WIDTH}px;
  background: #1c1f2ef2;
  color: #eee;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px #00000066;
  transform: translateX(${(props) => (props.$open ? '0' : `-${SIDEBAR_WIDTH}px`)});
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 40;
`

const ToggleButton = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 14px;
  left: ${(props) => (props.$open ? `${SIDEBAR_WIDTH + 10}px` : '10px')};
  transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 41;

  button {
    background: #222639;
    color: #eee;
    box-shadow: 0px 0px 5px #0000006f;

    &:hover {
      background: #333954;
      color: #1ea2df;
    }
  }
`

const SidebarHeader = styled.div`
  padding: 16px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  background: #222639;

  h2 {
    font-size: 18px;
    color: #eee;
  }
`

const Clock = styled.div`
  font-size: 12px;
  color: #1ea2df;
  font-variant-numeric: tabular-nums;
`

const Scrollable = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #33395480;
    border-radius: 3px;
  }
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8f95ad;

  svg {
    color: #1ea2df;
  }
`

const ProfileCard = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  background: #222639;
  border-radius: 12px;
  padding: 10px;
`

const ProfileAvatar = styled.div`
  width: 44px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbdbe0;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 38px;
    height: 54px;
    object-fit: contain;
  }
`

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  button {
    color: #8f95ad;
  }
`

const NameEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const NameInput = styled(InputBase)`
  && {
    background: #333954;
    border-radius: 6px;
    padding: 2px 8px;
    color: #eee;
    font-size: 13px;
    flex: 1;
  }
`

const PlayerName = styled.div`
  font-size: 15px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SessionId = styled.div`
  font-size: 11px;
  color: #8f95ad;
`

const AvatarPicker = styled.div`
  display: flex;
  gap: 8px;
`

const AvatarOption = styled.div<{ $selected: boolean }>`
  width: 44px;
  height: 56px;
  border-radius: 8px;
  background: #dbdbe0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid ${(props) => (props.$selected ? '#1ea2df' : 'transparent')};
  opacity: ${(props) => (props.$selected ? 1 : 0.6)};
  transition: all 0.2s;

  &:hover {
    opacity: 1;
  }

  img {
    width: 30px;
    height: 44px;
    object-fit: contain;
  }
`

const RoomCard = styled.div`
  background: #222639;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RoomTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const RoomName = styled.div`
  font-size: 15px;
  font-weight: bold;
  overflow-wrap: anywhere;
`

const RoomDescription = styled.div`
  font-size: 12px;
  color: #c2c2c2;
  overflow-wrap: anywhere;
`

const RoomIdRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  button {
    color: #8f95ad;
  }
`

const RoomIdText = styled.div`
  font-size: 11px;
  color: #8f95ad;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`

const You = styled.span`
  color: #8f95ad;
  font-size: 11px;
`

const MutedText = styled.div`
  font-size: 12px;
  color: #8f95ad;
  line-height: 1.5;
`

const MediaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #222639;
  border-radius: 8px;
  padding: 8px;
`

const MediaBadge = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: #1ea2df33;
  color: #1ea2df;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
`

const MediaInfo = styled.div`
  min-width: 0;
`

const MediaZoneName = styled.div`
  font-size: 13px;
`

const MediaOwner = styled.div`
  font-size: 11px;
  color: #8f95ad;
`

const ControlList = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #c2c2c2;
  line-height: 1.7;
`

const SidebarFooter = styled.div`
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #222639;

  button {
    color: #eee;
  }
`

const FooterText = styled.div`
  font-size: 11px;
  color: #8f95ad;
`
