import React, { useState } from 'react'
import logo from '../images/logo.png'
import styled, { keyframes } from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

import { CustomRoomTable } from './CustomRoomTable'
import { CreateRoomForm } from './CreateRoomForm'
import { useAppSelector } from '../hooks'

import phaserGame from '../PhaserGame'
import Bootstrap from '../scenes/Bootstrap'

const PIXEL_FONT = "'Press Start 2P', monospace"

// arcade-cabinet palette: black cabinet, yellow trim, red action button
const COLOR_BLACK = '#0d0a05'
const COLOR_YELLOW = '#ffd23f'
const COLOR_YELLOW_DIM = '#8a6d1a'
const COLOR_RED = '#d7263d'
const COLOR_RED_DARK = '#7a121f'

const float = keyframes`
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -12px); }
`

const glow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 8px rgba(255, 210, 63, 0.4)); }
  50% { filter: drop-shadow(0 0 22px rgba(255, 210, 63, 0.9)); }
`

const blink = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
`

const boxPulse = keyframes`
  0%, 100% {
    box-shadow: inset -6px -6px 0 0 #000, inset 6px 6px 0 0 ${COLOR_YELLOW_DIM},
      0 0 0 5px ${COLOR_YELLOW}, 0 0 0 9px #000;
  }
  50% {
    box-shadow: inset -6px -6px 0 0 #000, inset 6px 6px 0 0 ${COLOR_YELLOW_DIM},
      0 0 0 5px #fff2b0, 0 0 0 9px #000;
  }
`

const boxBreathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.012); }
`

const arrowBounce = keyframes`
  0%, 100% { transform: translate(0, -50%); }
  50% { transform: translate(-4px, -50%); }
`

// classic RPG-dialogue-box notch: chops a small staircase off each corner
// instead of rounding them, which reads as "pixel" the way border-radius never does
const pixelNotch = (size: number) => `
  clip-path: polygon(
    ${size}px 0, calc(100% - ${size}px) 0, 100% ${size}px, 100% calc(100% - ${size}px),
    calc(100% - ${size}px) 100%, ${size}px 100%, 0 calc(100% - ${size}px), 0 ${size}px
  );
`

const FloatingLogo = styled.img`
  position: fixed;
  z-index: 1;
  top: 10%;
  left: 50%;
  transform: translate(-50%, 0);
  width: min(52vw, 520px);
  pointer-events: none;
  animation: ${float} 3.6s ease-in-out infinite, ${glow} 3s ease-in-out infinite;
`

const Backdrop = styled.div`
  position: absolute;
  top: 68%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
`

const Wrapper = styled.div`
  position: relative;
  background: ${COLOR_BLACK};
  padding: 30px 46px;
  max-height: 70vh;
  overflow-y: auto;
  ${pixelNotch(12)}
  animation: ${boxPulse} 2.4s ease-in-out infinite, ${boxBreathe} 2.4s ease-in-out infinite;
`

const CustomRoomWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  justify-content: center;

  .tip {
    font-size: 18px;
  }
`

const TitleWrapper = styled.div`
  position: relative;
  display: grid;
  width: 100%;
  padding-top: 6px;

  h1 {
    grid-column: 1;
    grid-row: 1;
    justify-self: center;
    align-self: center;
  }
`

const Title = styled.h1`
  font-family: ${PIXEL_FONT};
  font-size: 14px;
  line-height: 1.8;
  color: ${COLOR_YELLOW};
  text-align: center;
  text-shadow: 3px 3px 0 #000;
  letter-spacing: 1px;
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 18px 0 0;
  align-items: center;
  justify-content: center;
`

const PixelButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  position: relative;
  font-family: ${PIXEL_FONT};
  font-size: 11px;
  line-height: 1.7;
  color: ${(p) => (p.$variant === 'secondary' ? COLOR_YELLOW : '#fff')};
  background: ${(p) => (p.$variant === 'secondary' ? '#1a1408' : COLOR_RED)};
  border: none;
  padding: 14px 20px 14px 30px;
  cursor: pointer;
  letter-spacing: 0.5px;
  ${pixelNotch(8)}
  box-shadow: inset -4px -4px 0 0 rgba(0, 0, 0, 0.45),
    inset 4px 4px 0 0 rgba(255, 255, 255, 0.15),
    0 0 0 3px ${(p) => (p.$variant === 'secondary' ? COLOR_YELLOW_DIM : COLOR_RED_DARK)},
    0 4px 0 0 #000;
  transition: filter 0.06s ease, transform 0.06s ease, box-shadow 0.06s ease;

  /* classic RPG menu cursor: a little arrow that appears + bounces beside
     whichever option is "selected" (hovered), instead of a generic web hover */
  &::before {
    content: '▶';
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translate(-6px, -50%);
    color: ${COLOR_YELLOW};
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  &:hover {
    filter: brightness(1.2);
    background: ${(p) => (p.$variant === 'secondary' ? '#2a2210' : '#ef3b52')};
  }

  &:hover::before {
    opacity: 1;
    animation: ${arrowBounce} 0.6s ease-in-out infinite;
  }

  &:active {
    transform: translateY(4px);
    box-shadow: inset -4px -4px 0 0 rgba(0, 0, 0, 0.45),
      inset 4px 4px 0 0 rgba(255, 255, 255, 0.15),
      0 0 0 3px ${(p) => (p.$variant === 'secondary' ? COLOR_YELLOW_DIM : COLOR_RED_DARK)},
      0 0 0 0 #000;
  }
`

const BackButton = styled(PixelButton)`
  position: absolute;
  left: 0;
  top: 0;
  padding: 8px 12px;
  font-size: 13px;

  /* too small to fit the RPG-cursor arrow used on the bigger action buttons */
  &::before {
    content: none;
  }
`

const BlinkHint = styled.p`
  margin: -4px 0 0;
  font-family: ${PIXEL_FONT};
  font-size: 10px;
  letter-spacing: 1px;
  line-height: 1.8;
  color: ${COLOR_YELLOW};
  text-align: center;
  animation: ${blink} 1.8s ease-in-out infinite;
`

const ProgressBarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  h3 {
    font-family: ${PIXEL_FONT};
    font-size: 11px;
    font-weight: normal;
    color: ${COLOR_YELLOW};
    text-shadow: 2px 2px 0 #000;
  }
`

const ProgressBar = styled(LinearProgress)`
  width: 300px;
  height: 10px !important;
  border-radius: 0 !important;
  background-color: ${COLOR_BLACK} !important;
  box-shadow: 0 0 0 3px #000, 0 0 0 4px ${COLOR_YELLOW_DIM};

  .MuiLinearProgress-bar {
    border-radius: 0 !important;
    background-color: ${COLOR_RED} !important;
  }
`

export default function RoomSelectionDialog() {
  const [showCustomRoom, setShowCustomRoom] = useState(false)
  const [showCreateRoomForm, setShowCreateRoomForm] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)
  const lobbyJoined = useAppSelector((state) => state.room.lobbyJoined)

  const handleConnect = () => {
    if (lobbyJoined) {
      const bootstrap = phaserGame.scene.keys.bootstrap as Bootstrap
      bootstrap.network
        .joinOrCreatePublic()
        .then(() => bootstrap.launchGame())
        .catch((error) => console.error(error))
    } else {
      setShowSnackbar(true)
    }
  }

  return (
    <>
      <FloatingLogo src={logo} alt="SORA" />
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => {
          setShowSnackbar(false)
        }}
      >
        <Alert
          severity="error"
          variant="outlined"
          // overwrites the dark theme on render
          style={{ background: '#fdeded', color: '#7d4747' }}
        >
          Trying to connect to server, please try again!
        </Alert>
      </Snackbar>
      <Backdrop>
        <Wrapper>
          {showCreateRoomForm ? (
            <CustomRoomWrapper>
              <TitleWrapper>
                <BackButton onClick={() => setShowCreateRoomForm(false)}>‹</BackButton>
                <Title>Create Custom Room</Title>
              </TitleWrapper>
              <CreateRoomForm />
            </CustomRoomWrapper>
          ) : showCustomRoom ? (
            <CustomRoomWrapper>
              <TitleWrapper>
                <BackButton onClick={() => setShowCustomRoom(false)}>‹</BackButton>
                <Title>
                  Custom Rooms
                  <Tooltip
                    title="We update the results in realtime, no refresh needed!"
                    placement="top"
                  >
                    <IconButton>
                      <HelpOutlineIcon className="tip" style={{ color: COLOR_YELLOW }} />
                    </IconButton>
                  </Tooltip>
                </Title>
              </TitleWrapper>
              <CustomRoomTable />
              <PixelButton onClick={() => setShowCreateRoomForm(true)}>Create new room</PixelButton>
            </CustomRoomWrapper>
          ) : (
            <>
              <Title>Welcome to SORA</Title>
              <Content>
                <PixelButton onClick={handleConnect}>Connect to public lobby</PixelButton>
                <PixelButton
                  $variant="secondary"
                  onClick={() => (lobbyJoined ? setShowCustomRoom(true) : setShowSnackbar(true))}
                >
                  Create/find custom rooms
                </PixelButton>
                <BlinkHint>build by sepatusendal</BlinkHint>
              </Content>
            </>
          )}
        </Wrapper>
        {!lobbyJoined && (
          <ProgressBarWrapper>
            <h3> Connecting to server...</h3>
            <ProgressBar color="secondary" />
          </ProgressBarWrapper>
        )}
      </Backdrop>
    </>
  )
}
