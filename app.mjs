import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  computeImagePlacement,
  renderStory,
} from './story-renderer.mjs';
import { calculatePinchTransform, calculateTouchGeometry } from './touch-geometry.mjs';
import { getTemplateDefinition } from './template-definitions.mjs';
import { POST_STACK_LAYOUT, postSlotAtPoint } from './post-stack-geometry.mjs';

const form = document.querySelector('#story-form');
const appShell = document.querySelector('.app-shell');
const editor = document.querySelector('.editor');
const preview = document.querySelector('.preview');
const templateInputs = [
  document.querySelector('#template-cinema'),
  document.querySelector('#template-postcard'),
  document.querySelector('#template-post-stack'),
];
const cinemaFields = document.querySelector('#cinema-fields');
const postcardFields = document.querySelector('#postcard-fields');
const storyPhotoFields = document.querySelector('#story-photo-fields');
const postStackFields = document.querySelector('#post-stack-fields');
const photoInput = document.querySelector('#photo');
const postPhotoInputs = {
  top: document.querySelector('#post-photo-top'),
  bottom: document.querySelector('#post-photo-bottom'),
};
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
  postSlots: { top: createMediaState(), bottom: createMediaState() },
  activePostSlot: 'top',
  day: 1,
  totalDays: 35,
  title: 'Welcome to Kuala Lumpur',
  notes: ['', '', ''],
  centerText: '',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

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

