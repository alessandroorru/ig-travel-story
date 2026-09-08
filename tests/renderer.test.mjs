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
    createRadialGradient(...args) {
      const stops = [];
      gradients.push({ args, stops, radial: true });
      return { addColorStop: (...stop) => stops.push(stop) };
    },
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    drawImage: (...args) => calls.push(['drawImage', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    fillText(...args) {
      calls.push(['fillText', ...args, this.fillStyle, this.font, this.textAlign, this.textBaseline]);
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
    totalDays: 35,
    title: 'Welcome to Kuala Lumpur',
    notes: ['First note', '   ', '', 'Second note'],
  });

  assert.deepEqual(context.calls[0], ['clearRect', 0, 0, 1080, 1920]);
  assert.deepEqual(context.calls[1], ['drawImage', image, 0, 0, 1080, 1920]);
  assert.equal(context.gradients.length, 2);

  const text = context.calls
    .filter(([name]) => name === 'fillText')
    .map(([, value]) => value);
  assert.ok(text.includes('Day 01 / 35'));
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

test('keeps blank title newlines as forced vertical lines', () => {
  const context = createRecordingContext();

  renderStory(context, {
    image: { width: 1080, height: 1920 },
    day: 1,
    totalDays: 28,
    title: 'First\n\nThird',
    notes: [],
  });

  const first = context.calls.find(
    ([name, value]) => name === 'fillText' && value === 'FIRST',
  );
  const third = context.calls.find(
    ([name, value]) => name === 'fillText' && value === 'THIRD',
  );
  assert.equal(first?.[3], 316);
  assert.equal(third?.[3], 504);
  assert.ok(!context.calls.some(([name, value]) => name === 'fillText' && value === ''));
});

test('keeps a trailing blank note newline within the two-line layout', () => {
  const context = createRecordingContext();

  renderStory(context, {
    image: { width: 1080, height: 1920 },
    day: 1,
    totalDays: 28,
    title: 'Title',
    notes: ['First note\n'],
  });

  const dash = context.calls.find(
    ([name, value]) => name === 'fillText' && value === '—',
  );
  const note = context.calls.find(
    ([name, value]) => name === 'fillText' && value === 'First note',
  );
  assert.equal(dash?.[3], 1570);
  assert.equal(note?.[3], 1570);
  assert.ok(!context.calls.some(([name, value]) => name === 'fillText' && value === ''));
});

test('keeps all story text inside the 250-pixel vertical safe areas', () => {
  const context = createRecordingContext();

  renderStory(context, {
    image: { width: 1080, height: 1920 },
    day: 1,
    totalDays: 35,
    title: 'Welcome to Kuala Lumpur',
    notes: ['First note', 'Second note', 'Third note'],
  });

  const textCalls = context.calls.filter(([name]) => name === 'fillText');
  const day = textCalls.find(([, value]) => value === 'Day 01 / 35');
  const title = textCalls.find(([, value]) => value === 'WELCOME TO KUALA');
  const noteCalls = textCalls.filter(([, value]) => /note/i.test(value));

  assert.equal(day?.[3], 250);
  assert.equal(title?.[3], 316);
  assert.ok(noteCalls.length > 0);
  assert.ok(noteCalls.every(([, , , y]) => y <= 1670));
});

test('translates the fades by the safe-area offset while preserving their profile', () => {
  const context = createRecordingContext();

  renderStory(context, {
    image: { width: 1080, height: 1920 },
    day: 1,
    totalDays: 35,
    title: 'Title',
    notes: [],
  });

  assert.deepEqual(context.gradients[0].args, [0, 170, 0, CANVAS_HEIGHT * 0.36 + 170]);
  assert.deepEqual(context.gradients[0].stops, [
    [0, 'rgba(0, 0, 0, 0.76)'],
    [1, 'rgba(0, 0, 0, 0)'],
  ]);
  assert.deepEqual(context.gradients[1].args, [
    0,
    CANVAS_HEIGHT * 0.48 - 170,
    0,
    CANVAS_HEIGHT - 170,
  ]);
  assert.deepEqual(context.gradients[1].stops, [
    [0, 'rgba(0, 0, 0, 0)'],
    [1, 'rgba(0, 0, 0, 0.92)'],
  ]);
  const fadeRects = context.calls.filter(([name]) => name === 'fillRect');
  assert.deepEqual(fadeRects[0], [
    'fillRect',
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT * 0.36 + 170,
  ]);
  assert.deepEqual(fadeRects[1], [
    'fillRect',
    0,
    CANVAS_HEIGHT * 0.48 - 170,
    CANVAS_WIDTH,
    CANVAS_HEIGHT - (CANVAS_HEIGHT * 0.48 - 170),
  ]);
});

test('renders postcard text centered with preserved casing, safe-area bounds, and no Cinema copy', () => {
  const context = createRecordingContext();

  renderStory(context, {
    template: 'postcard',
    image: { width: 1080, height: 1920 },
    day: 7,
    totalDays: 35,
    title: 'Cinema title',
    notes: ['Cinema note'],
    centerText: 'Ciao\nMondo MiXto',
  });

  const textCalls = context.calls.filter(([name]) => name === 'fillText');
  assert.deepEqual(textCalls.map(([, value]) => value), ['Ciao', 'Mondo MiXto']);
  assert.ok(textCalls.every(([, , x]) => x === CANVAS_WIDTH / 2));
  assert.ok(textCalls.every(([, , , y]) => y >= 250 && y <= 1670));
  assert.ok(textCalls.every(([, , , , , font]) => /Snell Roundhand.*Apple Chancery.*serif/i.test(font)));
  assert.ok(textCalls.every(([, , , , , , align]) => align === 'center'));
  assert.equal(context.gradients.length, 1);
  assert.equal(context.gradients[0].radial, true);
  assert.equal(context.textAlign, 'start');
  assert.equal(context.textBaseline, 'alphabetic');
  assert.equal(context.shadowBlur, 0);
});

test('centers postcard line baselines vertically for one and multiple lines', () => {
  const singleLineContext = createRecordingContext();
  renderStory(singleLineContext, {
    template: 'postcard',
    image: { width: 1080, height: 1920 },
    centerText: 'Una riga',
  });
  const singleLine = singleLineContext.calls.find(([name]) => name === 'fillText');
  assert.equal(singleLine?.[3], CANVAS_HEIGHT / 2);
  assert.equal(singleLine?.[7], 'middle');

  const multiLineContext = createRecordingContext();
  renderStory(multiLineContext, {
    template: 'postcard',
    image: { width: 1080, height: 1920 },
    centerText: 'Prima\nSeconda\nTerza',
  });
  const multiLines = multiLineContext.calls.filter(([name]) => name === 'fillText');
  assert.deepEqual(multiLines.map(([, , , y]) => y), [854, 960, 1066]);
  assert.ok(multiLines.every(([, , , , , , , baseline]) => baseline === 'middle'));
});

test('bounds postcard copy to five ellipsized lines and restores Cinema canvas text state', () => {
  const context = createRecordingContext();
  const longText = Array.from({ length: 80 }, () => 'parola').join(' ');

  renderStory(context, {
    template: 'postcard',
    image: { width: 1080, height: 1920 },
    centerText: longText,
  });

  const postcardCalls = context.calls.filter(([name]) => name === 'fillText');
  assert.equal(postcardCalls.length, 5);
  assert.match(postcardCalls.at(-1)[1], /…$/);

  renderStory(context, {
    image: { width: 1080, height: 1920 },
    day: 1,
    totalDays: 35,
    title: 'Cinema',
    notes: ['Note'],
  });

  const cinemaDay = context.calls.filter(([name, value]) => name === 'fillText' && value === 'Day 01 / 35').at(-1);
  assert.equal(cinemaDay?.[6], 'start');
  assert.equal(cinemaDay?.[7], 'top');
});
