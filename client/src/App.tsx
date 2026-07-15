import React, { Suspense, lazy } from 'react'
import styled from 'styled-components'

import { useAppSelector } from './hooks'

import RoomSelectionDialog from './components/RoomSelectionDialog'
import LoginDialog from './components/LoginDialog'
import VideoConnectionDialog from './components/VideoConnectionDialog'
import Chat from './components/Chat'
import HelperButtonGroup from './components/HelperButtonGroup'
import MobileVirtualJoystick from './components/MobileVirtualJoystick'
import Sidebar from './components/Sidebar'

// MUI-heavy dialogs not needed for first paint — split into their own
// chunks so the initial bundle only pays for what a fresh visitor actually
// sees (login/room-selection), not every dialog in the app
const ComputerDialog = lazy(() => import('./components/ComputerDialog'))
const WhiteboardDialog = lazy(() => import('./components/WhiteboardDialog'))
const MediaPlayerPanel = lazy(() => import('./components/MediaPlayerPanel'))

const Backdrop = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
`

function App() {
  const loggedIn = useAppSelector((state) => state.user.loggedIn)
  const computerDialogOpen = useAppSelector((state) => state.computer.computerDialogOpen)
  const whiteboardDialogOpen = useAppSelector((state) => state.whiteboard.whiteboardDialogOpen)
  const videoConnected = useAppSelector((state) => state.user.videoConnected)
  const roomJoined = useAppSelector((state) => state.room.roomJoined)

  let ui: JSX.Element
  if (loggedIn) {
    if (computerDialogOpen) {
      /* Render ComputerDialog if user is using a computer. */
      ui = (
        <Suspense fallback={null}>
          <ComputerDialog />
        </Suspense>
      )
    } else if (whiteboardDialogOpen) {
      /* Render WhiteboardDialog if user is using a whiteboard. */
      ui = (
        <Suspense fallback={null}>
          <WhiteboardDialog />
        </Suspense>
      )
    } else {
      ui = (
        /* Render Chat or VideoConnectionDialog if no dialogs are opened. */
        <>
          <Chat />
          {/* Render VideoConnectionDialog if user is not connected to a webcam. */}
          {!videoConnected && <VideoConnectionDialog />}
          <MobileVirtualJoystick />
        </>
      )
    }
  } else if (roomJoined) {
    /* Render LoginDialog if not logged in but selected a room. */
    ui = <LoginDialog />
  } else {
    /* Render RoomSelectionDialog if yet selected a room. */
    ui = <RoomSelectionDialog />
  }

  return (
    <Backdrop>
      {ui}
      {/* Sidebar — always mounted when logged in so the toggle button is always visible */}
      {loggedIn && <Sidebar />}
      {/* MediaPlayerPanel — only renders when player is inside a media zone */}
      {loggedIn && (
        <Suspense fallback={null}>
          <MediaPlayerPanel />
        </Suspense>
      )}
      {/* HelperButtonGroup — hide when a full-screen dialog is open */}
      {!computerDialogOpen && !whiteboardDialogOpen && <HelperButtonGroup />}
    </Backdrop>
  )
}

export default App
