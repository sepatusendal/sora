import fs from 'fs'
import http from 'http'
import https from 'https'
import os from 'os'
import path from 'path'
import express from 'express'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { Server, LobbyRoom } from 'colyseus'
import { monitor } from '@colyseus/monitor'
import { RoomType } from '../types/Rooms'

// import socialRoutes from "@colyseus/social/express"

import { Sora } from './rooms/Sora'

const port = Number(process.env.PORT || 2567)
const app = express()

app.use(cors())
app.use(express.json())
// matchmaking HTTP endpoints (colyseus registers these on `app`) and any REST
// surface get a basic per-IP cap; the WebSocket message rate is capped
// separately inside Sora.ts since this limiter doesn't see socket traffic
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
)
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
gameServer.define(RoomType.PUBLIC, Sora, {
  name: 'Public Lobby',
  description: 'For making friends and familiarizing yourself with the controls',
  password: null,
  autoDispose: false,
})
gameServer.define(RoomType.CUSTOM, Sora).enableRealtimeListing()

/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/server/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);

// register colyseus monitor AFTER registering your room handlers
// gated behind basic auth so live room state/session IDs aren't exposed to
// anyone who finds the URL; requires MONITOR_USERNAME/MONITOR_PASSWORD to be
// set, and is skipped entirely in production if they aren't
const monitorUser = process.env.MONITOR_USERNAME
const monitorPass = process.env.MONITOR_PASSWORD
if (monitorUser && monitorPass) {
  app.use('/colyseus', (req, res, next) => {
    const header = req.headers.authorization || ''
    const [scheme, encoded] = header.split(' ')
    const decoded = encoded ? Buffer.from(encoded, 'base64').toString() : ''
    const [user, pass] = decoded.split(':')
    if (scheme === 'Basic' && user === monitorUser && pass === monitorPass) {
      next()
      return
    }
    res.set('WWW-Authenticate', 'Basic realm="colyseus monitor"')
    res.status(401).send('Authentication required')
  })
  app.use('/colyseus', monitor())
} else if (process.env.NODE_ENV !== 'production') {
  console.warn(
    '[colyseus monitor] MONITOR_USERNAME/MONITOR_PASSWORD not set — mounting unauthenticated at /colyseus for local dev only. Set both env vars to enable it in production.'
  )
  app.use('/colyseus', monitor())
} else {
  console.warn(
    '[colyseus monitor] MONITOR_USERNAME/MONITOR_PASSWORD not set — skipping /colyseus monitor in production.'
  )
}

gameServer.listen(port)
console.log(`Listening on ${useHttps ? 'wss' : 'ws'}://localhost:${port}`)
