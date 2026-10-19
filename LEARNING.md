# Learning Snapshot

_Last updated: 2026-10-19 (session 38)_

## Concepts

### Shaky
- **WebRTC (s. 32–37):** offer/answer, slots (`addTransceiver`), `replaceTrack`, `ontrack`. Fill-in blanks that look like API slots still go wrong; keep them "in words", 2–3 per turn.
- **ICE: STUN vs TURN (s. 37, new):** thought TURN is fetched *after* a direct route fails, so "fetch after creating the phone". Fixed with a gathering diagram (host / STUN / relay all gathered once, at phone creation) + "a spare tire goes in the trunk before the trip". Then thought only one side needs credentials; a two-car picture (each phone gathers its own routes) fixed it. Got the STUN-vs-TURN table (mirror vs relay, why TURN needs a password). S. 38: saw a real `relay` pair (phone on mobile data) in `chrome://webrtc-internals` + Cloudflare's dashboard; told why (carrier NAT breaks direct routes). Not explained back yet.
- **Pauses at `await` / check-then-act (s. 37):** strong on the camera bug: filled the trace's blank (`closePhone` → `false`) and, unprompted, suspected the same race existed before today (it did, via Go's two goroutines). Designed the fix rule themselves: "a new phone isn't stale partner info". The second case (partner leaves during the newcomer's await) landed as "confusing" when bundled with other points; parked in "Later". Rule given: after an `await`, re-check before acting.
- **Work it out vs store it (s. 34):** proposed a buffered ref for a value derivable from live state. Next time: ask "who else could change this value?" before they pick state/ref.
- **Stale closures + updater form (s. 33–34):** rule given: the updater form is for an old function reading state that something else changed since.
- **Client vs server (s. 32, s. 34):** draw both tabs + server before multi-tab logic. S. 37 used this (two-tab traces) and it worked.
- **Effect cleanup (s. 29–33):** improving.
- **Go (the language):** relearning. Used once each: `func`, `for`, `:=`/`=`, maps + comma ok, closures, typed constants, sets, structs, `regexp`, table tests, `json` tags. S. 37: typed `main.go` (env + closure handler) right; `TURN_KEY_ID` as a local name (Go uses camelCase), wrote `go.GetEnv` for `os.Getenv`.
- **HTTP status codes (s. 37):** picked 501 from a 500/502/503 table; told 501 = Not Implemented, 502 = upstream failed. Unclear if typo.
- **Units / coordinate spaces (s. 31)**, **two kinds of "ready"**, **TS types vanish at runtime:** not explained back.

### Learning (introduced, used or explained back once)
- **Env vars + secrets (s. 36–37):** chose fail fast (`log.Fatal` when missing) with a reason; typed the check. `.env` in `.gitignore` before creating it; `set -a; source .env; set +a`. S. 38: `fly secrets import --stage < backend/.env`, checked with `fly secrets list` (digests only).
- **`context.Context` (s. 37):** picked `context.WithTimeout` (5 s) for the Cloudflare call unprompted. Was shaky since s. 2x.
- **Go `err` vs a bad status (s. 37):** knew to check 201; told a 4xx/5xx is not an `err` in Go (and `fetch` only rejects on network failure too).
- **Promise in a ref (s. 37):** "a receipt": awaiting a finished one is instant. Claude wrote it.
- **`useRef` vs `useState` (s. 33, s. 37):** s. 37 picked a ref for the ICE list with the right reason.
- **Controlled components**, **callback props**, **local vs remote UI state**, **null cases of a value** (s. 33–34).
- **Pub/sub (s. 32)**, **message order on one socket**, **debugging WebRTC**, **single responsibility**, **`git commit --amend`**.
- **`useRef` for drags**, **pointer events**, **clamping**, **event bubbling** (s. 31). M2–M7 detail in `docs/learning-archive.md`.

### Solid
- **Debugging from evidence (s. 37):** read Go logs + the WS frames and correctly named StrictMode's throwaway socket as the "Room full" cause. **Debugging by isolation.**
- **Product / design reasoning:** s. 37 TTL (4 h from movie lengths), "TURN is a fallback" applied to the failed-fetch case.
- **Edge-case analysis + triage.** **Unit tests with Vitest.** **Callbacks.** **Manual test plans.**
- **Errors as return values**; log-and-continue when the error is someone else's.
- **Deploying by hand:** secrets first → push → `fly deploy --ha=false` → `fly status` → curl the live endpoint.
- **Git:** four areas, Conventional Commits, one logical change per commit, selective staging.

## Decisions

- **Frontend:** React + TS + Vite; Tailwind v4 + shadcn/ui; Bun; ESLint; Prettier; no React Compiler; keep StrictMode. JSDoc on declarations, `//` only inside bodies.
- **Backend:** Go, flat layout; `coder/websocket`; map helpers lock + `defer Unlock()`; `go vet` before committing Go. The server relays every message unread.
- **Repo (s. 38):** monorepo, Conventional Commits. Code: issue → branch → PR (`Closes #N`) → merge → deploy; the user runs `git`/`gh`, Claude drafts. Docs commits ride on the active feature branch, or go straight to `main` if none (a PR per learning-log update is ceremony). Issues required for now; revisit if tedious.
- **MVP done (s. 38):** M1–M10 shipped; M11 (Devices) moved to "Later": use the app first and let real date nights pick what's next. Phone layout (fullscreen button broken on phone) also in "Later".
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8, TS 6. Ports 5173 / 8080.
- **Raw YouTube IFrame API**; sync rules in `src/sync.ts`, tested.
- **Hosting:** Fly.io, one machine, `--ha=false`; rooms in memory.
- **Workflow:** pseudocode first, then a syntax sheet, they type. They often say "write it for me" for frontend steps.
- **Styling is delegated** to Claude.
- **M10 call (s. 32–37):** signalling over the room socket, slots + `replaceTrack`, `useMic`, `DraggableCam`, `camera`/`mic` messages, hide-cams, muted badges, own fullscreen, control strip. Details in `ROADMAP.md`.
- **TURN (s. 37):** Cloudflare; Go fetches 4-hour credentials (`GET /api/ice-servers`); missing env → crash at startup; the frontend fetches on Join and falls back to Google STUN. `newPhone()` keeps partner camera/mic state. Details in `ROADMAP.md`.
- **`partnerMicOn` starts `true` (s. 36, re-confirmed s. 37):** a wrong "muted" is worse.
- **The app is public:** many couples' rooms.
- **Deferred to "Later":** see `ROADMAP.md` (s. 37 added: phone made for a partner who left during the ICE await).

## Open questions

- Worldwide users: room routing (`fly-replay`) vs shared state. Post-MVP.
- After M10: synced drags (seats, clashing drags, different screen shapes).

## Teaching formats

- Works: **traces with state per row, one blank row to fill** (s. 37: the camera bug, solved at once), **comparison tables**, **ASCII diagrams**, **concrete analogies** (s. 37: spare tire, two cars, concierge with a master key).
- Works: **options table + recommendation**; they pick quickly with a reason, and push back when a rule looks tedious (s. 38: docs commits → chose a hybrid).
- **New domain: story first, then API.** Blanks must read as "say it in words".
- **"idk" / "I'm confused" → restart from the model** with a picture + a table that slots in their partial answers, then one narrow question (s. 37: the "box" picture after two "idk"s).
- **Doesn't work:** several open questions in one turn (s. 37: four → "idk" ×2); bundling a side bug with the main one ("I'm getting confused"); predicting output; docs to learn a step.
- **Pace:** one step per turn, why → exact commands → "it worked if…". Offer "write it" when they stall; s. 37 used it for the frontend fetch and the socket fix.
- **Don't record a decision until they say so.** **"Break it on purpose" only after Vitest steps.**

## Next step

**Post-MVP.** Use the app for a few real date nights; file what bugs you as GitHub issues (#1 already: facecam off-screen after a height-only resize). First post-MVP session: pick one issue and walk through the new flow once (`git switch main && git pull` → branch → commits → push → PR with `Closes #N` → merge → deploy). Coach PR habits one at a time as they come up.
