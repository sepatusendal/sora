/**
 * Roaming decorative NPCs (OB, Satpam, Receptionist) — client-side only,
 * not synced through Colyseus (see NPC.ts). Each reuses an existing
 * character atlas as a placeholder skin (no dedicated NPC sprite art yet).
 *
 * `bounds` is the rectangle each NPC wanders inside, in world pixels — the
 * whole main office interior (main map is 40x30 tiles / 1280x960px), not
 * just one room, so they actually roam around instead of pacing one box.
 * They're not pathfound, just random-walked with a wall/furniture collider
 * (see Game.ts's addNPCs), so an NPC can still walk up to an obstacle and
 * simply pick a new target next cycle instead of clipping through it.
 *
 * Each NPC has:
 * - `greetings`: lines spoken automatically when a player walks close by
 *   (see NPC.ts's notice()), on a cooldown so it doesn't spam.
 * - `topics`: a jobdesk-flavored conversation menu shown on interact (press
 *   R) — the player picks 1/2/3 to hear a random line from that topic.
 */
export interface NPCTopic {
  label: string
  lines: string[]
  /** 'coffee-run' = OB's kopi/teh fetch sequence instead of just a line (see NPC.ts) */
  action?: 'coffee-run'
}

export interface NPCConfig {
  id: string
  texture: string
  role: string
  spawn: { x: number; y: number }
  bounds: { x: number; y: number; width: number; height: number }
  greetings: string[]
  topics: NPCTopic[]
  /** Only used by the 'coffee-run' topic — lines said once the drink is delivered. */
  coffeeReturnLines?: string[]
  /**
   * Continuous back-and-forth patrol between two fixed points (e.g. Satpam
   * pacing a corridor top to bottom), instead of the default "mostly idle,
   * short local wander" behavior every other NPC uses. See NPC.ts's
   * updatePatrol().
   */
  patrol?: { a: { x: number; y: number }; b: { x: number; y: number }; pauseMs?: number }
}

// Lounge zone (see mediaZones.ts) doubles as the "pantry" — there's no
// dedicated kitchen art/tiles, so OB's coffee run is just a walk there and
// back, not a visual kitchen.
export const PANTRY_SPOT = { x: 400, y: 272 }

// Whole main-office interior, main map is 1280x960px — used by NPCs that
// aren't confined to one specific area.
export const MAP_ROAM_BOUNDS = { x: 48, y: 48, width: 1184, height: 864 }

// Left corridor connecting the Lounge (top-left room) and Meeting Room
// (bottom-left room) — see doors.ts: lounge-door gap center (400,368),
// studio-door gap center (400,528). OB paces this hallway, not the rooms
// on either end of it.
export const LEFT_CORRIDOR_BOUNDS = { x: 372, y: 392, width: 56, height: 128 }

// Middle corridor connecting the Meeting Room to the Workspace — see
// portals.ts: "cols 20-23" (x 640-736), running from just below the CEO
// Room down to row 27 (~864px, the portal's tile). Satpam patrols the full
// length of it, top to bottom.
export const MIDDLE_CORRIDOR_TOP = { x: 688, y: 150 }
export const MIDDLE_CORRIDOR_BOTTOM = { x: 688, y: 840 }

