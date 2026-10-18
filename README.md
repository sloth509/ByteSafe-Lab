# ByteSafe Lab

**An interactive, browser-only cybersecurity workshop game for learning memory safety.** Explore simulated buffer overflows and stale pointers, inspect the byte map, and compare vulnerable behavior with safer code.

ByteSafe Lab is designed for a live classroom workshop. Students can edit a small pseudocode settings pad, run their own inputs, and see how a change affects the teaching model. Facilitators can guide a demonstration with quick bug and fix presets.

## What it teaches

- **Stack buffer boundary:** see how an unchecked input can cross a fixed-size buffer and change a neighboring value in the model.
- **Heap buffer boundary:** explore the same idea with a simulated packet buffer and neighboring alarm setting.
- **Use-after-free:** step through object allocation, release, address reuse, and a read through a stale pointer.
- **Safer checks:** enable a length check or clear a pointer, then repeat the scenario to verify the modeled fix.

## Workshop flow

1. Open **The one extra byte**. Use **Facilitator desk → Show the bug** to demonstrate an input one byte beyond the buffer.
2. Select **Show the fix** and compare the same boundary case with the length check enabled.
3. Open **Edit the code** to let students change the supported settings and try their own input. **Fill to buffer limit** and **Add one extra byte** make the boundary easy to compare.
4. Move to **The heap boundary** and repeat with the packet parser.
5. Move to **The stale pointer** and step through its four-event timeline. Set `CLEAR_POINTER = true` to block the simulated stale read.

Each lab records progress in the current page session after students demonstrate the bug and test its fix. The **Motion on/off** control can disable interface animations; the page respects the operating system's reduced-motion preference by default.

## Safety and scope

- Student-entered text is treated as input data. The app does not compile, execute, or evaluate it; it recognizes only the documented buffer declaration and `CHECK_LENGTH` or `CLEAR_POINTER` setting.
- Memory, pointer, and device states are deterministic teaching simulations in the current browser tab. The app makes no device connections or external API calls and has no account, room code, analytics, or backend.
- The byte map simplifies real C/C++ behavior. It omits string terminators, compiler layout, and allocator details so the boundary is visible; real layouts and outcomes vary.
- Facilitator controls affect only the facilitator's tab. Students can play independently, but this static version does not synchronize a classroom session.

## Run locally

Serve this directory with any static web server. For example, with Python installed:

```powershell
python -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Deploy

### Render

Connect this repository as a **Static Site**. The included `render.yaml` configures the no-build command and publishes the repository root. Render can also create the service directly from that file.

### Vercel

Import this repository as a static project. Leave the build command empty and set the output directory to `.` (the project root). The included `vercel.json` adds basic response headers. No framework or build step is required.

## Project files

- `index.html` — accessible page structure and workshop content
- `style.css` — responsive visual design, interaction states, and motion preferences
- `game.js` — mission data, safe input parsing, simulations, and interface behavior
- `favicon.svg` — local app icon
- `render.yaml`, `vercel.json` — static-host configuration
