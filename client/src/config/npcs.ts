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
    role: 'OB',
    spawn: { x: 400, y: 456 },
    bounds: LEFT_CORRIDOR_BOUNDS,
    greetings: [
      'Eh, permisi lewat ya~',
      'Pagi/siang, semangat kerjanya!',
      'Wah, rajin banget masih di sini.',
      'Kalo capek istirahat dulu gih.',
      'Ada yang mau dibersihin? Bilang aja.',
      'Selamat kerja, jangan lupa minum air putih!',
    ],
    topics: [
      {
        label: 'Minta kopi/teh',
        action: 'coffee-run',
        lines: [
          'Oke siap, tunggu bentar ya, gue ambilin dulu!',
          'Siap, Bos! Kopi apa teh nih maunya... yaudah gue racikin dulu.',
          'Beres, gue ke pantry dulu ya, bentar!',
          'Noted! Otw ambilin, jangan ke mana-mana.',
        ],
      },
      {
        label: 'Ngobrol santai',
        lines: [
          'Santai aja, meja lo udah gue lap tadi pagi.',
          'Hari ini kerjaan lancar kan? Semoga gak banyak drama.',
          'Kalo tempat sampah penuh, bilang gue aja ya.',
          'Gue baru selesai ngepel lantai, hati-hati licin.',
          'Enak juga ya kerja di sini, adem, banyak temen.',
          'Eh tau gak, tanaman di pojok itu gue yang rawat lho.',
          'Kopi kesukaan gue tuh kopi item pait, kalo lo?',
          'Semangat terus ya kerjanya, jangan lupa senyum!',
        ],
      },
      {
        label: 'Gosip kantor dikit',
        lines: [
          'Katanya nanti ada acara kantor, seru kayaknya!',
          'Eh denger-denger meeting room abis dirapiin, coba cek deh.',
          'Jangan bilang siapa-siapa ya, tapi kopi di dispenser abis lagi 😅',
          'Kemarin ada yang ketiduran di sofa lounge, ngakak gue liatnya.',
          'Katanya bulan ini target kantor tercapai, mantap!',
          'Psst, satpam kita jagain lorong ketat banget belakangan ini.',
        ],
      },
    ],
    coffeeReturnLines: [
      'Nih, {drink} anget buat lo! Nikmatin ya 😊',
      'Ini {drink}-nya, semoga bikin semangat lagi!',
      'Sori nunggu lama, ini {drink}-nya, masih anget kok.',
      'Nih dia {drink} spesial dari gue, cheers!',
    ],
  },
  {
    id: 'satpam',
    texture: 'ash',
    role: 'Satpam',
    spawn: MIDDLE_CORRIDOR_TOP,
    bounds: MAP_ROAM_BOUNDS,
    patrol: { a: MIDDLE_CORRIDOR_TOP, b: MIDDLE_CORRIDOR_BOTTOM, pauseMs: 1500 },
    greetings: [
      'Aman terkendali, Pak/Bu! 👮',
      'Selamat bertugas!',
      'Awas lantai licin abis dipel tadi.',
      'Semangat kerjanya, saya patroli dulu ya.',
      'Jangan lupa kunci laptop kalo tinggal meja.',
      'Siap siaga di sini, tenang aja.',
    ],
    topics: [
      {
        label: 'Tanya keamanan/akses',
        lines: [
          'Titip absen ya, jangan lupa scan QR di pintu masuk.',
          'Kalo ada tamu dateng, lapor ke saya dulu ya.',
          'Ruangan CEO sama Meeting Room dikunci kalo lagi dipake, aman kok.',
          'Barang ketinggalan biasanya saya kumpulin di pos jaga.',
          'CCTV di sini nyala 24 jam, jadi tenang aja soal keamanan.',
          'Kalo lembur malem, bilang saya ya biar saya tau ada yang masih di dalam.',
        ],
      },
      {
        label: 'Say hi',
        lines: [
          'Halo! Gimana kabarnya hari ini?',
          'Woy, jangan lari-lari di lorong, licin abis dipel.',
          'Udah makan siang belum? Jangan lupa istirahat.',
          'Semangat ya kerjanya, saya di sini kalo butuh bantuan.',
          'Cuaca lagi enak nih buat kerja santai.',
          'Tetap jaga kesehatan ya, jangan begadang terus.',
        ],
      },
      {
        label: 'Curhat dikit',
        lines: [
          'Kadang sepi juga jaga malem sendirian, untung ada radio.',
          'Dulu saya kerja jaga toko, sekarang di sini lebih betah.',
          'Paling seneng kalo ada yang nyapa kayak lo gini.',
          'Hobi saya sebenernya mancing, tapi jarang sempet.',
          'Kalo lagi sepi gini, saya suka mikirin mau makan apa nanti.',
          'Rekan kerja di sini enak-enak semua, betah saya.',
        ],
      },
    ],
  },
  {
    id: 'receptionist',
    texture: 'lucy',
    role: 'Resepsionis',
    spawn: { x: 900, y: 380 },
    bounds: MAP_ROAM_BOUNDS,
    greetings: [
      'Selamat datang di SORA! ✨',
      'Hai, semoga harimu menyenangkan!',
      'Halo~ ada yang bisa dibantu?',
      'Semangat kerjanya hari ini!',
      'Wah, ketemu lagi kita di sini~',
      'Jangan sungkan tanya-tanya ya kalo bingung.',
    ],
    topics: [
      {
        label: 'Tanya arah ruangan',
        lines: [
          'Meeting Room ada di sebelah kiri belakang, deket Lounge.',
          'Workspace utama itu ruangan gede di sebelah kanan.',
          'Mau ke CEO Room? Naik sedikit ke arah atas, dekat pintu masuk.',
          'Lounge buat santai-santai ada di depan situ, silakan mampir.',
          'Kalo bingung arah, samperin saya aja, saya anter.',
          'Ada juga Annex di seberang, bisa lewat portal ya.',
        ],
      },
      {
        label: 'Tanya info kantor',
        lines: [
          'Jam kerja di sini fleksibel kok, yang penting kerjaan beres.',
          'Ada whiteboard di beberapa ruangan buat brainstorming bareng.',
          'Kalo mau screen sharing, tinggal duduk di komputer terus tekan R.',
          'Ruangan yang dikunci itu privat, biar meeting-nya tenang.',
          'Kalo butuh bantuan teknis, bilang aja ke saya, saya arahin.',
          'SORA ini didesain biar kerja tetep berasa hidup, bukan cuma video call biasa.',
        ],
      },
      {
        label: 'Say hi',
        lines: [
          'Mau ketemu siapa nih? Saya bantu arahin ya.',
          'Jangan lupa isi buku tamu di meja depan~',
          'Semoga harimu menyenangkan di sini! ✨',
          'Kalo capek, mampir dulu ke Lounge buat nyantai.',
          'Seneng deh liat kantor makin rame begini.',
          'Ada info menarik hari ini, tanya-tanya aja ke saya!',
        ],
      },
    ],
  },
]
