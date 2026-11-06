import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  computeImagePlacement,
  renderStory,
} from './story-renderer.mjs';
import { calculatePinchTransform, calculateTouchGeometry } from './touch-geometry.mjs';
import { getTemplateDefinition, TEMPLATE_DEFINITIONS } from './template-definitions.mjs';
import { getPostLayout, postSlotAtPoint } from './post-stack-geometry.mjs';

const form = document.querySelector('#story-form');
const appShell = document.querySelector('.app-shell');
const editor = document.querySelector('.editor');
const preview = document.querySelector('.preview');
const templateDefinitions = Object.values(TEMPLATE_DEFINITIONS);
const templateInputs = templateDefinitions.map(({ id }) => document.querySelector(`#template-${id}`));
const postTemplates = templateDefinitions.filter(({ format }) => format === 'post');
const cinemaFields = document.querySelector('#cinema-fields');
const postcardFields = document.querySelector('#postcard-fields');
const storyPhotoFields = document.querySelector('#story-photo-fields');
const photoInput = document.querySelector('#photo');
const canvasStage = document.querySelector('.canvas-stage');
const previewTitle = document.querySelector('#preview-title');
const canvasInstructions = document.querySelector('#canvas-instructions');
const storyOverlay = document.querySelector('#instagram-preview-overlay');
const postSelectionGuide = document.querySelector('#post-selection-guide');
canvasInstructions.setAttribute('aria-live', 'polite');
const dayInput = document.querySelector('#day');
const totalDaysInput = document.querySelector('#total-days');
const titleInput = document.querySelector('#title');
const noteInputs = [
  document.querySelector('#note-1'),
  document.querySelector('#note-2'),
  document.querySelector('#note-3'),
];
const centerTextInput = document.querySelector('#center-text');
const zoomInput = document.querySelector('#zoom');
const zoomValue = document.querySelector('#zoom-value');
const recenterButton = document.querySelector('#recenter');
const downloadButton = document.querySelector('#download');
const status = document.querySelector('#status');
const canvas = document.querySelector('#story-canvas');
const context = createPreferredCanvasContext(canvas);
const colorContextDescription = describeCanvasContext(context);

