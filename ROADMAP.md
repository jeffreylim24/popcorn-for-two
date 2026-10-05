# Roadmap

MVP: two people on a video call watch a YouTube video in sync.

Approach: build each piece when the previous one makes me need it.
Every milestone ends in something I can demo and commit.

## Milestones

- [x] **M1: YouTube player (solo)**
  - Done when: my own Play / Pause / Jump buttons control an embedded
    YouTube video on the page.
  - Why next: it's the heart of the app, and it runs on one machine
    with no server.
  - Decided: raw IFrame API, no React wrapper (sync needs direct
    control of player calls and events); API loaded by a static
    `<script>` in `index.html`; player
    created when `YT.Player` exists, else via `onYouTubeIframeAPIReady`.
  - Decided: player held in a `useRef` so code outside the effect can
    call it (M3's message handler will too); cleanup destroys it, then
    empties the ref so nothing calls a dead player.

- [ ] **M2: Rooms**
  - Done when: two browser tabs join the same room, and a message sent
    from one shows up in the other, relayed by the Go server.
  - Why next: after M1, pausing only affects my own screen. I need a
    way to get a message to my partner.
  - Decide at the start: how two people end up in the same room; how
    the server notices a dead connection (crashed tabs never say goodbye).

- [ ] **M3: Sync**
  - Done when: play, pause, or seek in either tab, and the other tab's
    video follows within about a second, with no echo loop.
  - Why next: messages arrive after M2, but the player ignores them.
  - Known from M1: `seekTo` keeps the play/pause state (paused stays
    paused), except before the first play, when it starts the video.
  - Decide at the start: what a message must carry to fully describe
    "where we are" (asked at the end of M1, not answered yet).

- [ ] **M4: First deploy (by hand)**
  - Done when: the app runs on a public HTTPS URL, and my partner and I
    watch a video in sync from our own networks (call on FaceTime).
  - Why next: two tabs on one laptop hide real lag, HTTPS, and home
    routers. Also: first real date night.
  - Decide at the start: hosting; Go serves the built frontend (one
    origin) vs separate hosting (needs CORS).

- [ ] **M5: Camera**
  - Done when: my own webcam shows on the page, locally and on the
    live site.
  - Why next: the call still lives in another app. First step to
    bringing it in: see my own face here.

- [ ] **M6: Drag and resize**
  - Done when: I can drag and resize my facecam anywhere over the
    video, without affecting my partner's layout.
  - Why next: a fixed camera box covers part of the video.

- [ ] **M7: Call**
  - Done when: my partner and I see and hear each other in the app on
    the live site, both facecams can be dragged and resized, and we no
    longer need FaceTime.
  - Why next: I can only see my own face.

## Later
- CI/CD: when manual deploys get annoying

## Not in the MVP
- Mini-games, movies beyond YouTube (separate brainstorming session)
- Accounts and login
- Browsers other than Chrome
