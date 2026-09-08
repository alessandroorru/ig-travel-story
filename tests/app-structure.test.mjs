import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const appUrl = new URL('../app.mjs', import.meta.url);
const app = existsSync(appUrl) ? readFileSync(appUrl, 'utf8') : '';
const renderer = readFileSync(new URL('../story-renderer.mjs', import.meta.url), 'utf8');

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

test('uses a Story studio eyebrow and a visible template title above composition controls', () => {
  assert.match(html, /<p[^>]*class=["']eyebrow["'][^>]*>\s*Story studio\s*<\/p>/i);
  const editorTitle = elementWithId('h2', 'editor-title');
  assert.doesNotMatch(editorTitle, /\bclass=["']eyebrow["']/i);
  assert.match(html, /<h2[^>]*\bid=["']editor-title["'][^>]*>\s*Instagram Story Template\s*<\/h2>/i);
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
  const globalTitle = html.match(/<h1\s+class=["']visually-hidden["']>Travel Story Generator<\/h1>/i);
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
  assert.doesNotMatch(app, /instagram-preview-overlay/i);
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
  assert.match(app, /1080\s*\/\s*canvas\.clientWidth/);
  assert.match(app, /1920\s*\/\s*canvas\.clientHeight/);
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
  assert.match(css, /\.template-option__check/);
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
  const canvas = elements.get('#story-canvas');
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
