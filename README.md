# ByteSafe Lab

A browser-only interactive workshop game based on the memory-safety deck. Students can edit a small, safe pseudocode settings pad, enter inputs, inspect a byte map, and compare vulnerable behavior with a patch.

## Workshop flow

1. Open **The one extra byte** and use **Facilitator desk → Show the bug** to demonstrate how a ninth byte can affect an adjacent flag in the teaching model.
2. Set `CHECK_LENGTH = true` in the code pad or use **Show the fix**, then run the same input and compare the memory map.
3. Let students edit the code values and test their own inputs. The code pad accepts a `char name[n]` declaration (sizes 1–16) and a `CHECK_LENGTH = true/false` setting.
4. Move to **The heap boundary** and repeat with a packet parser.
5. Move to **The stale pointer** and step through allocation, release, address reuse, and read. Change `CLEAR_POINTER` to `true` to block the stale read.

Each lab clears when the vulnerable behavior has been demonstrated and the safety fix has been tested against it. Progress lasts for the current page session and is not uploaded.

## Safety and scope

- This is a deterministic teaching model. It does not compile, execute, or evaluate student-entered code. The editor reads only the specific settings documented above.
- All memory, pointer, and device states are simulated in the current browser tab. The app makes no device connections or external API calls and uses no accounts, room codes, analytics, or backend. The browser still loads the static HTML, CSS, JavaScript, and icon files from the selected host.
- The byte visualization simplifies real C/C++ behavior. In particular, it omits string terminators, compiler layout, and allocator details so the boundary effect is visible. Real memory layouts and outcomes vary.
- The facilitator controls operate only the facilitator’s current tab. Students can play independently on their own devices; there is no synchronized classroom session in this static version.

## Run locally

Serve this directory with any static web server. For example, with Python installed:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy to Render

Connect this repository as a **Static Site**. The included `render.yaml` sets the no-build command and publishes the repository root. Render can also create the service directly from that file.

## Deploy to Vercel

Import this repository as a static project. Leave the build command empty and set the output directory to `.` (the project root). The included `vercel.json` adds basic response headers; there is no framework or build step.

## Files

- `index.html` — accessible page structure
- `style.css` — responsive visual design
- `game.js` — deterministic simulation and interaction logic
- `favicon.svg` — local icon
- `render.yaml`, `vercel.json` — static-host configuration
