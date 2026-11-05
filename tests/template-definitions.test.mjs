import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATE_DEFINITIONS, getTemplateDefinition } from '../template-definitions.mjs';

test('defines exact output metadata for all templates', () => {
  assert.deepEqual(TEMPLATE_DEFINITIONS, {
    cinema: { id: 'cinema', label: 'Fotogramma', format: 'story', width: 1080, height: 1920, mediaCount: 1 },
    postcard: { id: 'postcard', label: 'Cartolina corsiva', format: 'story', width: 1080, height: 1920, mediaCount: 1 },
    'post-stack': { id: 'post-stack', label: 'Stack fotografico', format: 'post', width: 1080, height: 1440, mediaCount: 2 },
  });
  assert.ok(Object.isFrozen(TEMPLATE_DEFINITIONS));
  for (const definition of Object.values(TEMPLATE_DEFINITIONS)) {
    assert.ok(Object.isFrozen(definition));
    assert.equal(getTemplateDefinition(definition.id), definition);
  }
});

test('falls back to Cinema for an unknown template id', () => {
  for (const id of ['unknown', '__proto__', 'toString', undefined]) {
    assert.equal(getTemplateDefinition(id), TEMPLATE_DEFINITIONS.cinema);
  }
});
