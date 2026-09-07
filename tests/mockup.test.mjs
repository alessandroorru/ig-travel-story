import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

const observations = [
  'Tre voli e cinque ore di sonno.',
  'Il caldo appanna l’obiettivo appena esci.',
  'Tra palme, templi e insegne, la città cambia faccia a ogni isolato.',
];

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));

  assert.ok(match, `missing ${selector} rule`);
  return match[1];
}

function nestedBlockBody(source, header) {
  const start = source.indexOf(header);
  const openBrace = source.indexOf('{', start + header.length);

  assert.notEqual(start, -1, `missing ${header} block`);
  assert.notEqual(openBrace, -1, `missing opening brace for ${header}`);

  let depth = 1;
  for (let index = openBrace + 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(openBrace + 1, index);
  }

  assert.fail(`missing closing brace for ${header}`);
}

test('renders three complete and distinct Cinema stories', () => {
  const stories = [...html.matchAll(/<article class="story" data-theme="cinema">([\s\S]*?)<\/article>/g)];
  const expectedImages = [
    'assets/DSCF7335.jpeg',
    'assets/DSCF7341.jpeg',
    'assets/DSCF7347.jpeg',
  ];

  assert.equal(stories.length, 3);
  assert.doesNotMatch(html, /data-theme="(?:notebook|archive)"/);

  const imageSources = stories.map(([, story]) => {
    assert.match(story, /<p class="story__day">Day 01 \/ 28<\/p>/);
    assert.match(story, /<h2 class="story__title">Welcome to Kuala Lumpur<\/h2>/);

    const notes = [...story.matchAll(/<li class="story__note">([^<]+)<\/li>/g)].map(([, note]) => note);
    assert.deepEqual(notes, observations);

    const images = [...story.matchAll(/<img class="story__photo" src="([^"]+)" alt="([^"]+)">/g)];
    assert.equal(images.length, 1);
    return images[0][1];
  });

  assert.deepEqual(imageSources.sort(), expectedImages);
  assert.equal(new Set(imageSources).size, 3);
  assert.match(html, /src="assets\/DSCF7335\.jpeg" alt="Palme e architettura a Kuala Lumpur"/);
  assert.match(html, /src="assets\/DSCF7341\.jpeg" alt="Chiosco di cocchi con una persona a Kuala Lumpur"/);
});

test('keeps Cinema presentation rules scoped to their own CSS blocks', () => {
  assert.match(css, /aspect-ratio:\s*9\s*\/\s*16/);
  assert.match(css, /@media\s*\(max-width:\s*50rem\)/);
  const overlay = ruleBody('.story::after');

  assert.match(overlay, /linear-gradient/);
  assert.match(overlay, /rgb\(0 0 0 \/ \.72\) 0%/);
  assert.match(ruleBody('.story__notes'), /background:\s*transparent/);
  assert.match(ruleBody('.story__note'), /font-size:\s*clamp\(\s*1rem/);
});

test('keeps all Cinema JPEG assets in the project', () => {
  for (const asset of ['DSCF7335.jpeg', 'DSCF7341.jpeg', 'DSCF7347.jpeg']) {
    assert.ok(existsSync(new URL(`../assets/${asset}`, import.meta.url)), `missing ${asset}`);
  }
});

test('switches stories to one column inside the responsive media query', () => {
  const responsiveBody = nestedBlockBody(css, '@media (max-width: 50rem)');
  const storiesBody = nestedBlockBody(responsiveBody, '.stories');

  assert.match(storiesBody, /grid-template-columns:\s*minmax\(0,\s*30rem\)/);
});
