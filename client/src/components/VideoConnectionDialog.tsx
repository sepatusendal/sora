import React, { useState } from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

const Backdrop = styled.div`
  /* Floats top-center instead of covering the top-left corner, so it never
     sits underneath the Sidebar (which occupies the full-height left edge,
     z-index 40, when open). pointer-events: none so it doesn't swallow
     clicks over the rest of the screen — only the card itself re-enables them. */
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  pointer-events: none;
  display: flex;
  justify-content: center;
`

const Wrapper = styled.div`
  width: 320px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #222639ee;
  border-radius: 16px;
  box-shadow: 0px 0px 5px #0000006f;
  pointer-events: auto;
`

export default function VideoConnectionDialog() {
  const [connectionWarning, setConnectionWarning] = useState(true)
  return (
    <Backdrop>
      <Wrapper>
        {connectionWarning && (
          <Alert
            severity="warning"
            onClose={() => {
              setConnectionWarning(!connectionWarning)
            }}
          >
            <AlertTitle>Warning</AlertTitle>
            No webcam connected
            <br /> <strong>connect one for full experience!</strong>
          </Alert>
        )}
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            const game = phaserGame.scene.keys.game as Game
            game.network.webRTC?.getUserMedia()
          }}
        >
          Connect Webcam
        </Button>
      </Wrapper>
    </Backdrop>
  )
}