export const npcConfigs: NPCConfig[] = [
  {
    id: 'ob',
    texture: 'adam',
    // plain Bahasa Indonesia, just addresses the player as "kang"/"pak" —
    // role doubles as the on-screen name + job title ("Tekan R untuk
    // ngobrol sama Kang Yayat (OB)")
    role: 'Kang Yayat (OB)',
    spawn: { x: 400, y: 456 },
    bounds: LEFT_CORRIDOR_BOUNDS,
    // more greetings than topic lines on purpose — these fire passively
    // just from walking by, so they carry most of the NPC's personality;
    // topics only need enough lines to not feel too repetitive on reroll.
    // Kept short (one line each) rather than long run-on sentences, since
    // the floating bubble is meant for quick reads, not a wall of text.
    greetings: [
      'Pagi, kang! Semangat kerjanya ya.',
      'Permisi, mau lewat sebentar.',
      'Rajin banget masih di sini, pak.',
      'Kalau capek, istirahat dulu ya.',
      'Ada yang mau dibersihin, kang?',
      'Selamat kerja, jangan lupa minum air putih.',
      'Meja sama lantai udah saya rapiin tadi pagi.',
      'Semangat terus kerjanya, kang.',
      'Kalau ada sampah numpuk, panggil saya aja.',
      'Permisi ya, saya lewat dulu.',
      'Gimana kabarnya, kang? Sehat-sehat aja?',
      'Selamat sore, jangan lupa istirahat ya, pak.',
      'Sebentar lagi saya beresin ruangan ini.',
      'Cuaca lagi enak buat kerja santai, kang.',
      'Makasih ya udah rajin kerja, pak.',
      'Pagi lagi, kang. Ada yang bisa dibantu?',
      'Kerja emang harus disyukurin, pak.',
      'Sebentar lagi beres, sabar ya, kang.',
    ],
    topics: [
      {
        label: 'Minta kopi/teh',
        action: 'coffee-run',
        lines: [
          'Oke kang, sebentar saya ambilin dulu.',
          'Mau kopi atau teh, kang? Saya buatin.',
          'Sebentar ya, saya ke pantry dulu.',
          'Siap, tunggu sebentar lagi ya, kang.',
        ],
      },
      {
        label: 'Tanya soal kebersihan',
        lines: [
          'Santai aja, meja situ udah saya lap tadi pagi.',
          'Kalau tempat sampah penuh, bilang aja ke saya.',
          'Alhamdulillah kerjaan lancar terus hari ini, pak.',
          'Habis ngepel lantai, hati-hati licin ya, kang.',
        ],
      },
      {
        label: 'Info seputar kantor',
        lines: [
          'Katanya nanti ada acara kantor, seru kayaknya.',
          'Kopi di dispenser mau habis, nanti saya isi lagi.',
          'Ada tamu penting katanya hari ini, kang.',
          'Kalau ada yang rusak di ruangan, laporan aja ke saya.',
        ],
      },
    ],
    coffeeReturnLines: [
      'Nih {drink} buat kang, silakan diminum.',
      'Ini {drink}-nya, semoga tambah semangat.',
      'Maaf nunggu lama, ini {drink}-nya, pak.',
      'Ini {drink} spesial dari saya, selamat menikmati.',
      'Nih kang, {drink}-nya udah jadi.',
    ],
  },
  {
    id: 'satpam',
    texture: 'ash',
    // Mas Joko, dari Solo — tenang dan sopan, tapi ngomongnya tetap Bahasa
    // Indonesia biasa (bukan medok Jawa), fokus ke tugas keamanan kantor
    // (kartu akses, CCTV, lapor kejadian) dengan gaya kantor modern
    role: 'Mas Joko (Satpam)',
    spawn: MIDDLE_CORRIDOR_TOP,
    bounds: MAP_ROAM_BOUNDS,
    patrol: { a: MIDDLE_CORRIDOR_TOP, b: MIDDLE_CORRIDOR_BOTTOM, pauseMs: 1500 },
    greetings: [
      'Pagi, tetep semangat kerjanya ya.',
      'Lanjut aja kerjanya, aman kok di sini.',
      'Gimana kabarnya hari ini?',
      'Ati-ati, lantainya masih licin, baru dipel.',
      'Udah tap kartu akses belum?',
      'Saya patroli dulu sebentar ya.',
      'Jangan lupa kunci laptop kalau tinggal meja.',
      'Aman kok, lanjut aja kerjanya.',
      'Makasih udah jaga ketertiban kantor.',
      'Kalau ada yang aneh-aneh, bilang saya aja ya.',
      'Selamat pagi, semangat terus ya.',
      'Ada meeting penting hari ini ya? Semangat.',
      'Saya masih tugas jaga di sini, tenang aja.',
      'CCTV nyala terus kok, tenang aja.',
      'Kalau lembur malam, kabarin saya ya.',
      'Selamat datang, cek kartu aksesnya dulu ya.',
      'Yang penting sabar sama teliti kalau jaga begini.',
      'Saya lanjut ronda dulu ya.',
    ],
    topics: [
      {
        label: 'Tanya keamanan/akses',
        lines: [
          'Titip absen ya, jangan lupa tap kartu di pintu masuk.',
          'Kalau ada tamu datang, lapor saya dulu ya.',
          'Ruang CEO sama Meeting Room otomatis kekunci kalau dipakai.',
          'CCTV di sini nyala 24 jam, jadi tenang aja.',
          'Barang ketinggalan biasanya saya taruh di pos jaga.',
        ],
      },
      {
        label: 'Sapa santai',
        lines: [
          'Halo, gimana kabarnya hari ini?',
          'Jangan lari-lari di lorong, masih licin.',
          'Udah makan siang belum? Jangan lupa istirahat.',
          'Kalau butuh bantuan, panggil aja saya.',
          'Semangat terus kerjanya, saya di sini kok.',
        ],
      },
      {
        label: 'Curhat dikit',
        lines: [
          'Kadang sepi juga jaga malam sendirian, untung ada radio.',
          'Dulu saya jaga toko, sekarang di sini lebih betah.',
          'Seneng juga kalau ada yang nyapa kayak gini.',
          'Kerjanya yang penting sabar sama teliti aja.',
          'Alhamdulillah selama jaga di sini aman terus.',
        ],
      },
    ],
  },
  {
    id: 'receptionist',
    texture: 'lucy',
    // Nurul — front-desk-at-a-startup energy: casual-professional, more
    // natural/human phrasing than scripted corporate-speak, referencing
    // everyday startup-office things (standup, reschedule, town hall)
    role: 'Nurul (Resepsionis)',
    spawn: { x: 900, y: 380 },
    bounds: MAP_ROAM_BOUNDS,
    greetings: [
      'Halo, selamat datang di SORA!',
      'Pagi! Semoga harimu produktif ya.',
      'Hai, ada yang bisa dibantu?',
      'Eh, ketemu lagi nih, apa kabar?',
      'Jangan sungkan tanya-tanya kalau bingung ya.',
      'Udah cek jadwal meeting hari ini belum?',
      'Selamat datang kembali!',
      'Ada tamu yang perlu diarahkan? Bilang aja ke aku.',
      'Semangat kerjanya hari ini ya!',
      'Hai, udah standup pagi ini?',
      'Selamat pagi, jangan lupa isi absen ya.',
      'Eh, gimana progress kerjaannya hari ini?',
      'Halo, ada meeting yang perlu direschedule?',
      'Selamat datang, silakan langsung ke ruangan aja.',
      'Hai, semoga meeting-nya lancar ya.',
      'Ada yang butuh bantuan cari ruangan?',
      'Selamat siang, udah makan belum?',
      'Hai, seneng deh liat kantor makin rame.',
    ],
    topics: [
      {
        label: 'Tanya arah ruangan',
        lines: [
          'Meeting Room ada di kiri belakang, deket Lounge.',
          'Workspace utama itu ruangan gede di sebelah kanan.',
          'Mau ke CEO Room? Naik dikit ke arah atas, deket pintu masuk.',
          'Lounge buat santai ada di depan situ, mampir aja.',
          'Ada Annex juga di seberang, bisa lewat portal.',
        ],
      },
      {
        label: 'Tanya info kantor',
        lines: [
          'Jam kerja di sini fleksibel, yang penting kerjaan beres.',
          'Kalau mau screen sharing, duduk di komputer terus tekan R aja.',
          'Ruangan yang dikunci lagi dipakai meeting privat.',
          'Ada agenda town hall bulan ini, nanti aku kabarin jadwalnya.',
          'Mau reservasi Meeting Room? Tinggal masuk terus kunci aja.',
        ],
      },
      {
        label: 'Say hi',
        lines: [
          'Mau ketemu siapa nih? Aku bantu arahin ya.',
          'Jangan lupa isi buku tamu di meja depan ya.',
          'Semoga harimu menyenangkan di sini!',
          'Kalau capek, mampir dulu ke Lounge buat santai.',
          'Kalau ada tamu VIP, aku yang koordinasi penyambutannya.',
        ],
      },
    ],
  },
]
