import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const appUrl = new URL('../app.mjs', import.meta.url);
const app = existsSync(appUrl) ? readFileSync(appUrl, 'utf8') : '';

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
    ['input', 'total-days', { type: 'number', min: '1', max: '999', step: '1', value: '28' }],
    ['input', 'title', { type: 'text', maxlength: '42' }],
    ['textarea', 'note-1', { maxlength: '90' }],
    ['textarea', 'note-2', { maxlength: '90' }],
    ['textarea', 'note-3', { maxlength: '90' }],
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
  assert.match(elementWithId('button', 'recenter'), /type=["']button["']/);
  assert.match(elementWithId('button', 'download'), /type=["']button["'][^>]*\bdisabled\b/);
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
  assert.match(css, /#story-canvas\s*\{[^}]*touch-action:\s*none/s);
  assert.equal((css.match(/touch-action:\s*none/g) ?? []).length, 1);
  assert.doesNotMatch(css, /@import|url\s*\(/i);
});

test('keeps PNG export unavailable in markup until a valid photo is loaded', () => {
  assert.match(elementWithId('button', 'download'), /\bdisabled\b/);
});

class FakeElement {
  constructor(value = '') {
    this.value = value;
    this.files = [];
    this.disabled = true;
    this.textContent = '';
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    return (this.listeners.get(type) ?? []).map((listener) => (
      listener({ target: this, ...event })
    ));
  }

  setAttribute() {}
  focus() {}
  setPointerCapture() {}
  releasePointerCapture() {}
  hasPointerCapture() { return false; }
}

function createAppFixture() {
  const drawImageCalls = [];
  const context = {
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    setLineDash() {},
    fillText() {},
    drawImage(...args) { drawImageCalls.push(args); },
    createLinearGradient() { return { addColorStop() {} }; },
    measureText(value) { return { width: [...value].length * 20 }; },
  };
  const elements = new Map([
    ['#story-form', new FakeElement()],
    ['#photo', new FakeElement()],
    ['#day', new FakeElement('1')],
    ['#total-days', new FakeElement('28')],
    ['#title', new FakeElement('Welcome to Kuala Lumpur')],
    ['#note-1', new FakeElement()],
    ['#note-2', new FakeElement()],
    ['#note-3', new FakeElement()],
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

  const images = [];
  class FakeImage extends FakeElement {
    constructor() {
      super();
      this.naturalWidth = 1080;
      this.naturalHeight = 1920;
      images.push(this);
    }
  }

  return { context, drawImageCalls, elements, images, FakeImage };
}

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
