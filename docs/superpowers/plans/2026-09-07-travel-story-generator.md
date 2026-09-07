# Travel Story Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a privacy-preserving static app that composes the approved Cinema Story and downloads it as a 1080×1920 PNG.

**Architecture:** A dependency-free ES module renderer draws the photograph, gradients, title, day and notes onto one fixed-resolution Canvas. A small DOM controller owns ephemeral state, input validation, pointer/keyboard positioning, continuous zoom and PNG download. GitHub Pages serves the committed static files from `main`.

**Tech Stack:** HTML5, CSS, browser Canvas 2D, ES modules, Pointer Events, Node.js built-in test runner, Playwright + local Google Chrome for verification, Git, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-09-07-travel-story-generator-design.md`

## Global Constraints

- Canvas resolution is exactly 1080×1920 and CSS alone scales its preview.
- No framework, package manager, runtime dependency, backend, analytics, persistence, cookie, or network request.
- Zoom is continuous from `1` to `3` with step `0.01` and redraws on every `input` event.
- Image movement works with Pointer Events and keyboard arrows; crop limits never expose empty canvas.
- Maximum content is a 42-character title and three optional 90-character notes.
- The public repository contains no personal photographs.
- The final public repository belongs to the login returned by `gh api user --jq .login`, is named `ig-travel-story`, and Pages serves the root of `main`.

---

### Task 1: Canvas renderer and crop math

**Files:**
- Create: `story-renderer.mjs`
- Create: `tests/renderer.test.mjs`

**Interfaces:**
- Produces: `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `computeImagePlacement(imageWidth, imageHeight, zoom, offsetX, offsetY)`, `wrapText(text, measure, maxWidth, maxLines)`, and `renderStory(context, state)`.
- `computeImagePlacement` returns `{ scale, width, height, x, y, maxX, maxY, offsetX, offsetY }` in Canvas pixels.
- `state` is `{ image, zoom, offsetX, offsetY, day, totalDays, title, notes }`.

- [ ] **Step 1: Write failing unit tests**

Test exact 1080×1920 constants; landscape, portrait and small-image cover placement; zoom 1 and 3; offset clamping; newline wrapping; long Unicode token splitting; ellipsis at line limit; and filtering empty notes.

```js
assert.deepEqual(
  computeImagePlacement(2400, 1600, 1, 9999, -9999),
  { scale: 1.2, width: 2880, height: 1920, x: 0, y: 0, maxX: 900, maxY: 0, offsetX: 900, offsetY: 0 }
);
```

- [ ] **Step 2: Run RED**

Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/renderer.test.mjs`

Expected: FAIL because `story-renderer.mjs` does not export the contract.

- [ ] **Step 3: Implement the minimal renderer**

Use `baseScale = Math.max(1080 / imageWidth, 1920 / imageHeight)` and `scale = baseScale * clamp(zoom, 1, 3)`. Draw the image centered plus clamped offsets, overlay independent top and bottom gradients, then draw the approved red day marker, white uppercase title and large white notes with red dashes. `wrapText` accepts a measurement callback so Node can test it without Canvas.

- [ ] **Step 4: Run GREEN and full tests**

Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add story-renderer.mjs tests/renderer.test.mjs
git commit -m "feat: add story canvas renderer"
```

---

### Task 2: Accessible editor, continuous zoom and drag

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Create: `app.mjs`
- Replace: `tests/mockup.test.mjs` with `tests/app-structure.test.mjs`
- Create: `.nojekyll`

**Interfaces:**
- Consumes: renderer exports from Task 1.
- Produces: labelled inputs `photo`, `day`, `total-days`, `title`, `note-1`, `note-2`, `note-3`, `zoom`; buttons `recenter` and `download`; canvas `story-canvas`; live region `status`.

- [ ] **Step 1: Write failing structure tests**

Assert exact input types, `min`/`max`/`step`/`maxlength` values, visible labels, 1080×1920 canvas attributes, local module references, CSP with `connect-src 'none'`, absence of storage/network APIs, pointer event wiring, keyboard handler, and zoom wiring on `input` rather than `change`.

```js
assert.match(html, /<canvas[^>]+width="1080"[^>]+height="1920"[^>]+id="story-canvas"/);
assert.match(html, /id="zoom"[^>]+min="1"[^>]+max="3"[^>]+step="0\.01"/);
assert.match(app, /zoomInput\.addEventListener\(['"]input['"]/);
```

- [ ] **Step 2: Run RED**

Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/app-structure.test.mjs`

Expected: FAIL against the static comparison mockup.

- [ ] **Step 3: Implement the HTML and CSS shell**

Build one two-column editor/preview page that becomes one column below 60rem. Use local system fonts, visible focus, touch-friendly controls and `touch-action: none` only on the canvas. Show an instructional empty canvas; disable `download` until a valid photo and valid day range exist.

- [ ] **Step 4: Implement ephemeral state and photo loading**

Use an in-memory state object. Validate `file.type.startsWith('image/')`; decode with an `Image` and temporary object URL; revoke the previous URL only after the new image succeeds. Never call storage, fetch, XHR, beacon, service worker or cookies.

- [ ] **Step 5: Implement positioning controls**

On pointer drag, convert client deltas using `1080 / canvas.clientWidth` and `1920 / canvas.clientHeight`, update offsets and let the renderer clamp them. On arrows move 12 Canvas px or 48 with Shift. On every zoom `input`, set the decimal value, clamp offsets through `computeImagePlacement`, and redraw immediately. `Ricentra` restores zoom 1 and offsets 0.

- [ ] **Step 6: Run GREEN and full tests**

Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add .nojekyll index.html styles.css app.mjs tests/app-structure.test.mjs tests/mockup.test.mjs
git commit -m "feat: add private story editor"
```