const state = {
  template: 'cinema',
  image: null,
  imageUrl: null,
  imageRequest: 0,
  postMedia: Object.fromEntries(postTemplates.map(({ id }) => {
    const slotNames = Object.keys(getPostLayout(id).frames);
    const slots = Object.fromEntries(slotNames.map((slot) => [slot, createMediaState()]));
    return [id, { activeSlot: slotNames[0], slots }];
  })),
  day: 1,
  totalDays: 35,
  title: 'Welcome to Kuala Lumpur',
  notes: ['', '', ''],
  centerText: '',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

const postControls = Object.fromEntries(postTemplates.map(({ id }) => {
  const fields = document.querySelector(`#${id}-fields`);
  const slots = Object.fromEntries(Object.keys(state.postMedia[id].slots).map((slot) => {
    const suffix = slot.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return [slot, {
      input: document.querySelector(`#post-photo-${suffix}`),
      button: document.querySelector(`#post-select-${suffix}`),
    }];
  }));
  return [id, { fields, slots }];
}));
const postPhotoInputs = Object.values(postControls).flatMap(({ slots }) => (
  Object.values(slots).map(({ input }) => input)
));
const mediaInputs = [photoInput, zoomInput, ...postPhotoInputs];

let activePointer = null;
let activeTouchGesture = null;
const DAY_RANGE_ERROR = 'Il giorno deve essere un intero tra 1 e 999 e non può superare i giorni totali.';

function createMediaState() {
  return { image: null, imageUrl: null, zoom: 1, offsetX: 0, offsetY: 0, imageRequest: 0 };
}

function createPreferredCanvasContext(targetCanvas) {
  try {
    const preferred = targetCanvas.getContext('2d', { colorSpace: 'display-p3', colorType: 'float16' });
    if (preferred) return preferred;
  } catch {
    // Browsers that reject extended color options can still render standard PNGs.
  }
  return targetCanvas.getContext('2d');
}

function describeCanvasContext(targetContext) {
  let attributes;
  try {
    attributes = targetContext?.getContextAttributes?.();
  } catch {
    // Do not infer color support from accepting the requested options.
  }
  if (!attributes) return 'Modalità colore non verificabile dal browser.';
  const colorSpace = attributes.colorSpace === 'display-p3' ? 'Display-P3'
    : attributes.colorSpace === 'srgb' ? 'sRGB' : 'spazio colore non verificabile';
  const colorType = ['float16', 'unorm8'].includes(attributes.colorType)
    ? attributes.colorType : 'precisione non verificabile';
  return `Anteprima: ${colorSpace}, ${colorType}.`;
}

function getActivePost() {
  return state.postMedia[state.template];
}

function getMediaTarget(slot) {
  const post = getActivePost();
  if (!post) {
    return { media: state, frame: { x: 0, y: 0, width: canvas.width, height: canvas.height } };
  }
  const targetSlot = slot ?? post.activeSlot;
  return { media: post.slots[targetSlot], frame: getPostLayout(state.template).frames[targetSlot] };
}

function synchronizeResponsiveOrder(isMobile) {
  if (!appShell || !editor || !preview) return;
  appShell.insertBefore(isMobile ? preview : editor, isMobile ? editor : preview);
}

const viewportQuery = globalThis.matchMedia?.('(max-width: 60rem)');
if (viewportQuery) {
  synchronizeResponsiveOrder(viewportQuery.matches);
  viewportQuery.addEventListener?.('change', (event) => synchronizeResponsiveOrder(event.matches));
}

function setStatus(message) {
  status.textContent = message;
}

function syncZoomControl(media = getMediaTarget().media) {
  zoomInput.value = String(media.zoom);
  zoomValue.value = `${media.zoom.toFixed(2).replace('.', ',')}×`;
}

function syncActiveMediaPresentation() {
  const post = getActivePost();
  const activeLabel = post ? postControls[state.template].slots[post.activeSlot].input.labels[0].textContent : '';
  const selectionHelp = post ? `${activeLabel} attiva.\nTocca o clicca un riquadro per selezionarlo. ` : '';
  const instructions = `${selectionHelp}Trascina la foto o usa i tasti freccia. Tieni premuto Maiusc per spostarla più velocemente. ${colorContextDescription}`;
  if (canvasInstructions.textContent !== instructions) canvasInstructions.textContent = instructions;
  postSelectionGuide.hidden = !post;
  if (post) {
    for (const [slot, { button }] of Object.entries(postControls[state.template].slots)) {
      button.setAttribute('aria-pressed', String(slot === post.activeSlot));
    }
    const frame = getPostLayout(state.template).frames[post.activeSlot];
    Object.assign(postSelectionGuide.style, {
      left: `${frame.x / canvas.width * 100}%`,
      top: `${frame.y / canvas.height * 100}%`,
      width: `${frame.width / canvas.width * 100}%`,
      height: `${frame.height / canvas.height * 100}%`,
    });
  }
}

function selectPostSlot(slot) {
  const post = getActivePost();
  if (!post?.slots[slot]) return;
  post.activeSlot = slot;
  syncZoomControl(post.slots[slot]);
  syncActiveMediaPresentation();
}

function selectedTemplate() {
  return getTemplateDefinition(templateInputs.find((input) => input?.checked)?.value).id;
}

function syncTemplatePresentation() {
  const definition = getTemplateDefinition(state.template);
  const isPost = definition.format === 'post';
  // Setting dimensions resets canvas state, so only resize when the format changes.
  if (canvas.width !== definition.width) canvas.width = definition.width;
  if (canvas.height !== definition.height) canvas.height = definition.height;
  const aspectRatio = `${definition.width} / ${definition.height}`;
  canvas.style.aspectRatio = aspectRatio;
  canvasStage.style.aspectRatio = aspectRatio;
  previewTitle.textContent = `${definition.width} × ${definition.height}`;
  canvas.setAttribute('aria-label', `Anteprima ${isPost ? 'post Instagram' : 'travel story'} ${definition.width} × ${definition.height}`);
  syncActiveMediaPresentation();
  storyOverlay.toggleAttribute('hidden', isPost);
  storyPhotoFields.hidden = isPost;
  for (const [id, { fields }] of Object.entries(postControls)) fields.hidden = id !== state.template;
  cinemaFields.hidden = state.template !== 'cinema';
  postcardFields.hidden = state.template !== 'postcard';
  for (const input of templateInputs) input.checked = input.value === state.template;
}

function readInteger(input) {
  const value = Number(input.value);
  return Number.isInteger(value) ? value : Number.NaN;
}

function hasValidDayRange() {
  if (state.template !== 'cinema') return true;

  return (
    Number.isInteger(state.day)
    && state.day >= 1
    && state.day <= 999
    && Number.isInteger(state.totalDays)
    && state.totalDays >= 1
    && state.totalDays <= 999
    && state.day <= state.totalDays
  );
}

function updateAvailability(statusWhenValid) {
  const validRange = hasValidDayRange();
  const showDayError = state.template === 'cinema' && !validRange;
  dayInput.setAttribute('aria-invalid', String(showDayError));
  totalDaysInput.setAttribute('aria-invalid', String(showDayError));
  const post = getActivePost();
  const hasRequiredPhotos = post ? Object.values(post.slots).every(({ image }) => image) : Boolean(state.image);
  downloadButton.disabled = !hasRequiredPhotos || !validRange;

  if (!validRange) {
    setStatus(DAY_RANGE_ERROR);
  } else if (statusWhenValid !== undefined) {
    setStatus(statusWhenValid);
  } else if (status.textContent === DAY_RANGE_ERROR) {
    setStatus('');
  }

  return validRange;
}

function createPngBlob() {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas returned an empty PNG blob.'));
        }
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

function supportsPngFileShare() {
  if (
    typeof globalThis.navigator?.share !== 'function'
    || typeof globalThis.navigator?.canShare !== 'function'
    || typeof globalThis.File !== 'function'
  ) {
    return false;
  }

  try {
    const probe = new File([''], 'travel-story.png', { type: 'image/png' });
    return globalThis.navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function createPngShareFile(filename) {
  const dataUrl = canvas.toDataURL('image/png');
  const match = /^data:image\/png;base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error('Canvas returned an invalid PNG data URL.');

  const binary = globalThis.atob(match[1]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], filename, { type: 'image/png' });
}

function downloadPng(blob, filename) {
  let downloadUrl = null;
  let link = null;

  try {
    downloadUrl = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
  } finally {
    link?.remove();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  }
}

const canSharePngFile = supportsPngFileShare();
downloadButton.textContent = canSharePngFile ? 'Salva o condividi PNG' : 'Scarica PNG';

function filenameForTemplate(templateId) {
  const { exportFilename } = getTemplateDefinition(templateId);
  if (exportFilename) return exportFilename;
  if (templateId === 'post-stack') return 'instagram-post-stack.png';
  return templateId === 'postcard'
    ? 'travel-story-postcard.png'
    : `travel-story-day-${String(state.day).padStart(2, '0')}.png`;
}

async function exportStory() {
  if (downloadButton.disabled) return;

  const filename = filenameForTemplate(state.template);
  let file;

  if (canSharePngFile) {
    try {
      file = createPngShareFile(filename);
      const shareRequest = navigator.share({ files: [file] });
      await shareRequest;
      setStatus(`PNG condiviso: ${filename}`);
      return;
    } catch (error) {
      if (file && error?.name === 'AbortError') return;
    }
  }

  try {
    const blob = file ?? await createPngBlob();
    downloadPng(blob, filename);
    setStatus(`PNG scaricato: ${filename}`);
  } catch {
    setStatus("Impossibile creare il PNG. Riprova con un'altra immagine.");
  }
}

function drawEmptyCanvas() {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.fillStyle = '#10100f';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.strokeStyle = '#343430';
  context.lineWidth = 3;
  context.setLineDash([12, 18]);
  context.strokeRect(82, 82, CANVAS_WIDTH - 164, CANVAS_HEIGHT - 164);
  context.setLineDash([]);
  context.fillStyle = '#f7f7f4';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '750 48px system-ui, sans-serif';
  context.fillText('CARICA UNA FOTOGRAFIA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 34);
  context.fillStyle = '#8c8c87';
  context.font = '400 29px system-ui, sans-serif';
  context.fillText('Poi trascinala per scegliere l’inquadratura', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 34);
  context.textAlign = 'start';
}

function redraw() {
  syncTemplatePresentation();
  const post = getActivePost();
  if (!post && !state.image) {
    drawEmptyCanvas();
    return;
  }

  renderStory(context, post ? { template: state.template, postSlots: post.slots } : state);
}

function clampOffsets(media, frame) {
  if (!media.image) return;
  const placement = computeImagePlacement(
    media.image.naturalWidth, media.image.naturalHeight,
    media.zoom, media.offsetX, media.offsetY, frame.width, frame.height,
  );
  media.offsetX = placement.offsetX;
  media.offsetY = placement.offsetY;
}

function updateTextState() {
  const template = selectedTemplate();
  if (template !== state.template) {
    if (activePointer) finishPointer({ pointerId: activePointer.id });
    activeTouchGesture = null;
  }
  state.template = template;
  state.day = readInteger(dayInput);
  state.totalDays = readInteger(totalDaysInput);
  state.title = titleInput.value;
  state.notes = noteInputs.map((input) => input.value);
  state.centerText = centerTextInput.value;
  syncZoomControl();
  updateAvailability();
  redraw();
}

function loadPhoto(file, templateId, slot) {
  const post = state.postMedia[templateId];
  const mediaState = post ? post.slots[slot] : state;
  const canUpdatePresentation = () => !post || state.template === templateId;
  const request = ++mediaState.imageRequest;
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    if (canUpdatePresentation()) setStatus('Scegli un file immagine valido. L’anteprima precedente non è stata modificata.');
    return;
  }

  const nextUrl = URL.createObjectURL(file);
  const nextImage = new Image();

  function rejectImage() {
    URL.revokeObjectURL(nextUrl);
    if (request === mediaState.imageRequest && canUpdatePresentation()) {
      setStatus('Impossibile leggere questa immagine. L’anteprima precedente non è stata modificata.');
    }
  }

  nextImage.addEventListener('load', () => {
    if (request !== mediaState.imageRequest) {
      URL.revokeObjectURL(nextUrl);
      return;
    }

    if (!(nextImage.naturalWidth > 0 && nextImage.naturalHeight > 0)) {
      rejectImage();
      return;
    }

    const previousUrl = mediaState.imageUrl;
    mediaState.image = nextImage;
    mediaState.imageUrl = nextUrl;
    mediaState.zoom = 1;
    mediaState.offsetX = 0;
    mediaState.offsetY = 0;
    if (post) post.activeSlot = slot;
    if (canUpdatePresentation()) {
      syncZoomControl();
      updateAvailability('Fotografia caricata. Puoi regolare l’inquadratura.');
      redraw();
    }
    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }, { once: true });

  nextImage.addEventListener('error', rejectImage, { once: true });

  nextImage.src = nextUrl;
}

function moveImage(deltaX, deltaY, { media, frame }) {
  media.offsetX += deltaX;
  media.offsetY += deltaY;
  clampOffsets(media, frame);
  redraw();
}

function canvasPointFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: (clientX - rect.left) * canvas.width / rect.width,
    y: (clientY - rect.top) * canvas.height / rect.height,
  };
}

