export const TEMPLATE_DEFINITIONS = Object.freeze({
  cinema: Object.freeze({ id: 'cinema', label: 'Fotogramma', format: 'story', width: 1080, height: 1920, mediaCount: 1 }),
  postcard: Object.freeze({ id: 'postcard', label: 'Cartolina corsiva', format: 'story', width: 1080, height: 1920, mediaCount: 1 }),
  'post-stack': Object.freeze({ id: 'post-stack', label: 'Stack fotografico', format: 'post', width: 1080, height: 1440, mediaCount: 2 }),
});

export function getTemplateDefinition(templateId) {
  return Object.hasOwn(TEMPLATE_DEFINITIONS, templateId)
    ? TEMPLATE_DEFINITIONS[templateId]
    : TEMPLATE_DEFINITIONS.cinema;
}
