# Four-Photo Clockwise Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate 1080 × 1440 Instagram Post template with four independently cropped photos ordered clockwise from the top-left.

**Architecture:** Extend the existing data-driven Post layout model from one two-slot layout to two template-keyed layouts. Keep one shared renderer and one shared interaction pipeline; store media state per Post template so switching between the two- and four-photo templates never overwrites images or crops.

**Tech Stack:** Static HTML/CSS, native ES modules, Canvas 2D, Node built-in test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-05-four-photo-clockwise-stack-design.md`

## Global Constraints

- The new template is a separate gallery card named `Stack fotografico ×4` with a compact `Post` badge.
- Output is exactly 1080 × 1440 px with an 8 px outer border and 8 px central vertical and horizontal separators.
- Frame order is clockwise from top-left: `topLeft`, `topRight`, `bottomRight`, `bottomLeft`.
- Exact frames are `(8,8,528,708)`, `(544,8,528,708)`, `(544,724,528,708)`, `(8,724,528,708)`.
- All four photos are required for export; each owns independent image, zoom, offsets, request token, and object URL.
- Existing Story templates and the existing two-photo Post geometry and behavior remain unchanged.
- One-finger scrolling stays native; pointer, keyboard, and same-frame two-finger gestures affect only one selected slot.
- The preview-only active-frame guide must never appear in the PNG.
- Export filename is `instagram-post-stack-4.png`.
- Preserve the existing best-effort Display-P3/float16 request, actual context reporting, and sRGB fallback; never claim guaranteed HDR or gain-map preservation.
- No persistence, backend, dependency, or user/reference image asset is added.

## Review Focus

- A late decode from one four-photo input must not replace a newer file or invalidate any sibling slot; Task 2 adds an out-of-order load regression.
- Switching repeatedly between two-photo and four-photo Post templates must restore each template's active slot and all crop state; Task 2 pins this behavior.
- Touches crossing frames or beginning on either 8 px separator must not acquire a gesture; Task 3 covers both separators and cross-frame pairs.
- Keyboard-only users must be able to select all four slots and independently zoom, move, and recenter them; Task 3 covers native button activation and sibling preservation.
- Canvas exceptions or invalid image dimensions must not leak clip/state or paint over white borders; Task 1 adds renderer restoration and empty-slot coverage.

---

## File structure

- `template-definitions.mjs`: adds the new catalog entry and output metadata.
- `post-stack-geometry.mjs`: owns both immutable Post layouts, template lookup, and template-aware hit testing.
- `story-renderer.mjs`: renders any supplied Post layout through the existing clipped cover pipeline.
- `index.html`: adds the fourth gallery card and the four numbered upload/selection controls.
- `styles.css`: adds only the new 2 × 2 thumbnail and compact four-way selector styling.
- `app.mjs`: generalizes Post media state, loading, validation, presentation, interaction routing, and filename selection by template.
- `tests/template-definitions.test.mjs`, `tests/post-stack-geometry.test.mjs`, `tests/renderer.test.mjs`, `tests/app-structure.test.mjs`, `tests/touch-geometry.test.mjs`: TDD coverage for the new catalog, geometry, rendering, async state, accessibility, gestures, and export.
- `README.md`: documents the fourth template and its four-photo controls without changing the HDR caveat.

### Task 1: Template catalog, geometry, and renderer

**Files:**
- Modify: `template-definitions.mjs`
- Modify: `post-stack-geometry.mjs`
- Modify: `story-renderer.mjs`
- Test: `tests/template-definitions.test.mjs`
- Test: `tests/post-stack-geometry.test.mjs`
- Test: `tests/renderer.test.mjs`

**Interfaces:**
- Produces: `POST_STACK_4_LAYOUT`, `getPostLayout(templateId)`, and `postSlotAtPoint(templateId, x, y)`.
- Produces: `renderPostStack(context, postSlots, layout)` with the existing two-photo layout as the default.
- Produces: `getTemplateDefinition('post-stack-4')` returning `{ width: 1080, height: 1440, format: 'post' }` plus the template's export metadata.

- [ ] **Step 1: Write failing catalog and geometry tests**

  Assert the new definition, four exact frames, clockwise key order, 8 px white regions, template-aware hit testing, and `null` on borders, both separators, non-finite values, and unknown templates.

- [ ] **Step 2: Run the focused tests and confirm RED**

  Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/template-definitions.test.mjs tests/post-stack-geometry.test.mjs`

  Expected: failure because `post-stack-4`, `POST_STACK_4_LAYOUT`, and template-aware hit testing do not exist.

- [ ] **Step 3: Implement immutable template-keyed Post layouts**

  Keep the existing two-photo values exact. Add `POST_STACK_4_LAYOUT` with frame insertion order `topLeft`, `topRight`, `bottomRight`, `bottomLeft`; make unknown layout lookup fall back safely to the existing two-photo layout.

- [ ] **Step 4: Write failing renderer tests**

  Assert four independent draw placements and clips, untouched 8 px outer/cross regions, skipped invalid/empty siblings, and restored canvas state when any draw throws.

- [ ] **Step 5: Generalize `renderPostStack(context, postSlots, layout = POST_STACK_LAYOUT)`**

  Iterate the supplied layout frames; keep the existing cover-placement and nested save/restore behavior.

