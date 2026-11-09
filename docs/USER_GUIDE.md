# Popcorn for Two: user guide

Popcorn for Two is a date night for long-distance couples. You and your
partner join a video call and watch the same YouTube video, kept in sync,
from two different places.

**Open it:** https://popcorn-for-two.fly.dev, in Chrome (desktop or Android).
No account and no install.

This guide covers what the app does today
([v1.1.0](https://github.com/jeffreylim24/popcorn-for-two/releases/tag/v1.1.0)).
Planned features are in [ROADMAP.md](../ROADMAP.md).

## Features at a glance

| Feature | What it means for you |
|---|---|
| Private rooms | Each date gets its own room with a link. Only two people fit in a room. |
| Lobby | Check your camera and mic before you go in. |
| Video call | See and hear each other the whole time, right next to the movie. |
| Synced YouTube | Either of you can play, pause, or skip, and the other's video follows within about a second. Nobody is the "host". |
| Shared video choice | Paste a YouTube link and it loads for both of you. Someone who joins late gets the current video. |
| Movable facecams | Drag both cams anywhere on your screen and resize them. Your layout is yours: your partner arranges theirs. |
| Hide the cams | Hide both cams for a moment to see the whole video. The call keeps going. |
| Camera and mic toggles | Turn your camera or mic off and on at any time. Your partner sees when you're muted or your camera is off. |
| Fullscreen | The movie, both cams, and a small control bar fill the screen. |
| Works on phones | The lobby and room fit a phone screen, and the cams start side by side under the video. |

## Start a date night

1. **Create a room.** On the home page, click **Create room**. You land in
   the room's lobby.
2. **Check yourself in the lobby.** You see your own camera. Use
   **Camera on/off** and **Mic on/off** to choose how you join. Both start
   on.
3. **Click Join room.**
4. **Send the link.** Click **Copy link** at the top of the room and send
   it to your partner (or copy the address bar; links look like
   `…/room/…`). They go through the same lobby, and the call starts by
   itself as soon as you're both in.

> **Wear headphones.** Without them, your mic picks up the movie from your
> speakers and your partner hears it twice.

## Pick something to watch

Paste a YouTube link into the box under the player and click **Watch**.
The video loads for both of you.

These links work:

- `https://www.youtube.com/watch?v=…`
- `https://youtu.be/…`
- `https://www.youtube.com/shorts/…`
- The mobile site (`m.youtube.com`) too

If the link isn't a YouTube video, you'll see *"That doesn't look like a
YouTube video link."* To change videos, paste a new link at any time.

## Watch together

Use YouTube's own player: play, pause, and drag the timeline as usual.
Whatever one of you does, the other's video copies within about a second.

If one of you falls behind (a slow connection, say), the app jumps the
one behind forward to catch up. It never pulls the person ahead back.

## Arrange the facecams

- **Move a cam:** drag it anywhere on the screen.
- **Resize a cam:** drag its bottom-right corner. On a computer the corner
  shows when you hover; on a touch screen it's always shown.
- **Your layout is yours.** Moving a cam on your screen doesn't move it on
  your partner's.

On a computer, the cams start small in the top corners. On a phone, they
start side by side under the video.

## Room controls

The bar under the player:

| Button | What it does |
|---|---|
| **Mic on / Mic off** | Mutes or unmutes you. When you're muted, a "You are muted" badge shows on your cam, and your partner sees "Your partner is muted". |
| **Camera on / Camera off** | Turns your camera off or on. Your partner sees "Your partner's camera is off". |
| **Cams shown / Cams hidden** | Hides both cams on your screen only. You can still hear each other. |
| **Fullscreen** | Fills the screen with the video and the cams. |

On a phone, the buttons show icons only.

**In fullscreen**, a small arrow button opens or closes a control bar with
the same mic, camera, and cams buttons, plus **Exit fullscreen**. The `Esc`
key also leaves fullscreen.

## When something goes wrong

| You see | What it means | What to do |
|---|---|---|
| **Room not found** | The link is mistyped, or the room closed. A room closes after it has been empty for 10 minutes, and also when the app is updated. | Click **Create a new room** and send the new link. |
| **Room is full** | Two people are already in this room. | Close any other tab you have open on this room, or click **Create a new room**. |
| **Connection lost** | Your link to the room dropped (Wi-Fi blip, laptop slept). | Click **Reconnect**. |
| **Mic blocked** / **Camera blocked** | Chrome isn't allowed to use them. | Click the camera icon in Chrome's address bar, allow camera and mic, and reload. |
| **No mic found** / **No camera found** | Chrome can't find the device. | Plug it in (or close other apps using it) and reload. |
| **Too many rooms created** | You made a lot of rooms in a short time. | Wait a few minutes, or reuse a room you already made. |
| **The server is full** | Too many couples are on right now. | Try again a bit later. |
| The video won't start | Chrome blocks autoplay in a tab nobody has clicked yet. | Click anywhere on the page once. |
| The call froze after switching networks | Moving from Wi-Fi to a hotspot (or back) drops the call. | Click **Reconnect**, or reload the page. |

If your partner's connection dies without warning (their laptop sleeps, say),
the app can take up to about 30 seconds to notice they left.

## Good to know

- **Chrome only.** Other browsers aren't supported yet. On an iPhone,
  fullscreen fills the browser window rather than the whole screen.
- **Two people per room.** One room is one couple.
- **Nothing is saved.** No accounts, no history. When a room closes, it's
  gone; make a new one next time.
- **Your call is private.** Video and sound go straight between your two
  browsers when possible, or through an encrypted relay when a network
  blocks that. Either way it's encrypted end to end. Keep your room link
  to yourselves: anyone with it can take the second seat while it's free.
