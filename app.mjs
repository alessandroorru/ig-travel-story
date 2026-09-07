import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  computeImagePlacement,
  renderStory,
} from './story-renderer.mjs';

const form = document.querySelector('#story-form');
const appShell = document.querySelector('.app-shell');
const editor = document.querySelector('.editor');
const preview = document.querySelector('.preview');
const photoInput = document.querySelector('#photo');
const dayInput = document.querySelector('#day');
const totalDaysInput = document.querySelector('#total-days');
const titleInput = document.querySelector('#title');
const noteInputs = [
  document.querySelector('#note-1'),
  document.querySelector('#note-2'),
  document.querySelector('#note-3'),
];
const zoomInput = document.querySelector('#zoom');
const zoomValue = document.querySelector('#zoom-value');
const recenterButton = document.querySelector('#recenter');
const downloadButton = document.querySelector('#download');
const status = document.querySelector('#status');
const canvas = document.querySelector('#story-canvas');
const context = canvas.getContext('2d');

const state = {
  image: null,
  imageUrl: null,
  day: 1,
  totalDays: 35,
  title: 'Welcome to Kuala Lumpur',
  notes: ['', '', ''],
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

let activePointer = null;
let imageRequest = 0;
const DAY_RANGE_ERROR = 'Il giorno deve essere un intero tra 1 e 999 e non può superare i giorni totali.';

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

function readInteger(input) {
  const value = Number(input.value);
  return Number.isInteger(value) ? value : Number.NaN;
}

function hasValidDayRange() {
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
  dayInput.setAttribute('aria-invalid', String(!validRange));
  totalDaysInput.setAttribute('aria-invalid', String(!validRange));
  downloadButton.disabled = !state.image || !validRange;

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

async function downloadStory() {
  if (downloadButton.disabled) return;

  let downloadUrl = null;
  let link = null;
  const filename = `travel-story-day-${String(state.day).padStart(2, '0')}.png`;

  try {
    const blob = await createPngBlob();
    downloadUrl = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    setStatus(`PNG scaricato: ${filename}`);
  } catch {
    setStatus("Impossibile creare il PNG. Riprova con un'altra immagine.");
  } finally {
    link?.remove();
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
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
  if (!state.image) {
    drawEmptyCanvas();
    return;
  }

  renderStory(context, state);
}

function clampOffsets() {
  if (!state.image) return;

  const placement = computeImagePlacement(
    state.image.naturalWidth,
    state.image.naturalHeight,
    state.zoom,
    state.offsetX,
    state.offsetY,
  );
  state.offsetX = placement.offsetX;
  state.offsetY = placement.offsetY;
}

function updateTextState() {
  state.day = readInteger(dayInput);
  state.totalDays = readInteger(totalDaysInput);
  state.title = titleInput.value;
  state.notes = noteInputs.map((input) => input.value);
  updateAvailability();
  redraw();
}

function loadPhoto(file) {
  const request = ++imageRequest;
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Scegli un file immagine valido. L’anteprima precedente non è stata modificata.');
    return;
  }

  const nextUrl = URL.createObjectURL(file);
  const nextImage = new Image();

  nextImage.addEventListener('load', () => {
    if (request !== imageRequest) {
      URL.revokeObjectURL(nextUrl);
      return;
    }

    const previousUrl = state.imageUrl;
    state.image = nextImage;
    state.imageUrl = nextUrl;
    state.zoom = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    zoomInput.value = '1';
    zoomValue.value = '1,00×';
    updateAvailability('Fotografia caricata. Puoi regolare l’inquadratura.');
    redraw();

    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }, { once: true });

  nextImage.addEventListener('error', () => {
    URL.revokeObjectURL(nextUrl);
    if (request === imageRequest) {
      setStatus('Impossibile leggere questa immagine. L’anteprima precedente non è stata modificata.');
    }
  }, { once: true });

  nextImage.src = nextUrl;
}

function moveImage(deltaX, deltaY) {
  if (!state.image) return;
  state.offsetX += deltaX;
  state.offsetY += deltaY;
  clampOffsets();
  redraw();
}

function finishPointer(event) {
  if (!activePointer || event.pointerId !== activePointer.id) return;

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  activePointer = null;
}

photoInput.addEventListener('change', () => {
  loadPhoto(photoInput.files?.[0]);
});

form.addEventListener('input', (event) => {
  if (event.target !== photoInput && event.target !== zoomInput) updateTextState();
});

zoomInput.addEventListener('input', () => {
  state.zoom = Number.parseFloat(zoomInput.value);
  zoomValue.value = `${state.zoom.toFixed(2).replace('.', ',')}×`;
  clampOffsets();
  redraw();
});

recenterButton.addEventListener('click', () => {
  state.zoom = 1;
  state.offsetX = 0;
  state.offsetY = 0;
  zoomInput.value = '1';
  zoomValue.value = '1,00×';
  redraw();
  updateAvailability(state.image ? 'Fotografia ricentrata.' : 'Carica una fotografia per iniziare.');
});

downloadButton.addEventListener('click', downloadStory);

canvas.addEventListener('pointerdown', (event) => {
  if (!state.image || activePointer) return;
  activePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.focus();
});

canvas.addEventListener('pointermove', (event) => {
  if (!activePointer || event.pointerId !== activePointer.id) return;

  const scaleX = 1080 / canvas.clientWidth;
  const scaleY = 1920 / canvas.clientHeight;
  const deltaX = (event.clientX - activePointer.x) * scaleX;
  const deltaY = (event.clientY - activePointer.y) * scaleY;
  activePointer.x = event.clientX;
  activePointer.y = event.clientY;
  moveImage(deltaX, deltaY);
});

canvas.addEventListener('pointerup', finishPointer);
canvas.addEventListener('pointercancel', finishPointer);

canvas.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 48 : 12;
  const movements = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const movement = movements[event.key];
  if (!movement || !state.image) return;

  event.preventDefault();
  moveImage(...movement);
});

updateAvailability();
redraw();