- [ ] **Step 6: Run focused and full tests**

  Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/template-definitions.test.mjs tests/post-stack-geometry.test.mjs tests/renderer.test.mjs`

  Then: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

  Expected: all pass with the existing two-photo assertions unchanged.

- [ ] **Step 7: Commit**

  Commit subject: `feat(post-stack): define four-photo post layout`

### Task 2: Four-photo UI, isolated media state, and export

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.mjs`
- Test: `tests/app-structure.test.mjs`

**Interfaces:**
- Consumes: `getPostLayout(templateId)` and the new `post-stack-4` definition from Task 1.
- Produces: template-keyed Post media state containing `activeSlot` and `slots` for both `post-stack` and `post-stack-4`.
- Produces: DOM IDs `post-stack-4-fields`, `post-photo-top-left`, `post-photo-top-right`, `post-photo-bottom-right`, `post-photo-bottom-left`, and matching `post-select-*` buttons scoped to the four-photo template.

- [ ] **Step 1: Write failing markup and presentation tests**

  Assert the fourth visual radio/card, exact name and `Post` badge, clockwise numbered labels, four native `type=button` selectors with synchronized `aria-pressed`, and visibility limited to `post-stack-4`.

- [ ] **Step 2: Write failing state and async-load tests**

  Load all four slots, replace them out of order, reject one file, and assert request-token/URL isolation. Switch repeatedly between both Post templates and assert that each restores its own images, crop values, and active slot.

- [ ] **Step 3: Implement template-keyed Post state and data-driven bindings**

  Refactor the existing two hard-coded Post upload/selector paths into small maps/loops shared by both Post templates. Do not change Story media state or introduce a second interaction state.

- [ ] **Step 4: Write failing validation/export tests**

  Assert that four-photo export requires exactly four valid images, remains unavailable after one slot fails without discarding valid siblings, produces a 1080 × 1440 canvas and `instagram-post-stack-4.png`, and keeps Web Share synchronous before the first await.

- [ ] **Step 5: Implement validation, redraw, and export routing**

  Route by selected template definition/layout; preserve the existing Display-P3 context creation and download/share fallbacks.

- [ ] **Step 6: Run focused and full tests**

  Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/app-structure.test.mjs`

  Then: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

  Expected: all pass; existing Story and two-photo Post tests remain green.

- [ ] **Step 7: Commit**

  Commit subject: `feat(post-stack): add four-photo template controls`

### Task 3: Independent interactions, documentation, and browser verification

**Files:**
- Modify: `app.mjs`
- Modify: `styles.css`
- Modify: `touch-geometry.mjs` only if a pure template-frame helper is required
- Modify: `README.md`
- Test: `tests/app-structure.test.mjs`
- Test: `tests/touch-geometry.test.mjs` only if `touch-geometry.mjs` changes

**Interfaces:**
- Consumes: template-keyed active media and `postSlotAtPoint(templateId, x, y)`.
- Produces: pointer, keyboard, zoom, recenter, selection-guide, and two-finger gesture behavior shared by both Post layouts.

- [ ] **Step 1: Write failing pointer and keyboard regressions**

  Select each of the four frames through native buttons and pointer starts; verify zoom, arrows, drag, and recenter change only that slot while all siblings retain their crop.

- [ ] **Step 2: Write failing touch regressions**

  Assert same-frame pinch/pan for every quadrant, ignored cross-frame pairs, ignored vertical/horizontal separator starts, native one-finger scroll, and gesture cancellation when switching templates.

- [ ] **Step 3: Generalize interaction routing**

  Resolve the current layout and media state once per interaction. Keep pointer targets locked to the frame where pointerdown began and touch gestures locked to a valid same-frame pair.

- [ ] **Step 4: Update styling and README**

  Add the 2 × 2 card preview and compact selector layout with visible focus/selected states. Document clockwise order, independent crop, 1080 × 1440 output, and the existing truthful Display-P3/HDR limitation.

- [ ] **Step 5: Run complete static verification**

  Run: `/Users/alessandro.orru/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs`

  Run syntax checks for every root/test `.mjs`, then `git diff --check`.

  Expected: zero failures and a clean diff check.

- [ ] **Step 6: Verify in desktop and mobile browser**

  Use generated temporary test images only. Confirm clockwise labels, independent crop/zoom, keyboard activation, one-finger scroll, four same-frame pinches, ignored cross/separator gestures, repeated template switching, no horizontal overflow, and no console errors.

  Export and decode the PNG: assert 1080 × 1440, every required border/separator pixel is white, and the preview guide is absent.

- [ ] **Step 7: Commit**

  Commit subject: `feat(post-stack): complete four-photo interactions`

### Task 4: Whole-feature review and publication readiness

**Files:**
- Review all files changed since the plan baseline.

**Interfaces:**
- Consumes: complete implementation and task reports.
- Produces: final review verdict and exact verification evidence; production code changes only through a failing-test fix loop.

- [ ] **Step 1: Run an independent whole-branch review**

  Check spec/plan alignment, reasonable user expectations, geometry, async races, accessibility, gesture lifecycle, color claims, Story/two-photo regressions, and test quality.

- [ ] **Step 2: Resolve every Critical/Important finding through the scoped fix loop**

  Add a failing regression before each fix and perform one scoped re-review of each fix wave.

- [ ] **Step 3: Run final verification on the exact commit to publish**

  Run the full tests, syntax checks, `git diff --check`, and confirm a clean worktree.

- [ ] **Step 4: Integrate, push, and verify GitHub Pages when authorized**

  Confirm the remote commit, wait for the matching Pages build to report `built`, and compare the published core files byte-for-byte with the local commit.
