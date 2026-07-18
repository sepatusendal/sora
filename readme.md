# 🌌 SORA ![License](https://img.shields.io/badge/license-MIT-blue) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg) ![Vibes](https://img.shields.io/badge/vibes-immaculate-ff69b4)

<img alt="Logo" align="right" src="https://i.ibb.co.com/21BNRkZZ/Chat-GPT-Image-Jul-14-2026-10-38-53-PM.png" width="20%" />

Welcome to **SORA** — a little virtual world where you can work, meet, gossip, and scribble on a whiteboard with your team without ever putting on real pants. 👖❌

Heads up: this is just a side project / hobby build, not some polished commercial thing. Made mostly out of boredom and "what if video calls but weirder" energy.

Instead of another boring video-call grid, this is a small world you can actually walk around in. Your avatar moves, you get close to someone, boom, instant call, no "can you hear me?" moment. Feels like a game, but somehow work still gets done. 🌌

The whole point was just to make a workspace that feels a bit more alive than staring at a grid of tiny rectangles. A little world to walk around, chat nonsense in, and somehow still be productive in. ✨

- 📦 Source code (fork it if you want, just don't fork with anyone's feelings): [GitHub](https://github.com/sepatusendal/sora)

> ⚠️ **Disclaimer (kind of serious):** SORA runs smoothest on PC/laptop browsers. If you open it on mobile and everything breaks, that's not a bug, that's SORA testing your loyalty. Get back on your laptop, please. 🙏📱❌

## 🛠️ Built with

- [Phaser3](https://github.com/photonstorm/phaser) — the game engine keeping SORA alive
- [Colyseus](https://github.com/colyseus/colyseus) — WebSocket server framework, so everyone connects real-time with zero loading drama
- [React/Redux](https://github.com/facebook/react) — front-end, keeping things looking tidy
- [PeerJS](https://github.com/peers/peerjs) — WebRTC for video calls & screen sharing
- [TypeScript](https://github.com/microsoft/TypeScript) & [ES6](https://github.com/eslint/eslint) — keeping the code clean, unlike your room

## ✨ Features that might make you never wanna leave your desk

- [Proximity Chat](#-proximity-chat-because-distance-matters)
- [Lightning Screen Sharing](#-lightning-screen-sharing)
- [Multi-Purpose Rooms](#-multi-purpose-rooms)
- [Text Chat with Real-Time Speech Bubbles](#-text-chat-with-real-time-speech-bubbles)
- [Custom/Private Rooms](#-customprivate-rooms)
- [Built-in Whiteboard](#-built-in-whiteboard)

### 🎧 Proximity Chat (because distance matters)

Walk up to someone's avatar, video call auto-starts. Walk away, the sound fades out kinda like your ex's replies. Basically your real friend group, just digital and slightly less messy. 😂

![image](https://user-images.githubusercontent.com/11501902/139960852-cf0e0883-8fbe-459d-bb11-3707d0ae1360.png)

### 🏢 Multi-Purpose Rooms

Serious meeting or just wanna hang out virtually? Just switch rooms, no big deal. No booking system, no "someone's already in this room" chaos, no group chat spam of "wait where are we meeting again??"

![image](https://user-images.githubusercontent.com/11501902/139961091-1801bd4d-fbd6-4400-8503-85ece744e979.png)

### 🖥️ Lightning Screen Sharing

Sit at your virtual desk, hit a button, screen's shared. Fast as lightning, fast as you pretending to look busy the second your boss walks by.

![image](https://user-images.githubusercontent.com/11501902/139961155-44a85cd9-ac25-4563-9d82-6537ed7435f6.png)

### 💬 Text Chat with Real-Time Speech Bubbles

Type something and a little bubble pops up over your avatar's head, like RPG dialogue, except it's just work stuff or group project scheming.

![image](https://user-images.githubusercontent.com/11501902/145925423-3b5b9026-d3b9-429d-920b-98b0bcd6300a.png)

### 🧑‍🎨 Built-in Whiteboard

Need to brainstorm, or just doodle nonsense while your brain's fried? The whiteboard's right there. Genius idea or a random stick figure, both equally welcome.

![image](https://user-images.githubusercontent.com/11501902/147785323-19dbf0e6-056d-44c5-8efe-e969297bbe52.png)

### 🔒 Custom/Private Rooms

Need a secret room to plan someone's surprise birthday, or just gossip without the whole office hearing? Say less. Private rooms got you, zero eavesdroppers allowed.

![image](https://user-images.githubusercontent.com/11501902/147784118-15ef50bf-0f67-4704-89d7-81b2fa7f8ceb.png)

## 🎮 Controls

| Key                       | Action                                                  |
| ------------------------- | -------------------------------------------------------- |
| `W, A, S, D` / arrow keys | Move around (video chat auto-starts near people)         |
| `E`                       | Sit down                                                 |
| `R`                       | Use the computer (for screen sharing)                    |
| `Enter`                   | Open chat                                                |
| `ESC`                     | Close chat                                               |

## 📋 Prerequisites

Grab [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) first. If you don't have 'em, install those before you `git clone` and start panic-googling errors at 2am. 😅

## 🚀 Getting Started

Clone this to your machine:

```bash
git clone https://github.com/sepatusendal/sora.git
```

This makes a folder called `sora`. Want a different name? Toss it at the end:

```bash
git clone https://github.com/sepatusendal/sora.git your-folder-name
```

**Run the server:**

```bash
cd sora  # or 'your-folder-name'
yarn && yarn start
```

**Run the client:**

```bash
cd sora/client  # or 'your-folder-name/client'
yarn && yarn dev
```

Once both are running, open your browser and there you go, you've got a little virtual world running. Invite some friends, or if you've got none handy, just wander around your own creation solo. No shame in that, self-love is important. 🌍💅

## 🎉 Credits

Maintained by **sepatusendal**, just some person who occasionally loses sleep over side projects.

Big thanks also to:

- [ourcade/phaser3-typescript-parcel-template](https://github.com/ourcade/phaser3-typescript-parcel-template) — the starter template that carried this whole thing
- [LimeZu](https://limezu.itch.io/) — the pixel artist making this world look this good

## 📜 License

This project is licensed under MIT, originally created by [Kuan-Hsuan Shen](https://github.com/kevinshen56714) through the original [SkyOffice](https://github.com/kevinshen56714/SkyOffice) project. SORA is a continuation of that work — respect to the one who started it. 🙏 Check the [LICENSE](./LICENSE) file for full details.
