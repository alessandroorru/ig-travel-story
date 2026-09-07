# Travel Story Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one dependency-free HTML page that compares three reusable 9:16 Instagram Story themes using the same travel recap content.

**Architecture:** A static `index.html` contains the three semantic Story compositions and references one shared local image. A single `styles.css` supplies theme-specific layouts plus the responsive comparison page. A Node standard-library test verifies the durable structural contract without introducing a package manager.

**Tech Stack:** HTML5, CSS, Node.js built-in test runner, macOS `sips` for the one-time image crop.

**Spec:** `docs/superpowers/specs/2026-09-07-travel-story-themes-design.md`

## Global Constraints

- Use only HTML and CSS in the mockup; no JavaScript, framework, dependencies, or build step.
- Each Story uses the exact ratio `9 / 16`.
- All three themes share day `01 / 28`, title `Welcome to Beijing`, one local photograph, and the same three short observations.
- Show themes side by side when space allows and stack them on narrow screens.
- Do not add editing, persistence, export, authentication, backend, or Instagram publishing behavior.

---

### Task 1: Static three-theme comparison

**Files:**
- Create: `assets/beijing-ducks.jpg`
- Create: `index.html`
- Create: `styles.css`
- Create: `tests/mockup.test.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: source screenshot at `/Users/alessandro.orru/Downloads/Screenshot 2026-09-07 (18.56.19).png`
- Produces: three `<article class="story">` elements with `data-theme="notebook"`, `data-theme="cinema"`, and `data-theme="archive"`; each includes `.story__day`, `.story__title`, `.story__photo`, and exactly three `.story__note` elements.

- [ ] **Step 1: Write the failing structural test**

Create `tests/mockup.test.mjs` using only `node:test`, `node:assert/strict`, and `node:fs`. Read `index.html` and `styles.css`, then assert:

```js
assert.equal((html.match(/<article\b[^>]*class="story/g) ?? []).length, 3);
for (const theme of ['notebook', 'cinema', 'archive']) {
  assert.match(html, new RegExp(`data-theme="${theme}"`));
}
assert.equal((html.match(/class="story__note"/g) ?? []).length, 9);
assert.equal((html.match(/Welcome to Beijing/g) ?? []).length, 3);
assert.match(css, /aspect-ratio:\s*9\s*\/\s*16/);
assert.match(html, /assets\/beijing-ducks\.jpg/);
```

- [ ] **Step 2: Run the test and verify the initial failure**

Run: `node --test tests/mockup.test.mjs`

Expected: FAIL because `index.html` and `styles.css` do not exist.

- [ ] **Step 3: Create the local photographic asset**

Use `sips` to crop the upper central photograph from the provided screenshot into `assets/beijing-ducks.jpg`. Verify with `sips -g pixelWidth -g pixelHeight assets/beijing-ducks.jpg` and visually inspect the result; the crop must contain the hanging ducks and storefront without the lower title or observations.

- [ ] **Step 4: Implement the minimal semantic HTML**

Create a document with a short comparison heading followed by a `.theme-grid`. Add one Story article per theme. Repeat the exact fixture content in each article so the file remains directly editable:

```html
<p class="story__day">Day 01 / 28</p>
<h2 class="story__title">Welcome to Beijing</h2>
<img class="story__photo" src="assets/beijing-ducks.jpg" alt="Anatre arrosto esposte in una vetrina di Pechino">
<ul class="story__notes">
  <li class="story__note">Tre voli e cinque ore di sonno.</li>
  <li class="story__note">La città è già silenziosa: quasi tutte le auto sono elettriche.</li>
  <li class="story__note">Prima scoperta gastronomica: l'anatra alla pechinese.</li>
</ul>
```

- [ ] **Step 5: Implement the comparison layout and three visual systems**

In `styles.css`, define shared sizing and accessibility first: `box-sizing`, body defaults, `.theme-grid`, `.story { aspect-ratio: 9 / 16; overflow: hidden; }`, fluid type with `clamp()`, and a one-column breakpoint. Then implement these distinct theme tokens and compositions:

- Notebook: paper-white and graphite with a persimmon accent; inset photo, oversized day marker, editorial title, ruled-note treatment.
- Cinema: true black and white with signal red; edge-to-edge photo, controlled dark gradient, title over image, notes in a solid lower panel.
- Archive: cartographic blue and pale grey with orange indexing marks; visible grid, labelled sections, photo mounted as evidence, compact information hierarchy.

Avoid animations, controls, ornamental cards, external fonts, and CSS that is not visible in the final mockup.

- [ ] **Step 6: Run the structural test**

Run: `node --test tests/mockup.test.mjs`

Expected: 1 test passes, 0 failures.

- [ ] **Step 7: Document how to view the mockup**

Create `README.md` with the project purpose, the three theme names, and one command:

```bash
python3 -m http.server 8000
```

Document that the page is available at `http://localhost:8000` and contains no production editing/export functionality.

- [ ] **Step 8: Perform visual verification**

Serve the folder locally and capture the page at a desktop viewport wide enough to compare all themes and at a narrow mobile viewport. Confirm that every Story remains 9:16, no text clips, the photograph remains legible, and the themes are visually distinct.

- [ ] **Step 9: Final verification**

Run: `node --test tests/mockup.test.mjs`

Expected: 1 test passes, 0 failures. No commit step is included because the working directory is not a Git repository.