---

### Task 3: PNG export, browser verification and documentation

**Files:**
- Modify: `app.mjs`
- Modify: `tests/app-structure.test.mjs`
- Modify: `README.md`
- Delete before commit: `assets/DSCF7347.jpeg`, `assets/DSCF7335.jpeg`, `assets/DSCF7341.jpeg`

**Interfaces:**
- Consumes: valid rendered Canvas from Task 2.
- Produces: `downloadStory()` which requests `image/png`, downloads a filename built as ``travel-story-day-${String(day).padStart(2, '0')}.png``, and reports success/failure in `#status`.

- [ ] **Step 1: Write failing export contract tests**

Assert `canvas.toBlob(..., 'image/png')`, null/error handling with the exact Italian error from the spec, a temporary anchor with `download`, cleanup via `URL.revokeObjectURL`, and a status update.

- [ ] **Step 2: Run RED**

Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/app-structure.test.mjs`

Expected: FAIL because export is incomplete.

- [ ] **Step 3: Implement download and errors**

Wrap `toBlob` in a Promise, reject null blobs, create/click/remove a temporary anchor, revoke the blob URL, announce success, and keep the editor usable after failure.

- [ ] **Step 4: Update README**

Document controls, local-only privacy, `python3 -m http.server 8000`, the bundled-independent command `node --test tests/*.test.mjs`, PNG dimensions, the repository name and the absence of persistence. The exact public URL is added in Task 4 after resolving the authenticated owner.

- [ ] **Step 5: Run full Node tests**

Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Verify in local Chrome headless**

Serve the worktree. With Playwright and `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, upload `/Users/alessandro.orru/Downloads/DSCF7347.jpeg`, enter valid content, drag, move with arrows, move zoom continuously through intermediate values, recenter, download, and assert the PNG decodes to 1080×1920. Repeat layout screenshots at desktop and 390 px mobile; verify no clipping.

- [ ] **Step 7: Remove personal images and verify repository contents**

Delete the three `assets/DSCF*.jpeg` files and any old generated crop. Run `git status --short`, `git ls-files`, and `rg -n "DSCF|beijing-ducks" . --glob '!docs/**' --glob '!.superpowers/**'`; no personal image or production reference may remain.

- [ ] **Step 8: Commit**

```bash
git add -A README.md app.mjs tests/app-structure.test.mjs assets
git commit -m "feat: export Instagram story PNG"
```

---

### Task 4: Create GitHub repository and publish Pages

**Files:**
- Modify: `README.md` with the exact resolved repository and Pages URLs.

**Interfaces:**
- Consumes: green, reviewed `main` with no personal photos.
- Produces: public GitHub repository `$repo_owner/ig-travel-story` and live Pages URL `https://$repo_owner.github.io/ig-travel-story/`, where `repo_owner` is resolved in Step 1.

- [ ] **Step 1: Verify authentication and target availability**

Run `gh auth status`, set `repo_owner=$(gh api user --jq .login)`, and run `gh repo view "$repo_owner/ig-travel-story"`. Continue only when authenticated and the target repository does not already exist; if it exists, stop before overwriting or pushing to it.

- [ ] **Step 2: Record the exact public URLs**

Update `README.md` with the concrete values of `https://github.com/$repo_owner/ig-travel-story` and `https://$repo_owner.github.io/ig-travel-story/`, then commit only that file:

```bash
git add README.md
git commit -m "docs: add published app links"
```

- [ ] **Step 3: Verify the release gate**

Run the complete Node suite, inspect `git status --short`, `git log --oneline`, and `git ls-files`. Require zero failures, a clean tree, and no personal photographs.

- [ ] **Step 4: Create and push the public repository**

Run:

```bash
gh repo create "$repo_owner/ig-travel-story" --public --source=. --remote=origin --push
```

- [ ] **Step 5: Enable Pages from `main` root**

Use `gh api --method POST "repos/$repo_owner/ig-travel-story/pages"` with `build_type=legacy`, source branch `main`, and source path `/`. If Pages already exists, read its current configuration and update it only when it does not already target `main` `/`.

- [ ] **Step 6: Verify publication**

Read `gh api "repos/$repo_owner/ig-travel-story/pages"`, wait for the Pages build to complete, then request the returned `html_url`. Verify the page loads, its module and stylesheet return successfully, and no personal asset URL exists.

- [ ] **Step 7: Report final URLs**

Return the GitHub repository URL, GitHub Pages URL, exact test result and publication status. Do not create additional releases, tags or branches.
