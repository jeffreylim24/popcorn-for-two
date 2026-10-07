# Learning Snapshot

_Last updated: 2026-10-07 (session 7)_

## Concepts

### Shaky
- **Go (the language):** relearning from scratch, but Java is the most familiar language, so Java → Go tables work. Covered in session 7 (each used once in real code):
  - `func f(x string) string`, `for i := 0; i < 6; i++`, `for range 6`, `for cond {}` (no `while`), `:=` vs `var`/`=`, `const`.
  - **Zero values:** explained back correctly why `var code string` + `+=` works. Knows a nil map can be read but writing to it panics.
  - **Maps + comma ok:** first example (four unrelated lines) was read as one program and confused them. Rewritten as a sequence with the map's contents after each line, it landed. Key point: `m[k] = v` overwrites silently, so check first.
  - **Blank identifier `_`:** used it after review (had written `for ok && code` with the bool value).
  - `string(s[i])` (byte → string), `math/rand/v2` `rand.IntN`.
- **`fmt.Fprint(w, …)` writes the HTTP response:** asked twice what it's for (thought it was testing-only). The end-to-end diagram (button → fetch → server → `Fprint` → `response.text()`) answered it. `log` = your terminal; `w` = the requester. `Fprintf`'s first argument is a template, and `go vet` flags a non-constant one.

### Introduced (planning only, no code yet)
- **WebSocket heartbeat:** the server pings over the open socket and the browser auto-pongs. Proposed "check periodically" on their own, then worked out via a guiding question that the server can't make an HTTP request to the browser, so the check has to use the WebSocket.
- **Goroutines / concurrent map access:** each request runs on its own goroutine. Asked: "what do you remember about two Java threads changing one `HashMap`?" Not answered yet.
- **Signaling (WebRTC):** browsers can't accept incoming connections, so a server both can reach relays setup info.
- **WebSocket vs fetch:** server can push any time; fetch only answers when asked.

### Learning (introduced, used or explained back once)
- **HTTP methods / statuses:** POST for "creates something" (GETs get repeated or prefetched). 405 = path exists, wrong method; 404 = no such path. Read the 405 as "no GET handler yet", which is nearly right.
- **`useRef`:** a box that survives re-renders; changing `.current` doesn't re-render. Early slips: assigned to the ref instead of `.current`, and assigned outside the function. Later refactored to drop the local variable on their own.
- **Effect cleanup:** `playerRef.current?.destroy()` then `= null`.
- **`undefined` vs `null`**, **`?.`**, **reading TS method signatures** (`seekTo(seconds, allowSeekAhead)`).
- **YouTube player state vs position:** `seekTo` keeps play/pause state. Groundwork for M3.
- **`<script>` tags** (plain vs `type="module"`, scripts injecting scripts); **race between React and a loading script**. Needed the `else` branch explained.
- **TS types for globals:** `@types/*`, `tsconfig` `"types"` allow-list, `declare global` *adds to* an interface.
- **dependencies vs devDependencies; `package.json` (range) vs `bun.lock` (exact).**
- **`package main` / `func main()`**, **`net/http` basics** (handler `(w, r)`, method+path patterns, `log.Fatal(ListenAndServe)`).
- **CORS / same-origin**, **Vite dev proxy**, **`response.ok` + `throw`**, **StrictMode double mount**, **`useState` / `useEffect`**.
- **Message contract:** both sides must agree on the shape; mismatches fail silently.

### Solid
- **Callbacks, calling vs handing over** (`onClick={f}` not `onClick={f()}`).
- **Debugging by isolation.** **Designing a test that forces the rare case:** shrank the alphabet to `"ab"` and logged each collision.
- **Design reasoning:** spotted the collision risk unprompted; chose server-side codes as "source of truth"; added the 2-person cap themselves.
- Checking a commit before pushing (`git show --stat HEAD`); Git's four areas; `git status -sb`; upstream tracking.
- Commit format and Conventional Commits; one logical change per commit; selective staging.
- `.gitignore` scope; lockfiles committed; `go.mod` / `go.sum`; toolchains vs project deps.

## Decisions

- **Frontend:** React + TS + Vite; shadcn/ui + Tailwind; Bun; ESLint; no React Compiler.
- **Backend:** Go (good at many concurrent connections), flat layout until there are several programs.
- **Repo:** monorepo `frontend/` + `backend/`; Conventional Commits; commit straight to `main` for now.
- **Toolchain:** Go 1.27.1, Bun 1.4.2, Node 26, React 19.3, Vite 8. Ports: Vite 5173, Go 8080; Vite proxies `/api`.
- **Roadmap:** M1–M7 in `ROADMAP.md`, pull-by-need. Deploy by hand after M3; CI/CD later.
- **Docs files and commit messages are Claude's;** the user stages, commits, pushes. LEARNING.md is committed by Claude at wrap-up.
- **Raw YouTube IFrame API, no React wrapper:** sync is imperative and the echo loop needs control over when events fire. Player lives in `playerRef`.
- **Reload the page after editing code inside an effect** (a save doesn't rerun effects with React 19.3 + plugin-react 6.1).
- **Rooms (M2):** server-generated 6-char code, regenerate on collision; max 2 per room; shared via a copy-link `…/room/CODE`. Full list in `ROADMAP.md`.
- **Heartbeat:** WebSocket ping every 15s, dead after 30s of silence (common default; tolerable rejoin wait, survives one lost ping).
- **`POST /api/rooms` returns the code as plain text.** JSON can come when there's more than one field.
- **`math/rand/v2` for codes, case-sensitive 62-char alphabet:** links are copied, not typed, and the 2-person cap is the real guard against guessing. Rooms map value is a `bool` placeholder until connections exist.
- **Run `go vet ./...` before committing Go.**

## Open questions

- None here. Per-milestone design questions live in `ROADMAP.md`.

## Teaching formats

- Works: **Java → Go comparison tables** (the user knows Java best). Ask "what do you remember?", then translate from Java.
- Works: ASCII flow diagrams, especially **end-to-end "who reads this?" diagrams** for "why does this line exist?".
- Works: comparison tables; reviewing the user's own drafts; concrete scenario questions; guiding questions that hand over the key constraint (the heartbeat direction).
- Works: small *unrelated* examples the user maps onto their code. **But a multi-line example must read as a real sequence:** show the state after each line, and don't stack unrelated operations.
- Works: "explain it back" after running something; "try it in two situations and report"; forcing rare cases in a test.
- Works: one new idea per step with syntax up front (sessions 6–7 went smoothly).
- **Be precise about where code goes.** Name the function or line.
- **Tie a step to the end goal up front**, and say whether code is production or temporary (the user asked whether `Fprint` was "just for testing").
- **Doesn't work: making the user investigate third-party internals.** State facts about tools directly.
- **Claude: verify tool behavior before using it as a check** (ran `go vet` before claiming the `Fprintf` issue).
- Doesn't work: abstract questions; predicting command output; sending to docs to learn a step.
- When deciding, asks "what do you recommend?" or agrees with one. Give a recommendation + trade-off table.
- Analogies: mixed. Phone-number (signaling) worked with a diagram.

## Next step

**M2 in progress:** `POST /api/rooms` is committed. Next is the concurrent-map gap: get their answer about two Java threads sharing a `HashMap`, then introduce `sync.Mutex` around `rooms`. After that comes picking a WebSocket library (Go's standard library has none) and a join route that upgrades to a WebSocket.