function getTouchPoints(touches) {
  const points = Array.from(touches, ({ clientX, clientY }) => canvasPointFromClient(clientX, clientY));
  return points.every(Boolean) ? points : null;
}

function startTouchGesture(touches) {
  activeTouchGesture = null;
  if (touches.length !== 2) return;
  const points = getTouchPoints(touches);
  if (!points) return;

  let slot;
  if (getActivePost()) {
    slot = postSlotAtPoint(state.template, points[0].x, points[0].y);
    if (!slot || slot !== postSlotAtPoint(state.template, points[1].x, points[1].y)) return;
    selectPostSlot(slot);
  }
  const target = getMediaTarget(slot);
  if (!target.media.image) return;
  activeTouchGesture = { ...target, slot, geometry: calculateTouchGeometry(points, target.frame) };
}

function applyTouchGesture(touches) {
  const gesture = activeTouchGesture;
  if (!gesture) return false;
  const { media, frame, slot } = gesture;
  const points = getTouchPoints(touches);
  if (!points || (slot && points.some(({ x, y }) => postSlotAtPoint(state.template, x, y) !== slot))) {
    // Retain the original target, and rebase if the fingers return to it.
    gesture.geometry = null;
    return false;
  }
  const previous = gesture.geometry;
  const current = calculateTouchGeometry(points, frame);
  gesture.geometry = current;
  if (!previous) return true;

  const nextState = calculatePinchTransform({
    zoom: media.zoom,
    offsetX: media.offsetX,
    offsetY: media.offsetY,
    previousCentroid: previous.centroid,
    currentCentroid: current.centroid,
    previousDistance: previous.distance,
    currentDistance: current.distance,
  });
  Object.assign(media, nextState);
  clampOffsets(media, frame);
  syncZoomControl();
  redraw();
  return true;
}

