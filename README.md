# ByteSafe Lab

**An eight-quest, browser-only RPG for a hands-on memory-safety workshop.** Take the role of the Memory Keeper, follow one task at a time, and unlock each new topic by solving the current quest.

## The campaign

1. **Map the Memory** — byte-sized storage, addresses, and neighboring values
2. **The Ninth Byte** — stack buffer overflow and a length check
3. **Heap Courier** — heap overflows and parser input validation
4. **Address Compass** — pointers, dereferencing, and pointer arithmetic
5. **The Reused Slot** — dangling pointers and use-after-free
6. **Fuzzing Trail** — find and keep a small failing input
7. **Sanitizer Scan** — read an AddressSanitizer-style diagnostic and verify a fix
8. **Patchwright Review** — safer C++ patterns and human review of AI suggestions

Each quest gives participants one immediate action. Questions can be retried without losing progress. Later quests unlock after the current one is complete. Completed quests are remembered in the current browser tab's session storage.

## Safety and scope

- Student-entered text is treated as data. The editor does not compile, execute, or evaluate it; it recognizes only a buffer declaration and the `CHECK_LENGTH` or `CLEAR_POINTER` setting.
- Memory, pointer, parser, fuzzer, and sanitizer behavior are deterministic teaching simulations. The miniature fuzzer checks a small set of input lengths; it is not a production fuzzing tool. Sanitizer reports are examples, not compiler output.
- The app makes no device connections or external API calls. It has no account, room code, analytics, or backend. Quest progress uses session storage; theme and local challenge results use browser storage. Animations follow the browser's reduced-motion preference.
- Real C/C++ memory layouts and behavior vary by compiler and system. The visual memory map intentionally simplifies them to explain boundaries.
- Facilitator controls affect only the current browser tab. Students can play independently; this static version does not synchronize a classroom session.
- The byte map replays writes in the local teaching model, and its boundary tests call the same deterministic simulator as the example. A passing result does not mean student code was compiled or executed.

## Learning and workshop controls

- Byte and pointer simulations follow **Understand → Run → Inspect → Fix → Verify**. Participants confirm the goal, investigate an observed result, and then prove the change with a rerun or supported tests. Quizzes keep their own retryable question flow.
- The memory map can step backward and forward, replay a simulated copy, and reset its view without resetting the code or input. Selecting a written simulated neighbor byte records the inspection step.
- Byte-oriented quests provide four local cases: empty input, shorter valid input, exact buffer capacity, and one byte over. These tests check the app's supported model, not actual C/C++ execution.
- The optional event challenge uses the eight-byte stack exercise. It validates a valid input, an exact-boundary input, the participant's oversized input, and a short reasoning question. Hints are progressive, and the optional facilitator-controlled timer never blocks completion.
- Challenge completions and elapsed times are saved in browser storage for the active browser profile only. There is no account, shared leaderboard, or cross-device synchronization.
- Facilitators can switch to a presentation view to enlarge the current exercise. It only changes the facilitator's current browser tab.
- The app selects participant or facilitator UI from exact hostnames configured in the early bootstrap in `index.html`; query parameters do not select a view. Add the participant and facilitator deployment hostnames to their respective lists. Unlisted hosts default to participant view. Hostname selection only chooses the interface. Vercel Deployment Protection must protect the facilitator deployment; the browser-side check is not authentication.
- Dark mode is the first-visit default. An explicit light-mode choice is saved and retained on later visits.

## Run locally

Serve this directory with any static web server. For example, with Python installed:

```powershell
python -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Deploy

### Render

Connect this repository as a **Static Site**. The included `render.yaml` configures a no-build deploy and publishes the repository root.

### Vercel

Import this repository as a static project. Leave the build command empty and set the output directory to `.` (the project root). The included `vercel.json` adds basic response headers. No framework or build step is required.

## Project files

- `index.html` — accessible campaign structure and quest content
- `style.css` — responsive visual design, interaction states, and reduced-motion support
- `game.js` — quest data, safe input parsing, simulations, and progression
- `favicon.svg` — local app icon
- `render.yaml`, `vercel.json` — static-host configuration
