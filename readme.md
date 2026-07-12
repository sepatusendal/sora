# 🌌 Meta Sora ![License](https://img.shields.io/badge/license-MIT-blue) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg) ![Vibes](https://img.shields.io/badge/vibes-immaculate-ff69b4) ![Maintainer](https://img.shields.io/badge/maintained%20by-sepatusendal-orange)

<img alt="Logo" align="right" src="https://user-images.githubusercontent.com/11501902/139942585-a6b044ce-3695-460a-91bd-dd9f1d4611c8.png" width="20%" />

Welcome to **Meta Sora** — the most extra virtual world out there, where you can work, meet, gossip, and doodle on a whiteboard with your friends without ever putting on real pants. 👖❌

This ain't just some "boxy video call website," bestie. This is a portal. This is a whole world. This is... _vibes_. You walk, your avatar walks. You get close to someone, boom, instant connection. Feels like a game but your actual work gets done. How is that not immersive? 🌌

Built on the solid foundation of the open-source [SkyOffice](https://github.com/kevinshen56714/SkyOffice) project (MIT licensed), then fully glow-upped by **Wira** (yes, that's me, a.k.a **sepatusendal**) into something more _immersive_, more "wow," and definitely more Sora-approved. Think of it as a reincarnation, but the upgraded version. ✨

- 🙌 Follow for memes & updates: [Instagram](https://www.instagram.com/wirarajaofficial)
- 📦 Source code (fork it, don't fork with anyone's heart though): [GitHub](https://github.com/sepatusendal/meta-sora)

> ⚠️ **Serious disclaimer (kinda):** Meta Sora currently runs smooth on PC browsers only. If you open it on mobile and everything looks busted, that's not a bug bestie, that's Meta Sora testing your loyalty. Get back on your laptop, please. 🙏📱❌

## 🛠️ Built with

- [Phaser3](https://github.com/photonstorm/phaser) - the game engine keeping Meta Sora alive
- [Colyseus](https://github.com/colyseus/colyseus) - WebSocket server framework, so everyone connects real-time with zero loading drama
- [React/Redux](https://github.com/facebook/react) - front-end framework, keeping things looking clean
- [PeerJS](https://github.com/peers/peerjs) - WebRTC for video calls & screen sharing
- [TypeScript](https://github.com/microsoft/TypeScript) & [ES6](https://github.com/eslint/eslint) - keeping the code tidy, unlike your dorm room

## ✨ Features that'll make you never wanna leave your room

- [Proximity Chat](#-proximity-chat-distance-based-talking)
- [Flexible Screen Sharing](#-flexible--lightning-fast-screen-sharing)
- [Multifunctional Rooms](#-multifunctional-rooms)
- [Text Chat with Real-Time Bubbles](#-text-chat-with-real-time-dialog-bubbles)
- [Custom/Private Rooms](#-customprivate-rooms)
- [Built-in Whiteboard](#-built-in-whiteboard) (embed of [WBO](https://github.com/lovasoa/whitebophir))

### 🎧 Proximity Chat (distance-based talking)

Get close to someone's avatar, video call auto-starts. Walk away a bit, and the sound fades out like your ex's replies. Basically your real-life friend group, but digital. 😂

![image](https://user-images.githubusercontent.com/11501902/139960852-cf0e0883-8fbe-459d-bb11-3707d0ae1360.png)

### 🏢 Multifunctional Rooms

Need a serious meeting or just wanna hang out virtually? Just switch rooms. No booking needed, no "someone's using the room" drama, no chaotic group chat spam of "wait where are we meeting again??"

![image](https://user-images.githubusercontent.com/11501902/139961091-1801bd4d-fbd6-4400-8503-85ece744e979.png)

### 🖥️ Flexible & Lightning-Fast Screen Sharing

Sit at your virtual computer, hit a button, screen's shared. Fast as lightning, fast as you pretending to look busy when your boss walks by.

![image](https://user-images.githubusercontent.com/11501902/139961155-44a85cd9-ac25-4563-9d82-6537ed7435f6.png)

### 💬 Text Chat with Real-Time Dialog Bubbles

Type something and a bubble pops up over your avatar's head, like an RPG game except the dialogue is actually work stuff or group project war planning.

![image](https://user-images.githubusercontent.com/11501902/145925423-3b5b9026-d3b9-429d-920b-98b0bcd6300a.png)

### 🧑‍🎨 Built-in Whiteboard

Need to brainstorm or scribble nonsense while stuck for ideas? Whiteboard's right there. Genius idea or a random stick figure, both equally welcome.

![image](https://user-images.githubusercontent.com/11501902/147785323-19dbf0e6-056d-44c5-8efe-e969297bbe52.png)

### 🔒 Custom/Private Rooms

Need a secret room to plan your boss's surprise birthday, or just gossip without the whole office hearing? Say less. Private rooms got you, no eavesdroppers allowed.

![image](https://user-images.githubusercontent.com/11501902/147784118-15ef50bf-0f67-4704-89d7-81b2fa7f8ceb.png)

## 🎮 Controls

| Key                       | Action                                                 |
| ------------------------- | ------------------------------------------------------ |
| `W, A, S, D` / arrow keys | Move (video chat auto-starts when you're near someone) |
| `E`                       | Sit down                                               |
| `R`                       | Use computer (for screen sharing)                      |
| `Enter`                   | Open chat                                              |
| `ESC`                     | Close chat                                             |

## 📋 Prerequisites

Get [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) installed first. If you don't have 'em, install them before you `git clone` and start panicking over errors. 😅

## 🚀 Getting Started

Clone this repo to your machine:

```bash
git clone https://github.com/sepatusendal/meta-sora.git
```

This creates a folder called `meta-sora`. Want a different folder name? Add it:

```bash
git clone https://github.com/sepatusendal/meta-sora.git your-folder-name
```

**Run the server:**

```bash
cd meta-sora  # or 'your-folder-name'
yarn && yarn start
```

**Run the client:**

```bash
cd meta-sora/client  # or 'your-folder-name/client'
yarn && yarn dev
```

Once both are running, open your browser and... congrats, you officially own a virtual world. Invite your friends, or if you got none, just wander around your own creation solo. No shame, self-love is important. 🌍💅

## 🎉 Credits

Yo, it's me, **Wira** — you probably know me as **sepatusendal**. I'm the one who took SkyOffice and gave it the glow-up into Meta Sora. If you vibe with this project, go follow me for more chaos. If you don't, still go follow, no hard feelings, I'll wear you down eventually. 😎

Big thanks also to:

- [ourcade/phaser3-typescript-parcel-template](https://github.com/ourcade/phaser3-typescript-parcel-template) - the starter template that carried hard
- [LimeZu](https://limezu.itch.io/) - the pixel artist making this world look aesthetic
- [WBO](https://github.com/lovasoa/whitebophir) - the open-source whiteboard project embedded here

## 📜 License

This project is licensed under MIT, originally created by [Kuan-Hsuan Shen](https://github.com/kevinshen56714) through the original [SkyOffice](https://github.com/kevinshen56714/SkyOffice) project. Meta Sora is a continuation of his work — respect to the one who started it all. 🙏 Check the [LICENSE](./LICENSE) file for full details.
