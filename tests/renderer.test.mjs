import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  computeImagePlacement,
  renderStory,
  wrapText,
} from '../story-renderer.mjs';

const measureCharacters = (value) => [...value].length * 10;

function createRecordingContext() {
  const calls = [];
  const gradients = [];

  return {
    calls,
    gradients,
    createLinearGradient(...args) {
      const stops = [];
      gradients.push({ args, stops });
      return { addColorStop: (...stop) => stops.push(stop) };
    },
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    drawImage: (...args) => calls.push(['drawImage', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    fillText(...args) {
      calls.push(['fillText', ...args, this.fillStyle]);
    },
    measureText(value) {
      const characterWidth = this.font.includes('104px') ? 56 : 20;
      return { width: [...value].length * characterWidth };
    },
  };
}

test('uses the exact Instagram Story canvas dimensions', () => {
  assert.equal(CANVAS_WIDTH, 1080);
  assert.equal(CANVAS_HEIGHT, 1920);
});

test('positions a landscape image with offsets clamped to horizontal overflow', () => {
  assert.deepEqual(
    computeImagePlacement(2400, 1600, 1, 9999, -9999),
    { scale: 1.2, width: 2880, height: 1920, x: 0, y: 0, maxX: 900, maxY: 0, offsetX: 900, offsetY: 0 },
  );
});

test('centers a portrait cover image and allows only vertical movement', () => {
  assert.deepEqual(
    computeImagePlacement(1200, 2400, 1, 99, 40),
    { scale: 0.9, width: 1080, height: 2160, x: 0, y: -80, maxX: 0, maxY: 120, offsetX: 0, offsetY: 40 },
  );
});

test('upscales a small image to fill the canvas without empty edges', () => {
  assert.deepEqual(
    computeImagePlacement(540, 960, 1, 0, 0),
    { scale: 2, width: 1080, height: 1920, x: 0, y: 0, maxX: 0, maxY: 0, offsetX: 0, offsetY: 0 },
  );
});

test('clamps zoom to the inclusive one through three range', () => {
  assert.deepEqual(computeImagePlacement(1080, 1920, 0.25, 0, 0), {
    scale: 1,
    width: 1080,
    height: 1920,
    x: 0,
    y: 0,
    maxX: 0,
    maxY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  assert.deepEqual(computeImagePlacement(1080, 1920, 4, 0, 0), {
    scale: 3,
    width: 3240,
    height: 5760,
    x: -1080,
    y: -1920,
    maxX: 1080,
    maxY: 1920,
    offsetX: 0,
    offsetY: 0,
  });
});

test('honors explicit newlines while wrapping at whitespace', () => {
  assert.deepEqual(
    wrapText('first line\nsecond line', measureCharacters, 120, 3),
    ['first line', 'second line'],
  );
});

test('breaks oversized Unicode tokens by code point instead of splitting a surrogate pair', () => {
  assert.deepEqual(
    wrapText('A😀BC', measureCharacters, 20, 3),
    ['A😀', 'BC'],
  );
});

test('ellipsizes the final permitted line when text exceeds it', () => {
  assert.deepEqual(
    wrapText('one two', measureCharacters, 40, 1),
    ['one…'],
  );
});

test('renders only non-empty notes beneath the Cinema title and day', () => {
  const context = createRecordingContext();
  const image = { width: 1080, height: 1920 };

  renderStory(context, {
    image,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    day: 1,
    totalDays: 28,
    title: 'Welcome to Kuala Lumpur',
    notes: ['First note', '   ', '', 'Second note'],
  });

  assert.deepEqual(context.calls[0], ['clearRect', 0, 0, 1080, 1920]);
  assert.deepEqual(context.calls[1], ['drawImage', image, 0, 0, 1080, 1920]);
  assert.equal(context.gradients.length, 2);

  const text = context.calls
    .filter(([name]) => name === 'fillText')
    .map(([, value]) => value);
  assert.ok(text.includes('01 / 28'));
  assert.ok(text.includes('WELCOME TO KUALA'));
  assert.ok(text.includes('LUMPUR'));
  assert.ok(text.includes('First note'));
  assert.ok(text.includes('Second note'));
  assert.ok(!text.includes(''));
  assert.ok(!text.includes('   '));
});

test('measures notes with the note typeface before wrapping them', () => {
  const context = createRecordingContext();
  const note = 'Small note text should stay on one line';

  renderStory(context, {
    image: { width: 1080, height: 1920 },
    day: 1,
    totalDays: 28,
    title: 'Title',
    notes: [note],
  });

  const text = context.calls
    .filter(([name]) => name === 'fillText')
    .map(([, value]) => value);
  assert.ok(text.includes(note));
});

test('renders each Cinema note with a red dash and white text', () => {
  const context = createRecordingContext();
  const notes = ['First note', 'Second note'];

  renderStory(context, {
    image: { width: 1080, height: 1920 },
    day: 1,
    totalDays: 28,
    title: 'Title',
    notes,
  });

  for (const note of notes) {
    const noteCall = context.calls.find(
      ([name, value]) => name === 'fillText' && value === note,
    );
    assert.ok(noteCall, `missing white note text for ${note}`);
    assert.equal(noteCall[4], '#f7f7f4');
    assert.ok(
      context.calls.some(
        ([name, value, x, y, color]) => (
          name === 'fillText'
          && value === '—'
          && x === 80
          && y === noteCall[3]
          && color === '#ff3b30'
        ),
      ),
      `missing red dash for ${note}`,
    );
  }
});
