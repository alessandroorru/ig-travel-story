# Instagram Post Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third visual template that exports a 1080 × 1440 Instagram Post with two independently cropped photos, an 8 px white outer border, and an 8 px fixed center separator.

**Architecture:** Keep one template gallery and describe each template through a small catalog containing its output dimensions and media count. Preserve the existing Story rendering path, add a focused Post geometry module, and route shared crop controls to either the Story image or the active Post slot. UI-only overlays remain outside the canvas so exports contain only the composition.

**Tech Stack:** Static HTML, CSS, browser Canvas API, ES modules, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-05-instagram-post-stack-design.md`

## Global Constraints

- No framework, runtime dependency, backend, persistence, analytics, or application network request.
- Story templates remain 1080 × 1920 and visually unchanged.
- Stack fotografico is 1080 × 1440 with 8 px on every outer edge and an 8 px separator fixed at 50%.
- The two Post photos have independent image, URL, zoom, offsets, recentering, and load tokens.
- The reference JPG is never copied into the repository.
- Generic product copy omits “Story”; each template card has only an icon plus `Story` or `Post` in its bottom-right badge.
- One-finger page scrolling and two-finger canvas gestures retain their current mobile behavior.
- Request a Display-P3 float16 2D context when supported, report actual context attributes, fall back to standard sRGB, and never claim guaranteed HDR.

## Review Focus

- Rapid concurrent loads into top and bottom slots must not invalidate each other or replace a previously valid photo after one load fails.
- Repeated Story ↔ Post switches must restore the correct canvas dimensions and redraw after the canvas context is reset.
- A pinch whose touches start in different Post frames, or on the border/separator, must be ignored without moving either photo.
- A rejected or missing Post photo must keep export disabled while preserving the valid slot and its crop.
- PNG/Web Share output must use the active template dimensions and exclude Story chrome and Post selection guides.
- Browsers that reject or ignore Display-P3/float16 must still preview and export correctly through an sRGB context, with truthful color-mode copy.

---

### Task 1: Template catalog and format-aware gallery

**Files:**
- Create: `template-definitions.mjs`
- Create: `tests/template-definitions.test.mjs`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `tests/app-structure.test.mjs`

**Interfaces:**
- Produces: `TEMPLATE_DEFINITIONS`, an immutable record for `cinema`, `postcard`, and `post-stack`, each with `id`, `label`, `format`, `width`, `height`, and `mediaCount`.
- Produces: `getTemplateDefinition(templateId)` returning the requested definition, falling back to `cinema`.
- Produces: DOM elements `#template-post-stack`, `#story-photo-fields`, `#post-stack-fields`, `#post-photo-top`, `#post-photo-bottom`, and `#post-selection-guide`.

- [ ] **Step 1: Write failing catalog and markup tests**

Add tests named:

- `defines exact output metadata for all templates`
- `falls back to Cinema for an unknown template id`
- `offers a Post stack card with compact Story and Post badges`
- `uses generic product copy and keeps format-specific copy local`

Assert exact dimensions, media counts, the third accessible radio, bottom-right badge copy, the absence of long dimension strings inside cards, the two Post file inputs, and generic copy `Instagram Template Generator` / `Template studio`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/template-definitions.test.mjs tests/app-structure.test.mjs`

Expected: FAIL because `template-definitions.mjs` and the Post card/fields do not exist.

- [ ] **Step 3: Implement the template catalog**

Create these exports in `template-definitions.mjs`:

```js
export const TEMPLATE_DEFINITIONS = Object.freeze({ /* exact spec metadata */ });
export function getTemplateDefinition(templateId) { /* cinema fallback */ }
```

- [ ] **Step 4: Implement the generic gallery markup and styles**

Add the third radio card and its 3:4 two-panel thumbnail. Add a small bottom-right icon badge to all three cards, hide the single Story upload in a named group, add the hidden Post upload group, and change only generic product copy. Preserve accessible labels, focus treatment, selected check, and horizontal mobile scrolling.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/template-definitions.test.mjs tests/app-structure.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add template-definitions.mjs index.html styles.css tests/template-definitions.test.mjs tests/app-structure.test.mjs
git commit -m "feat: describe Story and Post templates"
```

### Task 2: Post geometry and renderer

**Files:**
- Create: `post-stack-geometry.mjs`
- Create: `tests/post-stack-geometry.test.mjs`
- Modify: `story-renderer.mjs`
- Modify: `tests/renderer.test.mjs`

**Interfaces:**
- Produces: `POST_STACK_LAYOUT` with `width: 1080`, `height: 1440`, `border: 8`, `separator: 8`, and exact top/bottom frames `{ x: 8, y: 8|724, width: 1064, height: 708 }`.
- Produces: `postSlotAtPoint(x, y)` returning `'top'`, `'bottom'`, or `null` for outer border/separator/outside points.
- Changes: `computeImagePlacement(imageWidth, imageHeight, zoom, offsetX, offsetY, frameWidth = 1080, frameHeight = 1920)`.
- Produces: `renderPostStack(context, postSlots)` and keeps `renderStory(context, state)` as the public renderer entry point.

