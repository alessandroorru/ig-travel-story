import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const appUrl = new URL('../app.mjs', import.meta.url);
const app = existsSync(appUrl) ? readFileSync(appUrl, 'utf8') : '';
const renderer = readFileSync(new URL('../story-renderer.mjs', import.meta.url), 'utf8');

const fourPhotoSlots = [
  ['top-left', 'Foto 1 · Alto a sinistra'],
  ['top-right', 'Foto 2 · Alto a destra'],
  ['bottom-right', 'Foto 3 · Basso a destra'],
  ['bottom-left', 'Foto 4 · Basso a sinistra'],
];

function elementWithId(tagName, id) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i'));
  assert.ok(match, `missing ${tagName}#${id}`);
  return match[0];
}

function assertAttribute(element, name, value) {
  assert.match(element, new RegExp(`\\b${name}=["']${value}["']`, 'i'));
}

function assertVisibleLabel(id) {
  const match = html.match(new RegExp(`<label\\b[^>]*\\bfor=["']${id}["'][^>]*>([\\s\\S]*?)<\\/label>`, 'i'));
  assert.ok(match, `missing visible label for #${id}`);
  assert.match(match[1].replace(/<[^>]+>/g, '').trim(), /\S/);
}

test('exposes the complete labelled editing form with exact input contracts', () => {
  const fields = [
    ['input', 'photo', { type: 'file', accept: 'image/\\*' }],
    ['input', 'day', { type: 'number', min: '1', max: '999', step: '1', value: '1' }],
    ['input', 'total-days', { type: 'number', min: '1', max: '999', step: '1', value: '35' }],
    ['input', 'title', { type: 'text', maxlength: '42' }],
    ['textarea', 'note-1', {}],
    ['textarea', 'note-2', {}],
    ['textarea', 'note-3', {}],
    ['input', 'zoom', { type: 'range', min: '1', max: '3', step: '0.01', value: '1' }],
  ];

  for (const [tagName, id, attributes] of fields) {
    const element = elementWithId(tagName, id);
    assertVisibleLabel(id);
    for (const [name, value] of Object.entries(attributes)) {
      assertAttribute(element, name, value);
    }
  }

  assert.match(elementWithId('input', 'title'), /value=["']Welcome to Kuala Lumpur["']/);
  for (const id of ['note-1', 'note-2', 'note-3']) {
    assert.doesNotMatch(elementWithId('textarea', id), /\bmaxlength=/i);
  }
  assert.match(elementWithId('button', 'recenter'), /type=["']button["']/);
  assert.match(elementWithId('button', 'download'), /type=["']button["'][^>]*\bdisabled\b/);
});

test('uses a Template studio eyebrow and a visible template title above composition controls', () => {
  assert.match(html, /<p[^>]*class=["']eyebrow["'][^>]*>\s*Template studio\s*<\/p>/i);
  const editorTitle = elementWithId('h2', 'editor-title');
  assert.doesNotMatch(editorTitle, /\bclass=["']eyebrow["']/i);
  assert.match(html, /<h2[^>]*\bid=["']editor-title["'][^>]*>\s*Instagram Template Generator\s*<\/h2>/i);
  assert.doesNotMatch(html, /Racconta il viaggio, un giorno alla volta\./i);
  assert.match(
    html,
    /La foto viene elaborata su questo dispositivo e condivisa solo se scegli un destinatario\./i,
  );

  const photoIndex = html.indexOf('id="photo"');
  const zoomIndex = html.indexOf('id="zoom"');
  const recenterIndex = html.indexOf('id="recenter"');
  const dayIndex = html.indexOf('id="day"');
  assert.ok(photoIndex < zoomIndex, 'zoom must follow the photo upload');
  assert.ok(zoomIndex < recenterIndex, 'recenter must remain with zoom controls');
  assert.ok(recenterIndex < dayIndex, 'zoom controls must precede the day fields');
});

test('provides a global hidden h1 before the responsive h2 sections', () => {
  const globalTitle = html.match(/<h1\s+class=["']visually-hidden["']>Instagram Template Generator<\/h1>/i);
  assert.ok(globalTitle, 'missing visually-hidden global h1');

  const mainStart = html.indexOf('<main class="app-shell">');
  const globalTitleIndex = html.indexOf(globalTitle[0]);
  const editorTitleIndex = html.indexOf('id="editor-title"');
  const previewTitleIndex = html.indexOf('id="preview-title"');
  assert.ok(mainStart < globalTitleIndex, 'global h1 must be the first main child');
  assert.ok(globalTitleIndex < editorTitleIndex, 'global h1 must precede editor h2');
  assert.ok(globalTitleIndex < previewTitleIndex, 'global h1 must precede preview h2');
  assert.match(html, /<h2[^>]*\bid=["']preview-title["'][^>]*>1080 × 1920<\/h2>/);

  const hiddenStyles = css.match(/\.visually-hidden\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(hiddenStyles, /\bposition:\s*absolute\b/);
  assert.match(hiddenStyles, /\boverflow:\s*hidden\b/);
  assert.match(hiddenStyles, /\bclip:/);
  assert.doesNotMatch(hiddenStyles, /\bdisplay\s*:\s*none\b/);
});

test('provides an accessible 1080 by 1920 preview and live status', () => {
  assert.match(html, /<canvas[^>]+width=["']1080["'][^>]+height=["']1920["'][^>]+id=["']story-canvas["']/);

  const canvas = elementWithId('canvas', 'story-canvas');
  assertAttribute(canvas, 'role', 'img');
  assertAttribute(canvas, 'tabindex', '0');
  assert.match(canvas, /aria-(?:label|labelledby)=["'][^"']+["']/);
  assert.match(canvas, /aria-describedby=["'][^"']+["']/);

  const status = elementWithId('p', 'status');
  assertAttribute(status, 'aria-live', 'polite');
  assert.match(html, /id=["']canvas-instructions["'][^>]*>[\s\S]*trascin/i);
});

test('layers a non-interactive preview-only story overlay above the canvas', () => {
  const stage = html.match(/<div class=["']canvas-stage["']>([\s\S]*?)<\/div>\s*<\/section>/i);
  assert.ok(stage, 'missing canvas stage');
  assert.ok(stage[1].indexOf('id="story-canvas"') < stage[1].indexOf('id="instagram-preview-overlay"'));

  const overlay = elementWithId('svg', 'instagram-preview-overlay');
  assertAttribute(overlay, 'viewBox', '0 0 1080 1920');
  assertAttribute(overlay, 'aria-hidden', 'true');
  assertAttribute(overlay, 'focusable', 'false');
  assert.match(overlay, /class=["']instagram-preview-overlay["']/);
  assert.match(html, /<rect\s+x=["']20["']\s+y=["']20["']\s+width=["']1040["']\s+height=["']5["']\s+rx=["']2\.5["']/i);
  assert.match(html, /<rect\s+x=["']20["']\s+y=["']20["']\s+width=["']645["']\s+height=["']5["']\s+rx=["']2\.5["']/i);
  assert.match(
    html,
    /<text\s+x=["']135["']\s+y=["']94["'][^>]*font-size=["']32["']\s+font-weight=["']700["'][^>]*>La tua storia<\/text>/i,
  );
  assert.match(
    html,
    /<text\s+x=["']351["']\s+y=["']94["'][^>]*font-size=["']32["']\s+font-weight=["']400["'][^>]*opacity=["']\.78["'][^>]*>12 s<\/text>/i,
  );
  assert.match(html, />Rispondi</);

  const stageStyles = css.match(/\.canvas-stage\s*\{([^}]*)\}/s)?.[1] ?? '';
  const canvasStyles = css.match(/#story-canvas\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(stageStyles, /\bposition:\s*relative\b/);
  assert.match(stageStyles, /\baspect-ratio:\s*9\s*\/\s*16\b/);
  assert.match(stageStyles, /\bbox-shadow:/);
  assert.doesNotMatch(stageStyles, /\boverflow:/);
  assert.doesNotMatch(canvasStyles, /\bbox-shadow:/);
  assert.match(css, /\.instagram-preview-overlay\s*\{[^}]*\bposition:\s*absolute\b[^}]*\binset:\s*0\b[^}]*\bz-index:\s*2\b[^}]*\boverflow:\s*hidden\b[^}]*\bpointer-events:\s*none\b/s);
  assert.doesNotMatch(renderer, /overlay/i);
  assert.doesNotMatch(app.slice(app.indexOf('async function exportStory'), app.indexOf('function drawEmptyCanvas')), /instagram-preview-overlay|post-selection-guide/i);
});

test('loads only local app assets under a network-blocking content policy', () => {
  assert.match(html, /<link[^>]+href=["']styles\.css["']/);
  assert.match(html, /<script[^>]+type=["']module["'][^>]+src=["']app\.mjs["']/);
  assert.doesNotMatch(html, /https?:\/\//i);

  const policy = html.match(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/i);
  assert.ok(policy, 'missing Content Security Policy');
  assert.match(policy[1], /connect-src\s+'none'/);
  assert.match(policy[1], /img-src\s+'self'\s+blob:\s+data:/);
});

test('keeps state ephemeral and does not install network or persistence APIs', () => {
  assert.doesNotMatch(app, /\b(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest|fetch|sendBeacon|serviceWorker)\b/);
  assert.doesNotMatch(app, /document\.cookie/);
  assert.match(app, /const\s+state\s*=\s*\{/);
  assert.match(app, /URL\.createObjectURL\(/);
  assert.match(app, /URL\.revokeObjectURL\(/);
});

test('wires pointer drag, keyboard movement and continuous zoom', () => {
  for (const eventName of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    assert.match(app, new RegExp(`canvas\\.addEventListener\\(['"]${eventName}['"]`));
  }

  assert.match(app, /canvas\.setPointerCapture\(/);
  assert.match(app, /canvas\.addEventListener\(['"]keydown['"]/);
  assert.match(app, /event\.shiftKey\s*\?\s*48\s*:\s*12/);
  assert.match(app, /zoomInput\.addEventListener\(['"]input['"]/);
  assert.doesNotMatch(app, /zoomInput\.addEventListener\(['"]change['"]/);
  assert.match(app, /computeImagePlacement\(/);
});

test('uses responsive local styling with visible focus and canvas-only gesture capture', () => {
  assert.match(css, /grid-template-columns:\s*minmax\([^;]+\)\s+minmax\(/);
  assert.match(css, /@media\s*\(max-width:\s*60rem\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /#story-canvas\s*\{[^}]*touch-action:\s*pan-y/s);
  assert.equal((css.match(/touch-action:\s*none/g) ?? []).length, 0);
  assert.match(html, /<p class=["']zoom-touch-hint["']>Usa due dita per spostare e ingrandire la foto\.<\/p>/);
  assert.match(css, /\.zoom-touch-hint\s*\{[^}]*\bdisplay:\s*none\b/s);
  assert.match(css, /@media\s*\(max-width:\s*60rem\)\s*\{[\s\S]*?\.field--zoom\s+\.field__heading\s*,\s*\.field--zoom\s+input\[type=["']range["']\]\s*\{[^}]*\bdisplay:\s*none\b/s);
  assert.match(css, /@media\s*\(max-width:\s*60rem\)\s*\{[\s\S]*?\.zoom-touch-hint\s*\{[^}]*\bdisplay:\s*block\b/s);
  assert.doesNotMatch(css, /@import|url\s*\(/i);
});

test('keeps editor first in the base DOM without visual reordering CSS', () => {
  assert.ok(
    html.indexOf('<section class="editor"') < html.indexOf('<section class="preview"'),
    'desktop reading and tab order must reach the editor before the preview',
  );
  assert.doesNotMatch(css, /\.editor\s*\{[^}]*\bgrid-(?:column|row):/s);
  assert.doesNotMatch(css, /\.preview\s*\{[^}]*\bgrid-(?:column|row):/s);
  assert.doesNotMatch(css, /\border\s*:/);
});

test('keeps PNG export unavailable in markup until a valid photo is loaded', () => {
  assert.match(elementWithId('button', 'download'), /\bdisabled\b/);
});

test('offers two accessible visual story template radios without a select', () => {
  const cinema = elementWithId('input', 'template-cinema');
  const postcard = elementWithId('input', 'template-postcard');

  assertAttribute(cinema, 'type', 'radio');
  assertAttribute(cinema, 'name', 'template');
  assertAttribute(cinema, 'value', 'cinema');
  assert.match(cinema, /\bchecked\b/);
  assertAttribute(postcard, 'type', 'radio');
  assertAttribute(postcard, 'name', 'template');
  assertAttribute(postcard, 'value', 'postcard');
  assert.match(html, /<label[^>]*for=["']template-cinema["'][^>]*>[\s\S]*?Fotogramma/i);
  assert.match(html, /<label[^>]*for=["']template-postcard["'][^>]*>[\s\S]*?Cartolina corsiva/i);
  assert.match(html, /id=["']cinema-fields["']/);
  assert.match(html, /id=["']postcard-fields["'][^>]*\bhidden\b/);
  assert.match(elementWithId('textarea', 'center-text'), /name=["']center-text["']/);
  assert.doesNotMatch(html, /<select\b/i);

  assert.match(css, /\.template-picker__radio:checked\s*\+\s*\.template-option\s*\{[^}]*border-color:\s*#ff3b30/s);
  assert.match(css, /\.template-picker__radio:checked\s*\+\s*\.template-option\s+\.template-option__check\s*\{[^}]*opacity:\s*1/s);
  assert.match(css, /@media\s*\(max-width:\s*60rem\)\s*\{[\s\S]*?\.template-picker__options\s*\{[^}]*overflow-x:\s*auto/s);
});

class FakeElement {
  constructor(value = '') {
    this.value = value;
    this.files = [];
    this.disabled = true;
    this.textContent = '';
    this.listeners = new Map();
    this.listenerOptions = new Map();
    this.focusCalls = 0;
    this.pointerCaptures = [];
    this.attributes = new Map();
    this.style = {};
    this.hidden = false;
  }

  addEventListener(type, listener, options) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
    const optionsForType = this.listenerOptions.get(type) ?? [];
    optionsForType.push(options);
    this.listenerOptions.set(type, optionsForType);
  }

  emit(type, event = {}) {
    return (this.listeners.get(type) ?? []).map((listener) => (
      listener({ target: this, ...event })
    ));
  }

  setAttribute(name, value) { this.attributes.set(name, value); }
  toggleAttribute(name, enabled) {
    if (enabled) this.attributes.set(name, '');
    else this.attributes.delete(name);
    if (name === 'hidden') this.hidden = enabled;
  }
  focus() { this.focusCalls += 1; }
  setPointerCapture(pointerId) { this.pointerCaptures.push(pointerId); }
  releasePointerCapture() {}
  hasPointerCapture() { return false; }
}

class FakeContainer extends FakeElement {
  constructor(children) {
    super();
    this.children = [...children];
  }

  insertBefore(node, referenceNode) {
    const currentIndex = this.children.indexOf(node);
    if (currentIndex >= 0) this.children.splice(currentIndex, 1);
    const referenceIndex = this.children.indexOf(referenceNode);
    this.children.splice(referenceIndex < 0 ? this.children.length : referenceIndex, 0, node);
  }
}

function createAppFixture() {
  const drawImageCalls = [];
  const textCalls = [];
  const context = {
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    setLineDash() {},
    fillText(...args) { textCalls.push(args); },
    drawImage(...args) { drawImageCalls.push(args); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    measureText(value) { return { width: [...value].length * 20 }; },
  };
  const editor = new FakeElement();
  const preview = new FakeElement();
  const appShell = new FakeContainer([editor, preview]);
  const elements = new Map([
    ['.app-shell', appShell],
    ['.editor', editor],
    ['.preview', preview],
    ['#story-form', new FakeElement()],
    ['#template-cinema', Object.assign(new FakeElement('cinema'), { checked: true })],
    ['#template-postcard', Object.assign(new FakeElement('postcard'), { checked: false })],
    ['#template-post-stack', Object.assign(new FakeElement('post-stack'), { checked: false })],
    ['#template-post-stack-4', Object.assign(new FakeElement('post-stack-4'), { checked: false })],
    ['#story-photo-fields', new FakeElement()],
    ['#post-stack-fields', Object.assign(new FakeElement(), { hidden: true })],
    ['#post-stack-4-fields', Object.assign(new FakeElement(), { hidden: true })],
    ['#preview-title', new FakeElement()],
    ['#canvas-instructions', new FakeElement()],
    ['#instagram-preview-overlay', new FakeElement()],
    ['#post-selection-guide', Object.assign(new FakeElement(), { hidden: true })],
    ['.canvas-stage', new FakeElement()],
    ['#cinema-fields', new FakeElement()],
    ['#postcard-fields', Object.assign(new FakeElement(), { hidden: true })],
    ['#photo', new FakeElement()],
    ['#day', new FakeElement('1')],
    ['#total-days', new FakeElement('35')],
    ['#title', new FakeElement('Welcome to Kuala Lumpur')],
    ['#note-1', new FakeElement()],
    ['#note-2', new FakeElement()],
    ['#note-3', new FakeElement()],
    ['#center-text', new FakeElement()],
    ['#zoom', new FakeElement('1')],
    ['#zoom-value', new FakeElement('1,00×')],
    ['#recenter', new FakeElement()],
    ['#download', new FakeElement()],
    ['#status', new FakeElement()],
    ['#story-canvas', new FakeElement()],
  ]);
  for (const [slot, label] of [['top', 'Foto superiore'], ['bottom', 'Foto inferiore'], ...fourPhotoSlots]) {
    elements.set(`#post-photo-${slot}`, Object.assign(new FakeElement(), { labels: [{ textContent: label }] }));
    elements.set(`#post-select-${slot}`, Object.assign(new FakeElement(), { disabled: false }));
  }

  const canvas = elements.get('#story-canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  canvas.clientWidth = 540;
  canvas.clientHeight = 960;
  canvas.getContext = () => context;
  canvas.getBoundingClientRect = () => ({ left: 100, top: 200, width: 540, height: 960 });

  const images = [];
  class FakeImage extends FakeElement {
    constructor() {
      super();
      this.naturalWidth = 1080;
      this.naturalHeight = 1920;
      images.push(this);
    }
  }

  return {
    context,
    drawImageCalls,
    elements,
    images,
    FakeImage,
    textCalls,
    appShell,
    editor,
    preview,
  };
}

function replaceGlobal(name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  return () => {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete globalThis[name];
    }
  };
}

class FakeShareFile extends Blob {
  constructor(parts, name, options) {
    super(parts, options);
    this.name = name;
  }
}

function loadFixturePhoto(fixture) {
  const photo = fixture.elements.get('#photo');
  photo.files = [{ type: 'image/jpeg' }];
  photo.emit('change');
  fixture.images[0].emit('load');
}

test('uses a file-share capability probe to choose the export button label', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const restoreNavigator = replaceGlobal('navigator', {
    share() {},
    canShare(payload) {
      assert.equal(payload.files.length, 1);
      assert.equal(payload.files[0].type, 'image/png');
      return true;
    },
  });
  const restoreFile = replaceGlobal('File', FakeShareFile);

  globalThis.document = { querySelector: (selector) => fixture.elements.get(selector) };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = { createObjectURL() {}, revokeObjectURL() {} };

  try {
    await import(`${appUrl.href}?share-label=${Date.now()}`);
    assert.equal(fixture.elements.get('#download').textContent, 'Salva o condividi PNG');
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
    restoreNavigator();
    restoreFile();
  }
});

test('switches templates without discarding values and lets postcard export despite an invalid cinema day', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const anchors = [];
  let nextUrl = 0;

  fixture.elements.get('#story-canvas').toBlob = (callback) => callback(new Blob(['png'], { type: 'image/png' }));
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => {
      const anchor = { href: '', download: '', click() {}, remove() {} };
      anchors.push(anchor);
      return anchor;
    },
    body: { append() {} },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:template-${++nextUrl}`,
    revokeObjectURL() {},
  };

  try {
    await import(`${appUrl.href}?template-switch=${Date.now()}`);
    loadFixturePhoto(fixture);
    const form = fixture.elements.get('#story-form');
    const cinema = fixture.elements.get('#template-cinema');
    const postcard = fixture.elements.get('#template-postcard');
    const day = fixture.elements.get('#day');
    const title = fixture.elements.get('#title');
    const note = fixture.elements.get('#note-1');
    const centerText = fixture.elements.get('#center-text');
    const download = fixture.elements.get('#download');

    day.value = '36';
    title.value = 'Cinema retained';
    note.value = 'A retained note';
    centerText.value = 'Cartolina\ncon casing';
    form.emit('input', { target: centerText });
    assert.equal(download.disabled, true);

    cinema.checked = false;
    postcard.checked = true;
    postcard.emit('change');
    assert.equal(fixture.elements.get('#cinema-fields').hidden, true);
    assert.equal(fixture.elements.get('#postcard-fields').hidden, false);
    assert.equal(download.disabled, false);
    assert.equal(title.value, 'Cinema retained');
    assert.equal(note.value, 'A retained note');
    assert.equal(centerText.value, 'Cartolina\ncon casing');
    assert.ok(fixture.textCalls.some(([value]) => value === 'Cartolina'));
    assert.ok(fixture.textCalls.some(([value]) => value === 'con casing'));

    await Promise.all(download.emit('click'));
    assert.equal(anchors.at(-1).download, 'travel-story-postcard.png');

    postcard.checked = false;
    cinema.checked = true;
    cinema.emit('change');
    assert.equal(fixture.elements.get('#cinema-fields').hidden, false);
    assert.equal(fixture.elements.get('#postcard-fields').hidden, true);
    assert.equal(download.disabled, true);
    assert.ok(fixture.textCalls.some(([value]) => value === 'CINEMA RETAINED'));
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('shares a PNG File without an anchor when file share is available', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  let sharedPayload;
  const restoreNavigator = replaceGlobal('navigator', {
    canShare: () => true,
    async share(payload) { sharedPayload = payload; },
  });
  const restoreFile = replaceGlobal('File', FakeShareFile);

  fixture.elements.get('#story-canvas').toDataURL = (type) => {
    assert.equal(type, 'image/png');
    return 'data:image/png;base64,cG5n';
  };
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => assert.fail('share success must not create a download anchor'),
    body: { append: () => assert.fail('share success must not append a download anchor') },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => 'blob:photo',
    revokeObjectURL: () => assert.fail('share success must not revoke an object URL'),
  };

  try {
    await import(`${appUrl.href}?share-success=${Date.now()}`);
    loadFixturePhoto(fixture);
    globalThis.URL.createObjectURL = () => assert.fail('share success must not create an object URL');
    const day = fixture.elements.get('#day');
    day.value = '7';
    fixture.elements.get('#story-form').emit('input', { target: day });
    await Promise.all(fixture.elements.get('#download').emit('click'));

    assert.deepEqual(Object.keys(sharedPayload), ['files']);
    assert.equal(sharedPayload.files[0] instanceof FakeShareFile, true);
    assert.equal(sharedPayload.files[0].name, 'travel-story-day-07.png');
    assert.equal(sharedPayload.files[0].type, 'image/png');
    assert.match(fixture.elements.get('#status').textContent, /PNG condiviso/i);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
    restoreNavigator();
    restoreFile();
  }
});

test('opens native file share in the click task before async canvas encoding', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  let sharedPayload;
  let toBlobCalls = 0;
  const restoreNavigator = replaceGlobal('navigator', {
    canShare: () => true,
    share(payload) {
      sharedPayload = payload;
      return Promise.resolve();
    },
  });
  const restoreFile = replaceGlobal('File', FakeShareFile);

  fixture.elements.get('#story-canvas').toDataURL = (type) => {
    assert.equal(type, 'image/png');
    return 'data:image/png;base64,cG5n';
  };
  fixture.elements.get('#story-canvas').toBlob = () => { toBlobCalls += 1; };
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => assert.fail('native share must not create a download anchor'),
    body: { append: () => assert.fail('native share must not append a download anchor') },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => 'blob:photo',
    revokeObjectURL: () => assert.fail('native share must not revoke an object URL'),
  };

  try {
    await import(`${appUrl.href}?share-click-task=${Date.now()}`);
    loadFixturePhoto(fixture);
    const day = fixture.elements.get('#day');
    day.value = '9';
    fixture.elements.get('#story-form').emit('input', { target: day });

    const pendingShare = Promise.all(fixture.elements.get('#download').emit('click'));

    assert.equal(toBlobCalls, 0, 'native share must be invoked before async canvas encoding');
    assert.deepEqual(Object.keys(sharedPayload), ['files']);
    assert.equal(sharedPayload.files[0] instanceof FakeShareFile, true);
    assert.equal(sharedPayload.files[0].name, 'travel-story-day-09.png');
    assert.equal(sharedPayload.files[0].type, 'image/png');
    await pendingShare;
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
    restoreNavigator();
    restoreFile();
  }
});

test('treats a cancelled share as a normal exit without a fallback download', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const restoreNavigator = replaceGlobal('navigator', {
    canShare: () => true,
    async share() { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); },
  });
  const restoreFile = replaceGlobal('File', FakeShareFile);

  fixture.elements.get('#story-canvas').toDataURL = () => 'data:image/png;base64,cG5n';
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => assert.fail('cancelled share must not fall back to download'),
    body: { append: () => assert.fail('cancelled share must not append a download anchor') },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = { createObjectURL: () => 'blob:photo' };

  try {
    await import(`${appUrl.href}?share-cancel=${Date.now()}`);
    loadFixturePhoto(fixture);
    globalThis.URL.createObjectURL = () => assert.fail('cancelled share must not create an object URL');
    await Promise.all(fixture.elements.get('#download').emit('click'));

    assert.doesNotMatch(fixture.elements.get('#status').textContent, /Impossibile|errore/i);
    assert.equal(fixture.elements.get('#download').disabled, false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
    restoreNavigator();
    restoreFile();
  }
});

test('falls back to a cleaned-up download when sharing fails', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const revokedUrls = [];
  const anchors = [];
  let shareCalls = 0;
  const restoreNavigator = replaceGlobal('navigator', {
    canShare: () => true,
    async share() {
      shareCalls += 1;
      throw new Error('share unavailable');
    },
  });
  const restoreFile = replaceGlobal('File', FakeShareFile);

  fixture.elements.get('#story-canvas').toDataURL = () => 'data:image/png;base64,cG5n';
  fixture.elements.get('#story-canvas').toBlob = (callback) => callback(new Blob(['png'], { type: 'image/png' }));
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => {
      const anchor = { href: '', download: '', clicked: false, click() { this.clicked = true; }, remove() {} };
      anchors.push(anchor);
      return anchor;
    },
    body: { append() {} },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => 'blob:fallback',
    revokeObjectURL: (url) => revokedUrls.push(url),
  };

  try {
    await import(`${appUrl.href}?share-fallback=${Date.now()}`);
    loadFixturePhoto(fixture);
    await Promise.all(fixture.elements.get('#download').emit('click'));

    assert.equal(shareCalls, 1);
    assert.equal(anchors[0].download, 'travel-story-day-01.png');
    assert.equal(anchors[0].clicked, true);
    assert.deepEqual(revokedUrls, ['blob:fallback']);
    assert.match(fixture.elements.get('#status').textContent, /PNG scaricato/i);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
    restoreNavigator();
    restoreFile();
  }
});

test('synchronizes the DOM order with mobile media changes', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const originalMatchMedia = globalThis.matchMedia;
  let changeListener;
  const mediaQuery = {
    matches: true,
    addEventListener(type, listener) {
      assert.equal(type, 'change');
      changeListener = listener;
    },
  };

  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = { createObjectURL() {}, revokeObjectURL() {} };
  globalThis.matchMedia = (query) => {
    assert.equal(query, '(max-width: 60rem)');
    return mediaQuery;
  };

  try {
    await import(`${appUrl.href}?responsive-order=${Date.now()}`);
    assert.deepEqual(fixture.appShell.children, [fixture.preview, fixture.editor]);

    changeListener({ matches: false });
    assert.deepEqual(fixture.appShell.children, [fixture.editor, fixture.preview]);

    changeListener({ matches: true });
    assert.deepEqual(fixture.appShell.children, [fixture.preview, fixture.editor]);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
    globalThis.matchMedia = originalMatchMedia;
  }
});

test('keeps single-touch scrolling native and applies continuous two-touch pan and pinch', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const originalMatchMedia = globalThis.matchMedia;
  let nextUrl = 0;

  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL() {},
  };
  globalThis.matchMedia = undefined;

  try {
    await import(`${appUrl.href}?two-touch=${Date.now()}`);
    const canvas = fixture.elements.get('#story-canvas');
    const photo = fixture.elements.get('#photo');
    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    fixture.images[0].naturalWidth = 2400;
    fixture.images[0].naturalHeight = 1600;
    fixture.images[0].emit('load');

    const singleTouch = { identifier: 1, clientX: 200, clientY: 300 };
    let singlePrevented = false;
    const beforeSingleTouch = fixture.drawImageCalls.length;
    canvas.emit('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 300 });
    canvas.emit('touchstart', { touches: [singleTouch] });
    canvas.emit('touchmove', {
      touches: [{ ...singleTouch, clientX: 240 }],
      preventDefault() { singlePrevented = true; },
    });
    assert.equal(singlePrevented, false);
    assert.equal(fixture.drawImageCalls.length, beforeSingleTouch);
    assert.equal(canvas.focusCalls, 0);
    assert.deepEqual(canvas.pointerCaptures, []);

    const firstPair = [
      { identifier: 1, clientX: 200, clientY: 300 },
      { identifier: 2, clientX: 300, clientY: 300 },
    ];
    canvas.emit('touchstart', { touches: firstPair });
    let twoTouchPrevented = false;
    canvas.emit('touchmove', {
      touches: [
        { identifier: 1, clientX: 220, clientY: 300 },
        { identifier: 2, clientX: 320, clientY: 300 },
      ],
      preventDefault() { twoTouchPrevented = true; },
    });
    assert.equal(twoTouchPrevented, true);
    assert.equal(fixture.drawImageCalls.at(-1)[1], -860);

    canvas.emit('touchmove', {
      touches: [
        { identifier: 1, clientX: 190, clientY: 300 },
        { identifier: 2, clientX: 350, clientY: 300 },
      ],
      preventDefault() {},
    });
    assert.equal(fixture.elements.get('#zoom').value, '1.6');
    assert.equal(fixture.elements.get('#zoom-value').value, '1,60×');
    assert.equal(fixture.drawImageCalls.at(-1)[1], -1580, 'pinch must remain anchored to the canvas center');

    canvas.emit('touchmove', {
      touches: [
        { identifier: 1, clientX: 100, clientY: 300 },
        { identifier: 2, clientX: 640, clientY: 300 },
      ],
      preventDefault() {},
    });
    assert.equal(fixture.elements.get('#zoom').value, '3');

    canvas.emit('touchend', { touches: [firstPair[0]] });
    const afterEnd = fixture.drawImageCalls.length;
    canvas.emit('touchmove', { touches: [firstPair[0]], preventDefault() { assert.fail('one touch must not block scrolling'); } });
    assert.equal(fixture.drawImageCalls.length, afterEnd);
    assert.ok(canvas.listenerOptions.get('touchmove').some((options) => options?.passive === false));
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
    globalThis.matchMedia = originalMatchMedia;
  }
});

test('uses the markup defaults in the first rendered story', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  let nextUrl = 0;

  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => assert.fail('must not create elements while rendering the initial story'),
    body: { append: () => assert.fail('must not append elements while rendering the initial story') },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL() {},
  };

  try {
    await import(`${appUrl.href}?default-story=${Date.now()}`);
    const photo = fixture.elements.get('#photo');
    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    fixture.images[0].emit('load');

    assert.equal(fixture.drawImageCalls.length, 1, 'must draw the loaded image');
    assert.ok(
      fixture.textCalls.some(([value]) => value === 'Day 01 / 35'),
      'the first render must use the 35-day default',
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('downloads the visible canvas as a named PNG and cleans up its object URL', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const appended = [];
  const revokedUrls = [];
  const anchors = [];
  const pngBlob = new Blob(['png'], { type: 'image/png' });
  let requestedType = null;
  let nextUrl = 0;

  fixture.elements.get('#story-canvas').toBlob = (callback, type) => {
    requestedType = type;
    callback(pngBlob);
  };

  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: (tagName) => {
      assert.equal(tagName, 'a');
      const anchor = {
        href: '',
        download: '',
        clicked: false,
        removed: false,
        click() { this.clicked = true; },
        remove() { this.removed = true; },
      };
      anchors.push(anchor);
      return anchor;
    },
    body: { append: (element) => appended.push(element) },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL: (url) => revokedUrls.push(url),
  };

  try {
    await import(`${appUrl.href}?download-success=${Date.now()}`);
    const photo = fixture.elements.get('#photo');
    const day = fixture.elements.get('#day');
    const download = fixture.elements.get('#download');

    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    fixture.images[0].emit('load');
    day.value = '7';
    fixture.elements.get('#story-form').emit('input', { target: day });

    assert.equal(download.disabled, false);
    await Promise.all(download.emit('click'));

    assert.equal(requestedType, 'image/png');
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].href, 'blob:test-2');
    assert.equal(anchors[0].download, 'travel-story-day-07.png');
    assert.equal(anchors[0].clicked, true);
    assert.equal(anchors[0].removed, true);
    assert.deepEqual(appended, anchors);
    assert.deepEqual(revokedUrls, ['blob:test-2']);
    assert.match(fixture.elements.get('#status').textContent, /PNG scaricato/i);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('reports a null PNG blob and leaves export available for retry', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  let nextUrl = 0;

  fixture.elements.get('#story-canvas').toBlob = (callback) => callback(null);
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => assert.fail('must not create a download link for a null blob'),
    body: { append: () => assert.fail('must not append a download link for a null blob') },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL() {},
  };

  try {
    await import(`${appUrl.href}?download-null=${Date.now()}`);
    const photo = fixture.elements.get('#photo');
    const download = fixture.elements.get('#download');
    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    fixture.images[0].emit('load');

    await Promise.all(download.emit('click'));

    assert.equal(
      fixture.elements.get('#status').textContent,
      "Impossibile creare il PNG. Riprova con un'altra immagine.",
    );
    assert.equal(download.disabled, false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('reports a failed download, cleans up and keeps export enabled', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const revokedUrls = [];
  const anchors = [];
  const pngBlob = new Blob(['png'], { type: 'image/png' });
  let nextUrl = 0;

  fixture.elements.get('#story-canvas').toBlob = (callback) => callback(pngBlob);
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => {
      const anchor = {
        href: '',
        download: '',
        removed: false,
        click() { throw new Error('download blocked'); },
        remove() { this.removed = true; },
      };
      anchors.push(anchor);
      return anchor;
    },
    body: { append() {} },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL: (url) => revokedUrls.push(url),
  };

  try {
    await import(`${appUrl.href}?download-error=${Date.now()}`);
    const photo = fixture.elements.get('#photo');
    const download = fixture.elements.get('#download');
    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    fixture.images[0].emit('load');

    await Promise.all(download.emit('click'));

    assert.equal(
      fixture.elements.get('#status').textContent,
      "Impossibile creare il PNG. Riprova con un'altra immagine.",
    );
    assert.equal(download.disabled, false);
    assert.equal(anchors[0].removed, true);
    assert.deepEqual(revokedUrls, ['blob:test-2']);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('a rejected file invalidates an earlier image that is still decoding', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const revokedUrls = [];
  let nextUrl = 0;

  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL: (url) => revokedUrls.push(url),
  };

  try {
    await import(`${appUrl.href}?stale-image=${Date.now()}`);
    const photo = fixture.elements.get('#photo');
    const download = fixture.elements.get('#download');
    const status = fixture.elements.get('#status');

    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    assert.equal(fixture.images.length, 1);

    photo.files = [{ type: 'text/plain' }];
    photo.emit('change');
    const rejectedStatus = status.textContent;

    fixture.images[0].emit('load');

    assert.match(rejectedStatus, /file immagine valido/i);
    assert.equal(status.textContent, rejectedStatus);
    assert.equal(fixture.drawImageCalls.length, 0);
    assert.equal(download.disabled, true);
    assert.deepEqual(revokedUrls, ['blob:test-1']);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('day-range validation stays authoritative across photo load and recenter', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  let nextUrl = 0;

  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL() {},
  };

  try {
    await import(`${appUrl.href}?range-status=${Date.now()}`);
    const form = fixture.elements.get('#story-form');
    const photo = fixture.elements.get('#photo');
    const day = fixture.elements.get('#day');
    const status = fixture.elements.get('#status');
    const download = fixture.elements.get('#download');

    day.value = '36';
    form.emit('input', { target: day });
    const validationMessage = status.textContent;
    assert.match(validationMessage, /non può superare i giorni totali/i);

    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    fixture.images[0].emit('load');
    assert.equal(status.textContent, validationMessage);

    fixture.elements.get('#recenter').emit('click');
    assert.equal(status.textContent, validationMessage);
    assert.equal(download.disabled, true);

    day.value = '35';
    form.emit('input', { target: day });
    assert.equal(status.textContent, '');
    assert.equal(download.disabled, false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('uses the day selected when PNG generation starts for the filename', async () => {
  const fixture = createAppFixture();
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalUrl = globalThis.URL;
  const pngBlob = new Blob(['png'], { type: 'image/png' });
  const anchors = [];
  let finishBlob;
  let nextUrl = 0;

  fixture.elements.get('#story-canvas').toBlob = (callback) => {
    finishBlob = callback;
  };
  globalThis.document = {
    querySelector: (selector) => fixture.elements.get(selector),
    createElement: () => {
      const anchor = {
        href: '',
        download: '',
        click() {},
        remove() {},
      };
      anchors.push(anchor);
      return anchor;
    },
    body: { append() {} },
  };
  globalThis.Image = fixture.FakeImage;
  globalThis.URL = {
    createObjectURL: () => `blob:test-${++nextUrl}`,
    revokeObjectURL() {},
  };

  try {
    await import(`${appUrl.href}?download-day-snapshot=${Date.now()}`);
    const form = fixture.elements.get('#story-form');
    const photo = fixture.elements.get('#photo');
    const day = fixture.elements.get('#day');
    const download = fixture.elements.get('#download');

    photo.files = [{ type: 'image/jpeg' }];
    photo.emit('change');
    fixture.images[0].emit('load');
    day.value = '7';
    form.emit('input', { target: day });

    const pendingDownload = Promise.all(download.emit('click'));
    assert.equal(typeof finishBlob, 'function');

    day.value = '8';
    form.emit('input', { target: day });
    finishBlob(pngBlob);
    await pendingDownload;

    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].download, 'travel-story-day-07.png');
  } finally {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.URL = originalUrl;
  }
});

test('offers a Post stack card with compact Story and Post badges', () => {
  for (const [id, format, label] of [
    ['cinema', 'Story', 'Fotogramma'],
    ['postcard', 'Story', 'Cartolina corsiva'],
    ['post-stack', 'Post', 'Stack fotografico'],
    ['post-stack-4', 'Post', 'Stack fotografico ×4'],
  ]) {
    const radio = elementWithId('input', `template-${id}`);
    assertAttribute(radio, 'type', 'radio');
    assertAttribute(radio, 'name', 'template');
    assertAttribute(radio, 'value', id);
    const card = html.match(new RegExp(`<label\\b[^>]*for=["']template-${id}["'][^>]*>([\\s\\S]*?)<\\/label>`, 'i'))?.[1];
    assert.ok(card, `missing label for ${id}`);
    assert.ok(card.includes(`<span class="template-option__name">${label}</span>`));
    assert.match(card, new RegExp(`<span class=["']template-option__badge["'][^>]*>[\\s\\S]*?${format}\\s*<\\/span>`));
    assert.doesNotMatch(card, /1080|1920|1440|9\s*:\s*16|3\s*:\s*4/);
  }
  assert.match(css, /\.template-option__badge\s*\{[^}]*bottom:[^}]*right:/s);
  assert.match(css, /\.template-thumbnail--post-stack\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*4/s);
  for (const id of ['post-photo-top', 'post-photo-bottom']) {
    const input = elementWithId('input', id);
    assertAttribute(input, 'type', 'file');
    assertAttribute(input, 'accept', 'image/\\*');
    assertVisibleLabel(id);
  }
  assert.ok(elementWithId('div', 'story-photo-fields'));
  assert.match(elementWithId('div', 'post-stack-fields'), /\bhidden\b/);
  assert.match(elementWithId('div', 'post-selection-guide'), /\bhidden\b/);
});

test('uses generic product copy and keeps format-specific copy local', () => {
  assert.match(html, /<title>Instagram Template Generator<\/title>/);
  assert.match(html, /<h1[^>]*>Instagram Template Generator<\/h1>/);
  assert.match(html, /<h2[^>]*id=["']editor-title["'][^>]*>Instagram Template Generator<\/h2>/);
  assert.match(html, /<p class=["']eyebrow["']>Template studio<\/p>/);
  assert.match(html, /<legend>Template<\/legend>/);
});


let asyncFixtureId = 0;
async function withAsyncApp(run, { preferred = 'supported', attributes = { colorSpace: 'display-p3', colorType: 'float16' }, share = false } = {}) {
  const fixture = createAppFixture();
  const canvas = fixture.elements.get('#story-canvas');
  const revoked = [];
  const contexts = [];
  const anchors = [];
  const shares = [];
  const renders = [];
  const exports = [];
  let nextUrl = 0;
  const drawImage = fixture.context.drawImage;
  fixture.context.drawImage = (...args) => {
    renders.push({ width: canvas.width, height: canvas.height, image: args[0] });
    drawImage(...args);
  };
  fixture.context.getContextAttributes = attributes === null ? undefined : () => attributes;
  canvas.getContext = (...args) => {
    contexts.push(args);
    if (args[1] && preferred === 'throws') throw new TypeError('unsupported');
    if (args[1] && preferred === 'null') return null;
    return fixture.context;
  };
  canvas.toBlob = (callback, type) => {
    exports.push([canvas.width, canvas.height, type]);
    callback(new Blob(['png'], { type }));
  };
  canvas.toDataURL = (type) => {
    exports.push([canvas.width, canvas.height, type]);
    return 'data:image/png;base64,cG5n';
  };
  const restores = [
    replaceGlobal('document', {
      querySelector: (selector) => fixture.elements.get(selector),
      createElement: () => {
        const anchor = { click() {}, remove() {} };
        anchors.push(anchor);
        return anchor;
      },
      body: { append() {} },
    }),
    replaceGlobal('Image', fixture.FakeImage),
    replaceGlobal('URL', { createObjectURL: () => `blob:async-${++nextUrl}`, revokeObjectURL: (url) => revoked.push(url) }),
    replaceGlobal('matchMedia', undefined),
    replaceGlobal('navigator', share ? { canShare: () => true, share: (payload) => { shares.push(payload); return Promise.resolve(); } } : {}),
    replaceGlobal('File', FakeShareFile),
  ];
  function select(template) {
    for (const id of ['cinema', 'postcard', 'post-stack', 'post-stack-4']) fixture.elements.get(`#template-${id}`).checked = id === template;
    fixture.elements.get(`#template-${template}`).emit('change');
  }
  function upload(selector, type = 'image/jpeg') {
    const input = fixture.elements.get(selector);
    input.files = [{ type }];
    const previousCount = fixture.images.length;
    input.emit('change');
    return fixture.images.length > previousCount ? fixture.images.at(-1) : null;
  }
  async function finish(image, event = 'load') {
    await Promise.resolve();
    image.emit(event);
  }
  try {
    await import(`${appUrl.href}?async-fixture=${++asyncFixtureId}`);
    await run({ ...fixture, canvas, revoked, contexts, anchors, shares, renders, exports, select, upload, finish });
  } finally {
    for (const restore of restores.reverse()) restore();
  }
}

test('resizes and describes the canvas for Story and Post templates', async () => {
  await withAsyncApp(async ({ canvas, elements, renders, select, upload, finish }) => {
    await finish(upload('#photo'));
    assert.deepEqual([canvas.width, canvas.height], [1080, 1920]);
    assert.equal(elements.get('#preview-title').textContent, '1080 × 1920');
    select('post-stack');
    await finish(upload('#post-photo-top'));
    assert.deepEqual([canvas.width, canvas.height], [1080, 1440]);
    assert.deepEqual([renders.at(-1).width, renders.at(-1).height], [1080, 1440], 'resize before drawing');
    assert.equal(elements.get('#preview-title').textContent, '1080 × 1440');
    assert.equal(elements.get('.canvas-stage').style.aspectRatio, '1080 / 1440');
    assert.equal(canvas.style.aspectRatio, '1080 / 1440');
    assert.match(canvas.attributes.get('aria-label'), /post.*1080.*1440/i);
    assert.equal(elements.get('#instagram-preview-overlay').hidden, true);
    select('postcard');
    assert.deepEqual([canvas.width, canvas.height], [1080, 1920]);
    assert.equal(elements.get('#instagram-preview-overlay').hidden, false);
    assert.match(canvas.attributes.get('aria-label'), /story.*1080.*1920/i);
  });
});

test('shows only the upload and content fields required by the active template', async () => {
  await withAsyncApp(async ({ select, elements }) => {
    for (const [template, expected] of [
      ['cinema', [false, true, true, false, true]],
      ['postcard', [false, true, true, true, false]],
      ['post-stack', [true, false, true, true, true]],
      ['post-stack-4', [true, true, false, true, true]],
    ]) {
      select(template);
      assert.deepEqual(['#story-photo-fields', '#post-stack-fields', '#post-stack-4-fields', '#cinema-fields', '#postcard-fields'].map((id) => elements.get(id).hidden), expected);
      assert.equal(elements.get(`#template-${template}`).checked, true);
    }
  });
});

test('keeps dual Post loads independent during success failure and replacement', async () => {
  await withAsyncApp(async ({ select, upload, finish, drawImageCalls, revoked, elements }) => {
    select('post-stack');
    const top = upload('#post-photo-top');
    const bottom = upload('#post-photo-bottom');
    await finish(bottom);
    await finish(top);
    assert.equal(elements.get('#download').disabled, false);
    assert.deepEqual(drawImageCalls.slice(-2).map(([image]) => image), [top, bottom]);
    const stale = upload('#post-photo-top');
    const replacement = upload('#post-photo-top');
    await finish(replacement);
    await finish(stale);
    assert.deepEqual(drawImageCalls.slice(-2).map(([image]) => image), [replacement, bottom]);
    assert.ok(revoked.includes('blob:async-1'));
    assert.ok(revoked.includes('blob:async-3'));
    assert.ok(!revoked.includes('blob:async-2'), 'valid sibling must retain its URL');
    const broken = upload('#post-photo-top');
    await finish(broken, 'error');
    assert.equal(elements.get('#download').disabled, false, 'failed replacement preserves previous valid image');
    assert.ok(!revoked.includes('blob:async-4'));
    const rejectedPending = upload('#post-photo-bottom');
    upload('#post-photo-bottom', 'text/plain');
    await finish(rejectedPending);
    assert.deepEqual(drawImageCalls.slice(-2).map(([image]) => image), [replacement, bottom]);
    assert.ok(!revoked.includes('blob:async-2'));
  });
});

test('requires both Post photos but preserves a valid sibling slot after failure', async () => {
  await withAsyncApp(async ({ select, upload, finish, elements, revoked, drawImageCalls }) => {
    select('post-stack');
    await finish(upload('#photo'));
    assert.equal(elements.get('#download').disabled, true, 'Story photo cannot satisfy Post validation');
    const top = upload('#post-photo-top');
    await finish(top);
    assert.equal(elements.get('#download').disabled, true);
    await finish(upload('#post-photo-bottom'), 'error');
    assert.equal(elements.get('#download').disabled, true);
    assert.ok(!revoked.includes('blob:async-2'));
    assert.equal(drawImageCalls.at(-1)[0], top);
    await finish(upload('#post-photo-bottom'));
    assert.equal(elements.get('#download').disabled, false);
    elements.get('#day').value = '999';
    elements.get('#story-form').emit('input', { target: elements.get('#day') });
    assert.equal(elements.get('#download').disabled, false, 'hidden Story validation must not block Post');
  });
});

test('restores Story and Post media after repeated template switches', async () => {
  await withAsyncApp(async ({ select, upload, finish, elements, drawImageCalls, revoked }) => {
    const story = upload('#photo');
    await finish(story);
    elements.get('#zoom').value = '1.5';
    elements.get('#zoom').emit('input');
    select('post-stack');
    const top = upload('#post-photo-top');
    const bottom = upload('#post-photo-bottom');
    await finish(top);
    await finish(bottom);
    elements.get('#zoom').value = '2';
    elements.get('#zoom').emit('input');
    for (let iteration = 0; iteration < 3; iteration++) {
      select('cinema');
      assert.equal(drawImageCalls.at(-1)[0], story);
      assert.equal(elements.get('#zoom').value, '1.5');
      select('post-stack');
      assert.deepEqual(drawImageCalls.slice(-2).map(([image]) => image), [top, bottom]);
      assert.equal(elements.get('#zoom').value, '2');
    }
    assert.deepEqual(revoked, []);
  });
});

test('exports Post at 1080 by 1440 as instagram-post-stack.png', async () => {
  for (const share of [false, true]) await withAsyncApp(async ({ select, upload, finish, elements, anchors, shares, exports }) => {
    select('post-stack');
    await finish(upload('#post-photo-top'));
    await finish(upload('#post-photo-bottom'));
    const pending = elements.get('#download').emit('click');
    if (share) assert.equal(shares.length, 1, 'share starts synchronously in click activation');
    await Promise.all(pending);
    assert.deepEqual(exports, [[1080, 1440, 'image/png']]);
    if (share) {
      assert.deepEqual(Object.keys(shares[0]), ['files']);
      assert.equal(shares[0].files.length, 1);
      assert.equal(shares[0].files[0].name, 'instagram-post-stack.png');
      assert.equal(shares[0].files[0].type, 'image/png');
    } else assert.equal(anchors[0].download, 'instagram-post-stack.png');
    assert.doesNotMatch(app.slice(app.indexOf('async function exportStory'), app.indexOf('function drawEmptyCanvas')), /post-selection-guide/);
  }, { share });
});

test('requests Display-P3 float16 and reports the actual context mode', async () => {
  for (const [attributes, expected] of [
    [{ colorSpace: 'display-p3', colorType: 'float16' }, /Display-P3.*float16/i],
    [{ colorSpace: 'srgb', colorType: 'unorm8' }, /sRGB.*unorm8/i],
    [null, /non verificabil/i],
  ]) await withAsyncApp(async ({ contexts, elements }) => {
    assert.deepEqual(contexts, [['2d', { colorSpace: 'display-p3', colorType: 'float16' }]]);
    const help = elements.get('#canvas-instructions').textContent;
    assert.match(help, expected);
    assert.doesNotMatch(help, /HDR/i);
  }, { attributes });
});

test('falls back to an sRGB context without disabling preview or export', async () => {
  for (const preferred of ['throws', 'null']) await withAsyncApp(async ({ contexts, upload, finish, elements, anchors, drawImageCalls }) => {
    await finish(upload('#photo'));
    assert.equal(elements.get('#download').disabled, false);
    assert.equal(drawImageCalls.length, 1);
    await Promise.all(elements.get('#download').emit('click'));
    assert.equal(anchors[0].download, 'travel-story-day-01.png');
    assert.deepEqual(contexts, [['2d', { colorSpace: 'display-p3', colorType: 'float16' }], ['2d']]);
    assert.match(elements.get('#canvas-instructions').textContent, /sRGB.*unorm8/i);
  }, { preferred, attributes: { colorSpace: 'srgb', colorType: 'unorm8' } });
});


async function withPostInteractionApp(run) {
  await withAsyncApp(async (fixture) => {
    fixture.select('post-stack');
    const top = fixture.upload('#post-photo-top');
    const bottom = fixture.upload('#post-photo-bottom');
    for (const image of [top, bottom]) {
      image.naturalWidth = 1200;
      image.naturalHeight = 1200;
      await fixture.finish(image);
    }
    // Deliberately differ from clientWidth/clientHeight to catch coordinate-scale bugs.
    fixture.canvas.getBoundingClientRect = () => ({ left: 40, top: 60, width: 270, height: 360 });
    function point(x, y) { return { clientX: 40 + x / 4, clientY: 60 + y / 4 }; }
    function pointer(type, x, y, pointerId = 1, extra = {}) {
      fixture.canvas.emit(type, { pointerType: 'mouse', pointerId, ...point(x, y), ...extra });
    }
    function drawing(image) {
      return fixture.drawImageCalls.findLast(([drawnImage]) => drawnImage === image).slice(1);
    }
    await run({ ...fixture, top, bottom, point, pointer, drawing });
  });
}

test('selects and drags only the Post frame where pointerdown begins', async () => {
  await withPostInteractionApp(async ({ canvas, elements, top, bottom, pointer, drawing, drawImageCalls }) => {
    pointer('pointerdown', 540, 362);
    pointer('pointerup', 540, 362);
    elements.get('#zoom').value = '2';
    elements.get('#zoom').emit('input');
    assert.deepEqual(drawing(top), [-524, -702, 2128, 2128]);
    assert.deepEqual(drawing(bottom), [8, 546, 1064, 1064]);

    pointer('pointerdown', 540, 362, 2);
    pointer('pointermove', 900, 900, 99);
    assert.deepEqual(drawing(top), [-524, -702, 2128, 2128], 'another pointer cannot move the crop');
    pointer('pointermove', 580, 760, 2);
    assert.deepEqual(drawing(top), [-484, -304, 2128, 2128], 'crossing the separator retains the original drag target');
    assert.deepEqual(drawing(bottom), [8, 546, 1064, 1064]);
    pointer('pointerup', 580, 760, 2);

    const count = drawImageCalls.length;
    const captures = canvas.pointerCaptures.length;
    for (const [x, y] of [[4, 362], [540, 720], [1076, 1078], [540, 1436]]) {
      pointer('pointerdown', x, y, 3);
      pointer('pointermove', 600, 1100, 3);
      pointer('pointerup', 600, 1100, 3);
    }
    assert.equal(drawImageCalls.length, count, 'border and separator starts are inert');
    assert.equal(canvas.pointerCaptures.length, captures);
    assert.match(elements.get('#canvas-instructions').textContent, /superiore/i);
  });
});

test('routes zoom recenter and keyboard movement to the active Post slot', async () => {
  await withPostInteractionApp(async ({ canvas, elements, top, bottom, pointer, drawing }) => {
    elements.get('#zoom').value = '1.5';
    elements.get('#zoom').emit('input');
    canvas.emit('keydown', { key: 'ArrowRight', preventDefault() {} });
    canvas.emit('keydown', { key: 'ArrowUp', shiftKey: true, preventDefault() {} });
    assert.deepEqual(drawing(bottom), [-246, 232, 1596, 1596]);
    assert.deepEqual(drawing(top), [8, -170, 1064, 1064]);

    pointer('pointerdown', 540, 362);
    pointer('pointerup', 540, 362);
    assert.equal(elements.get('#zoom').value, '1');
    assert.equal(elements.get('#zoom-value').value, '1,00×');
    assert.match(elements.get('#canvas-instructions').textContent, /superiore/i);
    elements.get('#zoom').value = '2';
    elements.get('#zoom').emit('input');
    canvas.emit('keydown', { key: 'ArrowLeft', preventDefault() {} });
    assert.deepEqual(drawing(top), [-536, -702, 2128, 2128]);
    assert.deepEqual(drawing(bottom), [-246, 232, 1596, 1596]);

    pointer('pointerdown', 540, 1078);
    pointer('pointerup', 540, 1078);
    assert.equal(elements.get('#zoom').value, '1.5');
    assert.equal(elements.get('#zoom-value').value, '1,50×');
    assert.match(elements.get('#canvas-instructions').textContent, /inferiore/i);
    elements.get('#recenter').emit('click');
    assert.deepEqual(drawing(bottom), [8, 546, 1064, 1064]);
    assert.deepEqual(drawing(top), [-536, -702, 2128, 2128]);
    pointer('pointerdown', 540, 362);
    pointer('pointerup', 540, 362);
    assert.equal(elements.get('#zoom').value, '2', 'selection and recenter preserve the sibling zoom');
  });
});

test('anchors a same-frame Post pinch and ignores cross-frame or gap touches', async () => {
  await withPostInteractionApp(async ({ canvas, elements, top, bottom, point, drawing, drawImageCalls }) => {
    const pair = (x1, y1, x2, y2) => [
      { identifier: 1, ...point(x1, y1) },
      { identifier: 2, ...point(x2, y2) },
    ];
    canvas.emit('touchstart', { touches: pair(340, 362, 540, 362) });
    let prevented = 0;
    canvas.emit('touchmove', { touches: pair(340, 382, 640, 382), preventDefault() { prevented++; } });
    assert.equal(prevented, 1);
    assert.equal(elements.get('#zoom').value, '1.5');
    assert.deepEqual(drawing(top), [-158, -416, 1596, 1596], 'pinch anchors relative to the top frame center');
    assert.deepEqual(drawing(bottom), [8, 546, 1064, 1064]);
    assert.match(elements.get('#canvas-instructions').textContent, /superiore/i);

    const count = drawImageCalls.length;
    for (const invalid of [pair(340, 362, 540, 1078), pair(340, 362, 540, 720), pair(4, 362, 540, 362)]) {
      canvas.emit('touchstart', { touches: invalid });
      canvas.emit('touchmove', { touches: invalid, preventDefault() { assert.fail('invalid Post gestures remain native'); } });
    }
    assert.equal(drawImageCalls.length, count);

    canvas.emit('touchstart', { touches: pair(340, 362, 540, 362) });
    for (let move = 0; move < 2; move++) {
      canvas.emit('touchmove', { touches: pair(340, 1078, 640, 1078), preventDefault() {} });
    }
    assert.equal(drawImageCalls.length, count, 'a gesture cannot migrate from top to bottom');
    canvas.emit('touchend', { touches: [] });
    canvas.emit('touchstart', { touches: pair(340, 1078, 540, 1078) });
    canvas.emit('touchmove', { touches: pair(340, 1098, 640, 1098), preventDefault() {} });
    assert.deepEqual(drawing(bottom), [-158, 300, 1596, 1596], 'a new bottom gesture uses the bottom frame center');
    assert.deepEqual(drawing(top), [-158, -416, 1596, 1596]);
  });
});

test('keeps one-finger page scrolling native in Post mode', async () => {
  await withPostInteractionApp(async ({ canvas, elements, point, drawImageCalls }) => {
    const touch = { identifier: 1, ...point(540, 362) };
    canvas.emit('pointerdown', { pointerType: 'touch', pointerId: 1, ...touch });
    canvas.emit('touchstart', { touches: [touch], preventDefault() { assert.fail('one finger must stay native'); } });
    const count = drawImageCalls.length;
    canvas.emit('touchmove', {
      touches: [{ ...touch, ...point(540, 1078) }],
      preventDefault() { assert.fail('one-finger page scroll must not be blocked'); },
    });
    canvas.emit('touchend', { touches: [] });
    assert.equal(drawImageCalls.length, count);
    assert.deepEqual(canvas.pointerCaptures, []);
    assert.match(elements.get('#canvas-instructions').textContent, /superiore/i, 'a touch selects its starting slot');
    assert.match(css, /#story-canvas\s*\{[^}]*touch-action:\s*pan-y/s);
  });
});

test('keeps the active-frame guide outside the exported canvas', async () => {
  await withPostInteractionApp(async ({ canvas, elements, top, bottom, pointer, drawing, select, exports, drawImageCalls }) => {
    const guide = elements.get('#post-selection-guide');
    assert.equal(guide.hidden, false);
    for (const [slot, y] of [['top', 8], ['bottom', 724]]) {
      pointer('pointerdown', 540, slot === 'top' ? 362 : 1078);
      pointer('pointerup', 540, slot === 'top' ? 362 : 1078);
      for (const [property, expected, dimension] of [
        ['left', 8, canvas.width], ['top', y, canvas.height],
        ['width', 1064, canvas.width], ['height', 708, canvas.height],
      ]) {
        assert.ok(Math.abs(Number.parseFloat(guide.style[property]) * dimension / 100 - expected) < 0.00001, `${slot} guide ${property}`);
      }
    }
    assert.match(css, /#post-selection-guide\s*\{[^}]*position:\s*absolute[^}]*pointer-events:\s*none/s);
    const before = [drawing(top), drawing(bottom)];
    await Promise.all(elements.get('#download').emit('click'));
    assert.deepEqual(exports, [[1080, 1440, 'image/png']]);
    assert.deepEqual([drawing(top), drawing(bottom)], before);
    assert.ok(drawImageCalls.every(([image]) => image !== guide));
    select('cinema');
    assert.equal(guide.hidden, true);
    select('post-stack');
    assert.equal(guide.hidden, false);
    assert.match(elements.get('#canvas-instructions').textContent, /inferiore/i);
  });
});


test('sets a real hidden attribute on the SVG Story overlay in Post mode', async () => {
  await withAsyncApp(async ({ select, elements }) => {
    const overlay = elements.get('#instagram-preview-overlay');
    select('post-stack');
    assert.equal(overlay.attributes.has('hidden'), true, 'SVG requires the actual attribute rather than a hidden JavaScript property');
    select('cinema');
    assert.equal(overlay.attributes.has('hidden'), false);
  });
});


test('ignores non-cancelable touch moves once the browser owns page scrolling', async () => {
  await withPostInteractionApp(async ({ canvas, point, drawImageCalls }) => {
    canvas.emit('touchstart', { touches: [point(340, 362), point(540, 362)] });
    const count = drawImageCalls.length;
    canvas.emit('touchmove', {
      touches: [point(340, 382), point(640, 382)],
      cancelable: false,
      preventDefault() { assert.fail('a browser-owned scroll cannot be canceled'); },
    });
    assert.equal(drawImageCalls.length, count, 'native scroll must not also edit a photo');
  });
});

test('ends Post pointer and touch gestures when the template changes', async () => {
  await withPostInteractionApp(async ({ canvas, elements, pointer, point, select, drawImageCalls }) => {
    pointer('pointerdown', 540, 362);
    select('cinema');
    select('post-stack');
    const afterPointerSwitch = drawImageCalls.length;
    pointer('pointermove', 580, 382);
    assert.equal(drawImageCalls.length, afterPointerSwitch, 'stale captured pointer cannot edit a restored Post');
    canvas.emit('touchstart', { touches: [point(340, 362), point(540, 362)] });
    select('postcard');
    select('post-stack');
    const afterTouchSwitch = drawImageCalls.length;
    canvas.emit('touchmove', {
      touches: [point(340, 382), point(640, 382)],
      preventDefault() { assert.fail('a stale pinch cannot capture page scrolling'); },
    });
    assert.equal(drawImageCalls.length, afterTouchSwitch);
    assert.equal(elements.get('#zoom').value, '1');
  });
});


test('selects both Post photos with keyboard-accessible controls and preserves the sibling crop', async () => {
  for (const slot of ['top', 'bottom']) {
    const button = elementWithId('button', `post-select-${slot}`);
    assertAttribute(button, 'type', 'button');
    assert.doesNotMatch(button, /\bdisabled\b|tabindex=["']-1["']/);
  }
  await withPostInteractionApp(async ({ canvas, elements, top, bottom, drawing, select }) => {
    const topButton = elements.get('#post-select-top');
    const bottomButton = elements.get('#post-select-bottom');
    assert.equal(topButton.attributes.get('aria-pressed'), 'false');
    assert.equal(bottomButton.attributes.get('aria-pressed'), 'true', 'the last loaded photo is selected');

    elements.get('#zoom').value = '1.5';
    elements.get('#zoom').emit('input');
    canvas.emit('keydown', { key: 'ArrowRight', preventDefault() {} });
    canvas.emit('keydown', { key: 'ArrowUp', shiftKey: true, preventDefault() {} });
    assert.deepEqual(drawing(bottom), [-246, 232, 1596, 1596]);

    // Native buttons dispatch a click with detail=0 for keyboard activation.
    topButton.emit('click', { detail: 0 });
    assert.equal(topButton.attributes.get('aria-pressed'), 'true');
    assert.equal(bottomButton.attributes.get('aria-pressed'), 'false');
    assert.equal(elements.get('#zoom').value, '1');
    elements.get('#zoom').value = '2';
    elements.get('#zoom').emit('input');
    canvas.emit('keydown', { key: 'ArrowLeft', preventDefault() {} });
    assert.deepEqual(drawing(top), [-536, -702, 2128, 2128]);
    assert.deepEqual(drawing(bottom), [-246, 232, 1596, 1596]);

    bottomButton.emit('click', { detail: 0 });
    assert.equal(elements.get('#zoom').value, '1.5');
    assert.equal(elements.get('#zoom-value').value, '1,50×');
    assert.match(elements.get('#canvas-instructions').textContent, /inferiore/i);
    elements.get('#recenter').emit('click', { detail: 0 });
    assert.deepEqual(drawing(bottom), [8, 546, 1064, 1064]);
    assert.deepEqual(drawing(top), [-536, -702, 2128, 2128]);

    topButton.emit('click', { detail: 0 });
    assert.equal(elements.get('#zoom').value, '2');
    elements.get('#recenter').emit('click', { detail: 0 });
    assert.deepEqual(drawing(top), [8, -170, 1064, 1064]);
    assert.deepEqual(drawing(bottom), [8, 546, 1064, 1064]);
    assert.deepEqual(canvas.pointerCaptures, []);
    select('cinema');
    assert.equal(elements.get('#post-stack-fields').hidden, true, 'the selector is hidden with Post controls in Story mode');
    select('post-stack');
    assert.equal(elements.get('#post-stack-fields').hidden, false);
    assert.equal(topButton.attributes.get('aria-pressed'), 'true');
  });
});

test('labels and orders the four Post uploads clockwise with native selection buttons', () => {
  const start = html.indexOf(elementWithId('div', 'post-stack-4-fields'));
  const controls = html.slice(start, html.indexOf('<div class="field field--zoom">', start));
  assert.match(elementWithId('div', 'post-stack-4-fields'), /\bhidden\b/);
  assert.match(controls, /role="group" aria-labelledby="post-stack-4-slot-label"/);
  assert.match(controls, /id="post-stack-4-slot-label"[^>]*>Foto da modificare<\/p>/);

  let previousInput = -1;
  let previousButton = -1;
  for (const [index, [slot, label]] of fourPhotoSlots.entries()) {
    const input = elementWithId('input', `post-photo-${slot}`);
    const button = elementWithId('button', `post-select-${slot}`);
    assertAttribute(input, 'type', 'file');
    assertAttribute(input, 'accept', 'image/\\*');
    assert.ok(controls.includes(`<label for="post-photo-${slot}">${label}</label>`));
    assertAttribute(button, 'type', 'button');
    assertAttribute(button, 'aria-pressed', String(index === 0));
    assertAttribute(button, 'aria-label', `Modifica ${label.toLowerCase()}`);
    assert.doesNotMatch(button, /\bdisabled\b|tabindex=["']-1["']/);
    assert.ok(controls.indexOf(input) > previousInput);
    assert.ok(controls.indexOf(button) > previousButton);
    previousInput = controls.indexOf(input);
    previousButton = controls.indexOf(button);
  }
});

test('resolves four-photo requests independently across replacements and a rejected file', async () => {
  await withAsyncApp(async ({ select, upload, finish, drawImageCalls, revoked, elements }) => {
    select('post-stack-4');
    const images = fourPhotoSlots.map(([slot]) => upload(`#post-photo-${slot}`));
    assert.ok(images.every(Boolean), 'every four-photo upload starts its own decode');
    for (const index of [3, 1, 2, 0]) await finish(images[index]);
    assert.deepEqual(drawImageCalls.slice(-4).map(([image]) => image), images);

    const staleFirst = upload('#post-photo-top-left');
    const third = upload('#post-photo-bottom-right');
    const first = upload('#post-photo-top-left');
    const rejectedFourth = upload('#post-photo-bottom-left');
    assert.equal(upload('#post-photo-bottom-left', 'text/plain'), null);

    await finish(first);
    await finish(rejectedFourth);
    await finish(third);
    await finish(staleFirst);

    assert.deepEqual(drawImageCalls.slice(-4).map(([image]) => image), [first, images[1], third, images[3]]);
    assert.deepEqual(revoked, [images[0].src, rejectedFourth.src, images[2].src, staleFirst.src]);
    assert.equal(elements.get('#download').disabled, false, 'rejected replacement preserves the last valid photo');
    assert.equal(elements.get('#post-select-bottom-right').attributes.get('aria-pressed'), 'true');
  });
});

test('restores each Post selection, images and crop through repeated switches', async () => {
  await withAsyncApp(async ({ canvas, select, upload, finish, elements, drawImageCalls, revoked }) => {
    select('post-stack');
    const top = upload('#post-photo-top');
    const bottom = upload('#post-photo-bottom');
    assert.ok(top && bottom);
    await finish(top);
    await finish(bottom);

    const zoom = elements.get('#zoom');
    zoom.value = '1.5';
    zoom.emit('input');
    canvas.emit('keydown', { key: 'ArrowRight', preventDefault() {} });
    const twoPhotoDrawings = drawImageCalls.slice(-2);

    select('post-stack-4');
    const images = fourPhotoSlots.map(([slot]) => upload(`#post-photo-${slot}`));
    assert.ok(images.every(Boolean), 'four-photo slots are bound to their own uploads');
    for (const image of images) await finish(image);
    const pressed = () => fourPhotoSlots.map(([slot]) => elements.get(`#post-select-${slot}`).attributes.get('aria-pressed'));
    for (const [index, [slot]] of fourPhotoSlots.entries()) {
      elements.get(`#post-select-${slot}`).emit('click', { detail: 0 });
      assert.deepEqual(pressed(), [0, 1, 2, 3].map((key) => String(key === index)));
    }
    zoom.value = '2';
    zoom.emit('input');
    canvas.emit('keydown', { key: 'ArrowLeft', preventDefault() {} });
    const fourPhotoDrawings = drawImageCalls.slice(-4);

    const pending = upload('#post-photo-top-right');
    select('post-stack');
    const twoPhotoInstructions = elements.get('#canvas-instructions').textContent;
    upload('#post-photo-top', 'text/plain');
    const twoPhotoStatus = elements.get('#status').textContent;
    await finish(pending);
    assert.equal(elements.get('#canvas-instructions').textContent, twoPhotoInstructions);
    assert.equal(elements.get('#status').textContent, twoPhotoStatus);
    assert.deepEqual(drawImageCalls.slice(-2), twoPhotoDrawings);
    assert.equal(zoom.value, '1.5');

    select('post-stack-4');
    assert.deepEqual(pressed(), ['false', 'true', 'false', 'false']);
    assert.deepEqual(drawImageCalls.slice(-4).map(([image]) => image), [images[0], pending, images[2], images[3]]);
    assert.equal(zoom.value, '1');
    elements.get('#post-select-bottom-left').emit('click', { detail: 0 });

    for (let iteration = 0; iteration < 3; iteration++) {
      select('post-stack');
      assert.equal(elements.get('#post-select-bottom').attributes.get('aria-pressed'), 'true');
      assert.deepEqual(drawImageCalls.slice(-2), twoPhotoDrawings);
      assert.equal(zoom.value, '1.5');

      select('post-stack-4');
      assert.deepEqual(pressed(), ['false', 'false', 'false', 'true']);
      assert.deepEqual(drawImageCalls.at(-1), fourPhotoDrawings.at(-1));
      assert.equal(zoom.value, '2');
    }
    assert.deepEqual(revoked, [images[1].src]);
  });
});

test('blocks four-photo export until all four slots are valid and exports the visible Post PNG', async () => {
  for (const share of [false, true]) {
    await withAsyncApp(async ({ select, upload, finish, elements, anchors, shares, exports, drawImageCalls }) => {
      select('post-stack-4');
      const photos = fourPhotoSlots.map(([slot]) => upload(`#post-photo-${slot}`));
      assert.ok(photos.every(Boolean), 'four-photo slots are bound to their own uploads');
      const download = elements.get('#download');

      for (const image of photos.slice(0, 3)) {
        await finish(image);
        assert.equal(download.disabled, true);
      }
      await finish(photos[3], 'error');
      assert.equal(download.disabled, true);
      await Promise.all(download.emit('click'));
      assert.deepEqual(exports, []);
      assert.deepEqual(drawImageCalls.slice(-3).map(([image]) => image), photos.slice(0, 3));

      const fourth = upload('#post-photo-bottom-left');
      await finish(fourth);
      assert.equal(download.disabled, false);
      assert.deepEqual(drawImageCalls.slice(-4).map(([image]) => image), [...photos.slice(0, 3), fourth]);

      const pending = download.emit('click');
      if (share) assert.equal(shares.length, 1, 'native share starts before the click task yields');
      await Promise.all(pending);
      assert.deepEqual(exports, [[1080, 1440, 'image/png']]);
      if (share) {
        assert.equal(shares[0].files[0].name, 'instagram-post-stack-4.png');
        assert.equal(shares[0].files[0].type, 'image/png');
      } else {
        assert.equal(anchors[0].download, 'instagram-post-stack-4.png');
      }
    }, { share });
  }
});
