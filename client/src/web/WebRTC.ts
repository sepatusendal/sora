import Peer, { MediaConnection } from 'peerjs'
import Network from '../services/Network'
import store from '../stores'
import { setVideoConnected } from '../stores/UserStore'

const CALL_RETRY_DELAY_MS = 1500
const CALL_MAX_RETRIES = 3

export default class WebRTC {
  private myPeer: Peer
  private peers = new Map<string, { call: MediaConnection; video: HTMLVideoElement }>()
  private onCalledPeers = new Map<string, { call: MediaConnection; video: HTMLVideoElement }>()
  private videoGrid = document.querySelector('.video-grid')
  private buttonGrid = document.querySelector('.button-grid')
  private myVideo = document.createElement('video')
  private myStream?: MediaStream
  private network: Network
  private callRetries = new Map<string, number>()

  constructor(userId: string, network: Network) {
    const sanitizedId = this.replaceInvalidId(userId)
    this.myPeer = new Peer(sanitizedId)
    this.network = network
    console.log('userId:', userId)
    console.log('sanitizedId:', sanitizedId)
    this.myPeer.on('error', (err) => {
      console.log(err.type)
      console.error(err)

      // The callee's PeerJS connection may not have finished registering with the
      // signaling server yet when we tried to call them right after they joined -
      // remove our failed attempt and retry a few times before giving up.
      if (err.type === 'peer-unavailable') {
        const match = /peer (.+)$/.exec(err.message)
        const sanitizedId = match?.[1]
        if (sanitizedId) {
          this.peers.delete(sanitizedId)
          this.retryConnectToNewUser(sanitizedId)
        }
      }
    })

    // mute your own video stream (you don't want to hear yourself)
    this.myVideo.muted = true

    // config peerJS
    this.initialize()
  }

  // PeerJS throws invalid_id error if it contains some characters such as that colyseus generates.
  // https://peerjs.com/docs.html#peer-id
  private replaceInvalidId(userId: string) {
    return userId.replace(/[^0-9a-z]/gi, 'G')
  }

  initialize() {
    this.myPeer.on('call', (call) => {
      if (!this.onCalledPeers.has(call.peer)) {
        call.answer(this.myStream)
        const video = document.createElement('video')
        this.onCalledPeers.set(call.peer, { call, video })

        call.on('stream', (userVideoStream) => {
          this.addVideoStream(video, userVideoStream)
        })
      }
      // on close is triggered manually with deleteOnCalledVideoStream()
    })
  }

  getUserMedia(alertOnError = true) {
    // ask the browser to get user media
    navigator.mediaDevices
      ?.getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        this.myStream = stream
        this.addVideoStream(this.myVideo, this.myStream)
        this.setUpButtons()
        store.dispatch(setVideoConnected(true))
        this.network.videoConnected()
      })
      .catch(() => {
        if (alertOnError) window.alert('No webcam or microphone found, or permission is blocked')
      })
  }

  // method to call a peer
  connectToNewUser(userId: string) {
    const sanitizedId = this.replaceInvalidId(userId)
    this.callRetries.delete(sanitizedId)
    this.callPeer(sanitizedId)
  }

  private callPeer(sanitizedId: string) {
    if (!this.myStream || this.peers.has(sanitizedId)) return

    console.log('calling', sanitizedId)
    const call = this.myPeer.call(sanitizedId, this.myStream)
    const video = document.createElement('video')
    this.peers.set(sanitizedId, { call, video })

    call.on('stream', (userVideoStream) => {
      this.addVideoStream(video, userVideoStream)
    })

    // on close is triggered manually with deleteVideoStream()
  }

  private retryConnectToNewUser(sanitizedId: string) {
    const attempts = this.callRetries.get(sanitizedId) ?? 0
    if (attempts >= CALL_MAX_RETRIES) {
      this.callRetries.delete(sanitizedId)
      return
    }
    this.callRetries.set(sanitizedId, attempts + 1)

    setTimeout(() => this.callPeer(sanitizedId), CALL_RETRY_DELAY_MS)
  }

  // method to add new video stream to videoGrid div
  addVideoStream(video: HTMLVideoElement, stream: MediaStream) {
    video.srcObject = stream
    video.playsInline = true
    video.addEventListener('loadedmetadata', () => {
      video.play()
    })
    if (this.videoGrid) this.videoGrid.append(video)
  }

  // method to remove video stream (when we are the host of the call)
  deleteVideoStream(userId: string) {
    const sanitizedId = this.replaceInvalidId(userId)
    this.callRetries.delete(sanitizedId)
    if (this.peers.has(sanitizedId)) {
      const peer = this.peers.get(sanitizedId)
      peer?.call.close()
      peer?.video.remove()
      this.peers.delete(sanitizedId)
    }
  }

  // method to remove video stream (when we are the guest of the call)
  deleteOnCalledVideoStream(userId: string) {
    const sanitizedId = this.replaceInvalidId(userId)
    if (this.onCalledPeers.has(sanitizedId)) {
      const onCalledPeer = this.onCalledPeers.get(sanitizedId)
      onCalledPeer?.call.close()
      onCalledPeer?.video.remove()
      this.onCalledPeers.delete(sanitizedId)
    }
  }

  /**
   * Spatial audio: scales a specific peer's call volume (0-1), e.g. by
   * distance or locked-room isolation. The connection could be one we
   * initiated (`peers`) or one they initiated (`onCalledPeers`) — check
   * both, since only one will ever have this id.
   */
  setPeerVolume(userId: string, volume: number) {
    const sanitizedId = this.replaceInvalidId(userId)
    const clamped = Math.min(1, Math.max(0, volume))
    const video =
      this.peers.get(sanitizedId)?.video ?? this.onCalledPeers.get(sanitizedId)?.video
    if (video) video.volume = clamped
  }

  // method to set up mute/unmute and video on/off buttons
  setUpButtons() {
    const audioButton = document.createElement('button')
    audioButton.innerText = 'Mute'
    audioButton.addEventListener('click', () => {
      if (this.myStream) {
        const audioTrack = this.myStream.getAudioTracks()[0]
        if (audioTrack.enabled) {
          audioTrack.enabled = false
          audioButton.innerText = 'Unmute'
        } else {
          audioTrack.enabled = true
          audioButton.innerText = 'Mute'
        }
      }
    })
    const videoButton = document.createElement('button')
    videoButton.innerText = 'Video off'
    videoButton.addEventListener('click', () => {
      if (this.myStream) {
        const audioTrack = this.myStream.getVideoTracks()[0]
        if (audioTrack.enabled) {
          audioTrack.enabled = false
          videoButton.innerText = 'Video on'
        } else {
          audioTrack.enabled = true
          videoButton.innerText = 'Video off'
        }
      }
    })
    this.buttonGrid?.append(audioButton)
    this.buttonGrid?.append(videoButton)
  }
}