- [ ] **Step 1: Write failing geometry and renderer tests**

Add tests named:

- `defines two equal 1064 by 708 Post frames with uniform eight-pixel white gaps`
- `maps points only inside Post photo frames`
- `computes cover placement against caller-provided frame dimensions`
- `renders Post slots with independent crop state and exact clipping`
- `leaves white borders and separator and restores canvas state`

Assert `8 + 708 + 8 + 708 + 8 === 1440`, `8 + 1064 + 8 === 1080`, frame-edge behavior, separate placement results for distinct zoom/offset inputs, white background fill, `save/clip/drawImage/restore` per loaded slot, and no Cinema/Postcard text or fades.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/post-stack-geometry.test.mjs tests/renderer.test.mjs`

Expected: FAIL because Post geometry/rendering and frame-size placement are absent.

- [ ] **Step 3: Implement pure Post geometry**

Add the exact frozen layout and `postSlotAtPoint(x, y)` to `post-stack-geometry.mjs`. Border and separator coordinates return `null`.

- [ ] **Step 4: Generalize cover placement and add Post rendering**

Keep existing default arguments so every Story test remains unchanged. In the Post branch, fill the full canvas white, clip once per loaded slot, translate placement into the frame origin, and restore context state even when a slot is empty or drawing throws.

- [ ] **Step 5: Run renderer tests and verify GREEN**

Run: `node --test tests/post-stack-geometry.test.mjs tests/renderer.test.mjs`

Expected: PASS, including all pre-existing Story renderer tests.

- [ ] **Step 6: Commit**

```bash
git add post-stack-geometry.mjs story-renderer.mjs tests/post-stack-geometry.test.mjs tests/renderer.test.mjs
git commit -m "feat: render the Post photo stack"
```

### Task 3: Dynamic canvas, dual uploads, validation, and export

**Files:**
- Modify: `app.mjs`
- Modify: `styles.css`
- Modify: `tests/app-structure.test.mjs`

**Interfaces:**
- Consumes: `getTemplateDefinition(templateId)` and `POST_STACK_LAYOUT`.
- Produces: `state.postSlots.top` and `state.postSlots.bottom`, each containing `image`, `imageUrl`, `zoom`, `offsetX`, `offsetY`, and `imageRequest`.
- Produces: `state.activePostSlot` with initial value `'top'`.
- Produces: `createPreferredCanvasContext(canvas)`, `getActiveMediaState()`, `syncTemplatePresentation()`, `loadPhoto(file, mediaState)`, and `filenameForTemplate(templateId)`.

- [ ] **Step 1: Write failing application tests**

Add tests named:

- `resizes and describes the canvas for Story and Post templates`
- `shows only the upload and content fields required by the active template`
- `keeps dual Post loads independent during success failure and replacement`
- `requires both Post photos but preserves a valid sibling slot after failure`
- `restores Story and Post media after repeated template switches`
- `exports Post at 1080 by 1440 as instagram-post-stack.png`
- `requests Display-P3 float16 and reports the actual context mode`
- `falls back to an sRGB context without disabling preview or export`

Use an asynchronous fixture for out-of-order image load/error events. Assert the valid sibling URL is not revoked, canvas dimensions switch before redraw, Story chrome is hidden only for Post, the selection guide is never referenced by export code, and Web Share still receives only one PNG `File`.

- [ ] **Step 2: Run the focused app tests and verify RED**

Run: `node --test tests/app-structure.test.mjs`

Expected: FAIL because the app has one image/request token, fixed canvas dimensions, no Post validation/export path, and creates only a default 2D context.

- [ ] **Step 3: Implement format-aware state and loading**

Add the two Post media states and refactor the current loader to accept its target state. Keep the Story image fields intact for compatibility. On successful Post load, activate that slot, reset only its crop, refresh controls, availability, and preview, then revoke only that slot's previous URL.

- [ ] **Step 4: Implement preferred color context with truthful fallback**

Request `canvas.getContext('2d', { colorSpace: 'display-p3', colorType: 'float16' })`, then use `getContextAttributes()` when available to expose the actual `display-p3`/`float16` or standard mode in status/help copy. If the preferred request returns no context or throws, retry `canvas.getContext('2d')`. Never label the result HDR.

- [ ] **Step 5: Implement canvas/template synchronization and validation**

Before redraw, apply the active definition's width/height, CSS aspect ratio, preview heading, accessible description, Story overlay visibility, field groups, and selected radio. Require one valid image for Story templates and both valid Post images for `post-stack`.

- [ ] **Step 6: Implement format-aware export naming**

Return `instagram-post-stack.png` for `post-stack`, preserve existing filenames for `cinema` and `postcard`, and leave the synchronous iOS Web Share path unchanged.

- [ ] **Step 7: Run focused and full tests and verify GREEN**

Run: `node --test tests/app-structure.test.mjs && node --test tests/*.test.mjs`

Expected: both commands PASS.

- [ ] **Step 8: Commit**

```bash
git add app.mjs styles.css tests/app-structure.test.mjs
git commit -m "feat: manage independent Post photos"
```

### Task 4: Independent Post interactions and preview-only selection guide

**Files:**
- Modify: `app.mjs`
- Modify: `touch-geometry.mjs`
- Modify: `styles.css`
- Modify: `tests/app-structure.test.mjs`
- Modify: `tests/touch-geometry.test.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: `postSlotAtPoint(x, y)`, `getActiveMediaState()`, and active template dimensions.
- Produces: `canvasPointFromClient(clientX, clientY)` using `canvas.width` and `canvas.height`.
- Produces: Post-aware pointer/touch targeting where centroids are relative to the selected frame center.

- [ ] **Step 1: Write failing interaction tests**

Add tests named:

- `selects and drags only the Post frame where pointerdown begins`
- `routes zoom recenter and keyboard movement to the active Post slot`
- `anchors a same-frame Post pinch and ignores cross-frame or gap touches`
- `keeps one-finger page scrolling native in Post mode`
- `keeps the active-frame guide outside the exported canvas`

Assert top/bottom state changes independently, coordinates scale through the current canvas dimensions, gap/border starts do nothing, two touches in different frames return no gesture, and switching active slot synchronizes slider/value/help text.

- [ ] **Step 2: Run interaction tests and verify RED**

Run: `node --test tests/touch-geometry.test.mjs tests/app-structure.test.mjs`

Expected: FAIL because movement and gesture math still target the single Story state and hardcode 1080 × 1920.

- [ ] **Step 3: Route pointer, keyboard, slider, and recenter controls**

Use `canvasPointFromClient` and `postSlotAtPoint` on pointer start. Store the chosen slot for the drag lifetime; border/separator starts remain inert. Apply keyboard, range input, and recenter operations through `getActiveMediaState()`.

- [ ] **Step 4: Route touch gestures by frame**

Make the two-touch snapshot include its Post slot. Accept only touches mapped to the same photo frame, calculate its centroid relative to that frame, and preserve the existing Story gesture behavior and 1×–3× clamping.

- [ ] **Step 5: Add and synchronize the preview-only active guide**

Position the DOM guide over the active frame, hide it outside Post mode, set `pointer-events: none`, expose active-slot text through the existing instructions/status UI, and never draw it on canvas.

- [ ] **Step 6: Update user documentation**

Document the third template, 1080 × 1440 output, two required uploads, active-slot controls, uniform 8 px border/separator, independent desktop/mobile crop behavior, Display-P3 best effort, and sRGB fallback. Explicitly state that composed PNG export does not guarantee HDR metadata or gain-map preservation.

- [ ] **Step 7: Run the complete verification gate**

Run:

```bash
node --test tests/*.test.mjs
for file in *.mjs tests/*.mjs; do node --check "$file"; done
git diff --check
```

Expected: all tests PASS, all syntax checks exit 0, and `git diff --check` is silent.

- [ ] **Step 8: Perform manual responsive verification**

Serve the repository locally and verify desktop plus a 390 × 844 viewport with two generated temporary test images, never the user's reference JPG. Check template badges, 1080 × 1440 preview, both crop targets, repeated template switches, one-finger scrolling, two-finger same-frame gestures, ignored separator gestures, and a PNG whose dimensions and white geometry are exact.

- [ ] **Step 9: Commit**

```bash
git add app.mjs touch-geometry.mjs styles.css tests/app-structure.test.mjs tests/touch-geometry.test.mjs README.md
git commit -m "feat: add independent Post crop controls"
```

### Task 5: Whole-feature review and publication readiness

**Files:**
- Review all files changed by Tasks 1–4

**Interfaces:**
- Consumes: the complete approved spec and all task commits.
- Produces: a reviewed, clean branch ready to push to GitHub Pages.

- [ ] **Step 1: Run a fresh whole-feature review**

Review the full diff against every spec section, focusing on the five Review Focus cases and Story regressions. Resolve findings through new failing tests before production changes.

- [ ] **Step 2: Re-run final verification**

Run:

```bash
node --test tests/*.test.mjs
for file in *.mjs tests/*.mjs; do node --check "$file"; done
git diff --check
git status --short --branch
```

Expected: all tests PASS, checks exit 0, no unstaged implementation files, and only the expected task commits ahead of `origin/main`.

- [ ] **Step 3: Verify publication after authorized push**

After push, confirm GitHub Pages reports `built` for the exact final commit and verify that the served HTML, modules, and CSS include `post-stack`, `instagram-post-stack.png`, the 1080 × 1440 definition, and the 8 px geometry.
