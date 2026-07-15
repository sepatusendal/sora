# 🌌 SORA ![License](https://img.shields.io/badge/license-MIT-blue) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg) ![Vibes](https://img.shields.io/badge/vibes-immaculate-ff69b4) ![Maintainer](https://img.shields.io/badge/maintained%20by-sepatusendal-orange)

<img alt="Logo" align="right" src="https://user-images.githubusercontent.com/11501902/139942585-a6b044ce-3695-460a-91bd-dd9f1d4611c8.png" width="20%" />

Yo, welcome to **SORA** — hands down the most extra virtual world on the block, where you can work, meet, gossip, and doodle on a whiteboard with your squad without ever putting on real pants. 👖❌

This ain't your average "boring boxes on a video call" website, bestie. This is a whole portal. A whole world. Straight up _vibes_. You walk, your little avatar walks. You get close to someone, boom, instant connection, no awkward "can you hear me?" energy. Feels like a game but somehow actual work gets done. Explain to me how that's not immersive. 🌌

SORA was cooked up from scratch with one mission: make a virtual workspace that actually feels alive, instead of the same tired video-call-grid nonsense everyone's sick of. A little world you can wander around in, chit-chat in, and somehow still be productive in. ✨

- 🙌 Follow for memes & updates: [Instagram](https://www.instagram.com/wirarajaofficial)
- 📦 Source code (feel free to fork it, just don't fork with anyone's heart): [GitHub](https://github.com/sepatusendal/sora)

> ⚠️ **Serious disclaimer (kinda):** SORA currently runs buttery smooth on PC browsers only. If you open it on mobile and everything's busted, that's not a bug bestie, that's SORA testing your loyalty. Get back on your laptop please. 🙏📱❌

## 🛠️ Built with

- [Phaser3](https://github.com/photonstorm/phaser) - the game engine keeping SORA alive and kicking
- [Colyseus](https://github.com/colyseus/colyseus) - WebSocket server framework, so everyone connects real-time with zero loading drama
- [React/Redux](https://github.com/facebook/react) - front-end framework, keeping things looking clean
- [PeerJS](https://github.com/peers/peerjs) - WebRTC for video calls & screen sharing
- [TypeScript](https://github.com/microsoft/TypeScript) & [ES6](https://github.com/eslint/eslint) - keeping the code tidy, unlike your dorm room

## ✨ Features that'll make you never wanna leave your room

- [Proximity Chat](#-proximity-chat-because-distance-matters)
- [Screen Sharing at Lightning Speed](#-screen-sharing-at-lightning-speed)
- [Multifunctional Rooms](#-multifunctional-rooms)
- [Text Chat with Real-Time Speech Bubbles](#-text-chat-with-real-time-speech-bubbles)
- [Custom/Private Rooms](#-customprivate-rooms)
- [Built-in Whiteboard](#-built-in-whiteboard)

### 🎧 Proximity Chat (because distance matters)

Walk up to someone's avatar and boom, video call auto-starts. Walk away a bit and the sound fades out just like your ex's replies. Basically your real-life friend group, except digital and slightly less messy. 😂

![image](https://user-images.githubusercontent.com/11501902/139960852-cf0e0883-8fbe-459d-bb11-3707d0ae1360.png)

### 🏢 Multifunctional Rooms

Need a serious meeting or just wanna hang out virtually? Just switch rooms, no cap. No booking system, no "someone's already in this room" chaos, no group chat spam of "wait where are we meeting again??"

![image](https://user-images.githubusercontent.com/11501902/139961091-1801bd4d-fbd6-4400-8503-85ece744e979.png)

### 🖥️ Screen Sharing at Lightning Speed

Sit down at your virtual desk, hit a button, screen's shared. Fast as lightning, fast as you pretending to look busy the second your boss walks by.

![image](https://user-images.githubusercontent.com/11501902/139961155-44a85cd9-ac25-4563-9d82-6537ed7435f6.png)

### 💬 Text Chat with Real-Time Speech Bubbles

Type something and a little bubble pops up over your avatar's head, like some RPG dialogue except it's actually just work stuff or group project battle plans.

![image](https://user-images.githubusercontent.com/11501902/145925423-3b5b9026-d3b9-429d-920b-98b0bcd6300a.png)

### 🧑‍🎨 Built-in Whiteboard

Need to brainstorm, or just doodle nonsense while your brain's completely fried? The whiteboard's right there waiting. Genius idea or a random stick figure, both welcome with open arms.

![image](https://user-images.githubusercontent.com/11501902/147785323-19dbf0e6-056d-44c5-8efe-e969297bbe52.png)

### 🔒 Custom/Private Rooms

Need a secret room to plan your boss's surprise birthday, or just gossip without the whole office hearing? Say less. Private rooms got your back, zero eavesdroppers allowed.

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

Grab [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) first. If you don't have 'em installed, go do that before you `git clone` and start panic-googling errors at 2am. 😅

## 🚀 Getting Started

Clone this bad boy to your machine:

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

Once both are running, pop open your browser and boom, congrats, you now officially own a virtual world. Invite your friends, or if you got none, just roam around your own creation solo. No shame in that game, self-love is important. 🌍💅

## 🎉 Credits

Yo, it's me, **Wira** — you probably know me as **sepatusendal**. I built and grew SORA into what it is today. If you vibe with this project, go follow me for more chaotic content. If you don't, still go follow, no hard feelings, I'll wear you down eventually. 😎

Big thanks also to:

- [ourcade/phaser3-typescript-parcel-template](https://github.com/ourcade/phaser3-typescript-parcel-template) - the starter template that carried this whole thing
- [LimeZu](https://limezu.itch.io/) - the pixel artist making this world look aesthetic AF

## 📜 License

This project is licensed under MIT, originally created by [Kuan-Hsuan Shen](https://github.com/kevinshen56714) through the original [SkyOffice](https://github.com/kevinshen56714/SkyOffice) project. SORA is a continuation of his work — respect to the one who started it all. 🙏 Check the [LICENSE](./LICENSE) file for the full details.
