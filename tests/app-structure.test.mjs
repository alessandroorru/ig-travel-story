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
