import fs from 'fs'
import http from 'http'
import https from 'https'
import os from 'os'
import path from 'path'
import express from 'express'
import cors from 'cors'
import { Server, LobbyRoom } from 'colyseus'
import { monitor } from '@colyseus/monitor'
import { RoomType } from '../types/Rooms'

// import socialRoutes from "@colyseus/social/express"

import { SkyOffice } from './rooms/SkyOffice'

const port = Number(process.env.PORT || 2567)
const app = express()

app.use(cors())
app.use(express.json())
// app.use(express.static('dist'))

// In dev, the client runs over HTTPS via vite-plugin-mkcert, so the browser
// requires wss:// here too (mixed-content). Reuse the same mkcert cert if present.
const mkcertDir = path.join(os.homedir(), '.vite-plugin-mkcert')
const certPath = path.join(mkcertDir, 'cert.pem')
const keyPath = path.join(mkcertDir, 'dev.pem')
const useHttps =
  process.env.NODE_ENV !== 'production' && fs.existsSync(certPath) && fs.existsSync(keyPath)

const server = useHttps
  ? https.createServer(
      { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
      app
    )
  : http.createServer(app)
const gameServer = new Server({
  server,
})

// register room handlers
gameServer.define(RoomType.LOBBY, LobbyRoom)
gameServer.define(RoomType.PUBLIC, SkyOffice, {
  name: 'Public Lobby',
  description: 'For making friends and familiarizing yourself with the controls',
  password: null,
  autoDispose: false,
})
gameServer.define(RoomType.CUSTOM, SkyOffice).enableRealtimeListing()

/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/server/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);

// register colyseus monitor AFTER registering your room handlers
app.use('/colyseus', monitor())

gameServer.listen(port)
console.log(`Listening on ${useHttps ? 'wss' : 'ws'}://localhost:${port}`)