function getActiveMediaState() {
  return state.template === 'post-stack' ? state.postSlots[state.activePostSlot] : state;
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

function syncZoomControl() {
  const media = getActiveMediaState();
  zoomInput.value = String(media.zoom);
  zoomValue.value = `${media.zoom.toFixed(2).replace('.', ',')}×`;
}

function syncActiveMediaPresentation() {
  const isPost = state.template === 'post-stack';
  const activeLabel = state.activePostSlot === 'top' ? 'Foto superiore' : 'Foto inferiore';
  const selectionHelp = isPost ? `${activeLabel} attiva.\nTocca o clicca un riquadro per selezionarlo. ` : '';
  const instructions = `${selectionHelp}Trascina la foto o usa i tasti freccia. Tieni premuto Maiusc per spostarla più velocemente. ${colorContextDescription}`;
  if (canvasInstructions.textContent !== instructions) canvasInstructions.textContent = instructions;
  postSelectionGuide.hidden = !isPost;
  if (isPost) {
    const frame = POST_STACK_LAYOUT.frames[state.activePostSlot];
    Object.assign(postSelectionGuide.style, {
      left: `${frame.x / canvas.width * 100}%`,
      top: `${frame.y / canvas.height * 100}%`,
      width: `${frame.width / canvas.width * 100}%`,
      height: `${frame.height / canvas.height * 100}%`,
    });
  }
}

function selectPostSlot(slot) {
  if (!slot) return;
  state.activePostSlot = slot;
  syncZoomControl();
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
  postStackFields.hidden = !isPost;
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
  const hasRequiredPhotos = state.template === 'post-stack'
    ? Boolean(state.postSlots.top.image && state.postSlots.bottom.image)
    : Boolean(state.image);
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
  if (templateId === 'post-stack') return 'instagram-post-stack.png';
  return templateId === 'postcard'
    ? 'travel-story-postcard.png'
    : `travel-story-day-${String(state.day).padStart(2, '0')}.png`;
}

async function exportStory() {
  if (downloadButton.disabled) return;

  const filename = filenameForTemplate(state.template);

  if (canSharePngFile) {
    try {
      const file = createPngShareFile(filename);
      const shareRequest = navigator.share({ files: [file] });
      await shareRequest;
      setStatus(`PNG condiviso: ${filename}`);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  try {
    const blob = await createPngBlob();
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
  if (state.template !== 'post-stack' && !state.image) {
    drawEmptyCanvas();
    return;
  }

  renderStory(context, state);
}

function clampOffsets(media = getActiveMediaState(), slot = state.template === 'post-stack' ? state.activePostSlot : null) {
  if (!media.image) return;
  const frame = slot
    ? POST_STACK_LAYOUT.frames[slot]
    : { width: canvas.width, height: canvas.height };
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

function loadPhoto(file, mediaState = state) {
  const request = ++mediaState.imageRequest;
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Scegli un file immagine valido. L’anteprima precedente non è stata modificata.');
    return;
  }

  const nextUrl = URL.createObjectURL(file);
  const nextImage = new Image();

  nextImage.addEventListener('load', () => {
    if (request !== mediaState.imageRequest) {
      URL.revokeObjectURL(nextUrl);
      return;
    }

    const previousUrl = mediaState.imageUrl;
    mediaState.image = nextImage;
    mediaState.imageUrl = nextUrl;
    mediaState.zoom = 1;
    mediaState.offsetX = 0;
    mediaState.offsetY = 0;
    const loadedSlot = Object.keys(state.postSlots).find((slot) => state.postSlots[slot] === mediaState);
    if (loadedSlot) state.activePostSlot = loadedSlot;
    syncZoomControl();
    updateAvailability('Fotografia caricata. Puoi regolare l’inquadratura.');
    redraw();

    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }, { once: true });

  nextImage.addEventListener('error', () => {
    URL.revokeObjectURL(nextUrl);
    if (request === mediaState.imageRequest) {
      setStatus('Impossibile leggere questa immagine. L’anteprima precedente non è stata modificata.');
    }
  }, { once: true });

  nextImage.src = nextUrl;
}

function moveImage(deltaX, deltaY, media = getActiveMediaState(), slot = state.template === 'post-stack' ? state.activePostSlot : null) {
  if (!media.image) return;
  media.offsetX += deltaX;
  media.offsetY += deltaY;
  clampOffsets(media, slot);
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

function getTouchGesture(touches) {
  if (touches.length !== 2) return null;
  const points = touches.map((touch) => canvasPointFromClient(touch.clientX, touch.clientY));
  if (points.some((point) => !point)) return null;

  let slot = null;
  let frame = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  if (state.template === 'post-stack') {
    slot = postSlotAtPoint(points[0].x, points[0].y);
    if (!slot || slot !== postSlotAtPoint(points[1].x, points[1].y)) return null;
    frame = POST_STACK_LAYOUT.frames[slot];
  }
  return { slot, ...calculateTouchGeometry(points, frame) };
}

function resetTouchGesture(touches) {
  const gesture = getTouchGesture(Array.from(touches));
  if (gesture?.slot) selectPostSlot(gesture.slot);
  const media = gesture?.slot ? state.postSlots[gesture.slot] : state;
  activeTouchGesture = media.image ? gesture : null;
}

function applyTouchGesture(touches) {
  if (!activeTouchGesture) return false;
  const currentGesture = getTouchGesture(Array.from(touches));
  if (!currentGesture || currentGesture.slot !== activeTouchGesture.slot) {
    // Retain the original target, and rebase if the fingers return to it.
    activeTouchGesture.centroid = null;
    return false;
  }
  if (!activeTouchGesture.centroid) {
    activeTouchGesture = currentGesture;
    return true;
  }

  const media = currentGesture.slot ? state.postSlots[currentGesture.slot] : state;
  const nextState = calculatePinchTransform({
    zoom: media.zoom,
    offsetX: media.offsetX,
    offsetY: media.offsetY,
    previousCentroid: activeTouchGesture.centroid,
    currentCentroid: currentGesture.centroid,
    previousDistance: activeTouchGesture.distance,
    currentDistance: currentGesture.distance,
  });
  Object.assign(media, nextState);
  clampOffsets(media, currentGesture.slot);
  syncZoomControl();
  redraw();
  activeTouchGesture = currentGesture;
  return true;
}

function finishPointer(event) {
  if (event.pointerType === 'touch') return;
  if (!activePointer || event.pointerId !== activePointer.id) return;

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  activePointer = null;
}

photoInput.addEventListener('change', () => {
  loadPhoto(photoInput.files?.[0]);
});

for (const [slot, input] of Object.entries(postPhotoInputs)) {
  input.addEventListener('change', () => loadPhoto(input.files?.[0], state.postSlots[slot]));
}

form.addEventListener('input', (event) => {
  if (![photoInput, ...Object.values(postPhotoInputs), zoomInput].includes(event.target)) updateTextState();
});

for (const templateInput of templateInputs) {
  templateInput.addEventListener('change', () => {
    if (!templateInput.checked) return;
    updateTextState();
  });
}

zoomInput.addEventListener('input', () => {
  getActiveMediaState().zoom = Number.parseFloat(zoomInput.value);
  syncZoomControl();
  clampOffsets();
  redraw();
});

recenterButton.addEventListener('click', () => {
  const media = getActiveMediaState();
  media.zoom = 1;
  media.offsetX = 0;
  media.offsetY = 0;
  syncZoomControl();
  redraw();
  updateAvailability(media.image ? 'Fotografia ricentrata.' : 'Carica una fotografia per iniziare.');
});

downloadButton.addEventListener('click', exportStory);

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch' || activePointer) return;
  const point = canvasPointFromClient(event.clientX, event.clientY);
  if (!point) return;
  const slot = state.template === 'post-stack' ? postSlotAtPoint(point.x, point.y) : null;
  if (state.template === 'post-stack') {
    if (!slot) return;
    selectPostSlot(slot);
  }
  const media = getActiveMediaState();
  if (!media.image) return;
  activePointer = { id: event.pointerId, point, media, slot };
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
  moveImage(deltaX, deltaY, activePointer.media, activePointer.slot);
});

canvas.addEventListener('pointerup', finishPointer);
canvas.addEventListener('pointercancel', finishPointer);

canvas.addEventListener('touchstart', (event) => {
  if (state.template === 'post-stack' && event.touches.length === 1) {
    const touch = event.touches[0];
    const point = canvasPointFromClient(touch.clientX, touch.clientY);
    if (point) selectPostSlot(postSlotAtPoint(point.x, point.y));
  }
  resetTouchGesture(event.touches);
});

canvas.addEventListener('touchmove', (event) => {
  if (event.touches.length !== 2 || event.cancelable === false) {
    activeTouchGesture = null;
    return;
  }

  if (applyTouchGesture(event.touches)) event.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (event) => {
  resetTouchGesture(event.touches);
});

canvas.addEventListener('touchcancel', (event) => {
  resetTouchGesture(event.touches);
});

canvas.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 48 : 12;
  const movements = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const movement = movements[event.key];
  if (!movement || !getActiveMediaState().image) return;

  event.preventDefault();
  moveImage(...movement);
});

updateAvailability();
redraw();