function finishTouchGesture() {
  activeTouchGesture = null;
}

function finishPointer(event) {
  if (event.pointerType === 'touch') return;
  if (!activePointer || event.pointerId !== activePointer.id) return;

  activePointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

photoInput.addEventListener('change', () => {
  loadPhoto(photoInput.files?.[0]);
});

for (const [id, { slots }] of Object.entries(postControls)) {
  for (const [slot, { input, button }] of Object.entries(slots)) {
    input.addEventListener('change', () => loadPhoto(input.files?.[0], id, slot));
    button.addEventListener('click', () => {
      if (state.template === id) selectPostSlot(slot);
    });
  }
}

form.addEventListener('input', (event) => {
  if (!mediaInputs.includes(event.target)) updateTextState();
});

for (const templateInput of templateInputs) {
  templateInput.addEventListener('change', () => {
    if (!templateInput.checked) return;
    updateTextState();
  });
}

zoomInput.addEventListener('input', () => {
  const { media, frame } = getMediaTarget();
  media.zoom = Number.parseFloat(zoomInput.value);
  syncZoomControl(media);
  clampOffsets(media, frame);
  redraw();
});

recenterButton.addEventListener('click', () => {
  const { media } = getMediaTarget();
  media.zoom = 1;
  media.offsetX = 0;
  media.offsetY = 0;
  syncZoomControl(media);
  redraw();
  updateAvailability(media.image ? 'Fotografia ricentrata.' : 'Carica una fotografia per iniziare.');
});

downloadButton.addEventListener('click', exportStory);

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' || activePointer) return;
  const point = canvasPointFromClient(event.clientX, event.clientY);
  if (!point) return;
  const post = getActivePost();
  const slot = post ? postSlotAtPoint(state.template, point.x, point.y) : null;
  if (post && !slot) return;
  if (slot) selectPostSlot(slot);
  const target = getMediaTarget(slot);
  if (!target.media.image) return;
  activePointer = { ...target, id: event.pointerId, point };
  canvas.setPointerCapture(event.pointerId);
  canvas.focus();
});

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  if (!activePointer || event.pointerId !== activePointer.id) return;
  const point = canvasPointFromClient(event.clientX, event.clientY);
  if (!point) return;
  const deltaX = point.x - activePointer.point.x;
  const deltaY = point.y - activePointer.point.y;
  activePointer.point = point;
  moveImage(deltaX, deltaY, activePointer);
});

canvas.addEventListener('pointerup', finishPointer);
canvas.addEventListener('pointercancel', finishPointer);
canvas.addEventListener('lostpointercapture', finishPointer);

canvas.addEventListener('touchstart', (event) => {
  if (getActivePost() && event.touches.length === 1) {
    const touch = event.touches[0];
    const point = canvasPointFromClient(touch.clientX, touch.clientY);
    if (point) selectPostSlot(postSlotAtPoint(state.template, point.x, point.y));
  }
  startTouchGesture(event.touches);
});

canvas.addEventListener('touchmove', (event) => {
  if (event.touches.length !== 2 || event.cancelable === false) {
    activeTouchGesture = null;
    return;
  }

  if (applyTouchGesture(event.touches)) event.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', finishTouchGesture);
canvas.addEventListener('touchcancel', finishTouchGesture);

canvas.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 48 : 12;
  const movements = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const movement = movements[event.key];
  if (!movement) return;
  const target = getMediaTarget();
  if (!target.media.image) return;

  event.preventDefault();
  moveImage(...movement, target);
});

updateAvailability();
redraw();
