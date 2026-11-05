import { POST_STACK_LAYOUT } from './post-stack-geometry.mjs';

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

const CANVAS_PADDING = 80;
const TEXT_SAFE_AREA = 250;
const TEXT_SAFE_OFFSET = TEXT_SAFE_AREA - CANVAS_PADDING;
const TOP_FADE_START = TEXT_SAFE_OFFSET;
const TOP_FADE_END = CANVAS_HEIGHT * 0.36 + TEXT_SAFE_OFFSET;
const BOTTOM_FADE_START = CANVAS_HEIGHT * 0.48 - TEXT_SAFE_OFFSET;
const BOTTOM_FADE_END = CANVAS_HEIGHT - TEXT_SAFE_OFFSET;
const RED = '#ff3b30';
const WHITE = '#f7f7f4';
const POSTCARD_FONT = 'italic 76px "Snell Roundhand", "Apple Chancery", cursive, serif';
const POSTCARD_LINE_HEIGHT = 106;
const clamp = (value, minimum, maximum) => {
  const clampedValue = Math.min(maximum, Math.max(minimum, value));
  return clampedValue === 0 ? 0 : clampedValue;
};

function finiteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function splitOversizedToken(token, measure, maxWidth) {
  const lines = [];
  let current = '';

  for (const codePoint of token) {
    const candidate = current + codePoint;
    if (current && measure(candidate) > maxWidth) {
      lines.push(current);
      current = codePoint;
    } else {
      current = candidate;
    }

    if (!current || measure(current) <= maxWidth) continue;

    lines.push(current);
    current = '';
  }

  if (current) lines.push(current);
  return lines;
}

function ellipsize(line, measure, maxWidth) {
  const ellipsis = '…';
  let result = line;

  while (result && measure(result + ellipsis) > maxWidth) {
    result = [...result].slice(0, -1).join('');
  }

  return result ? result + ellipsis : ellipsis;
}

function imageDimension(image, primary, secondary) {
  return finiteNumber(image?.[primary], 0) || finiteNumber(image?.[secondary], 0);
}

function formatDayValue(value) {
  return String(Math.max(0, Math.trunc(finiteNumber(value, 0)))).padStart(2, '0');
}

export function computeImagePlacement(
  imageWidth, imageHeight, zoom, offsetX, offsetY,
  frameWidth = CANVAS_WIDTH, frameHeight = CANVAS_HEIGHT,
) {
  const sourceWidth = finiteNumber(imageWidth, 0);
  const sourceHeight = finiteNumber(imageHeight, 0);
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new RangeError('Image dimensions must be positive.');
  }

  const baseScale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const scale = baseScale * clamp(finiteNumber(zoom, 1), 1, 3);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const maxX = Math.max(0, (width - frameWidth) / 2);
  const maxY = Math.max(0, (height - frameHeight) / 2);
  const clampedOffsetX = clamp(finiteNumber(offsetX, 0), -maxX, maxX);
  const clampedOffsetY = clamp(finiteNumber(offsetY, 0), -maxY, maxY);

  return {
    scale,
    width,
    height,
    x: (frameWidth - width) / 2 + clampedOffsetX,
    y: (frameHeight - height) / 2 + clampedOffsetY,
    maxX,
    maxY,
    offsetX: clampedOffsetX,
    offsetY: clampedOffsetY,
  };
}

export function wrapText(text, measure, maxWidth, maxLines) {
  const lineLimit = Math.max(0, Math.trunc(finiteNumber(maxLines, 0)));
  if (!lineLimit) return [];

  const widthLimit = finiteNumber(maxWidth, 0);
  const paragraphs = String(text ?? '').replaceAll('\r\n', '\n').split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.match(/\S+/gu) ?? [];
    if (!words.length) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(candidate) <= widthLimit) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
        current = '';
      }

      if (measure(word) <= widthLimit) {
        current = word;
        continue;
      }

      const fragments = splitOversizedToken(word, measure, widthLimit);
      lines.push(...fragments.slice(0, -1));
      current = fragments.at(-1) ?? '';
    }

    if (current) lines.push(current);
  }

  if (lines.length <= lineLimit) return lines;

  const visibleLines = lines.slice(0, lineLimit);
  visibleLines[lineLimit - 1] = ellipsize(visibleLines[lineLimit - 1], measure, widthLimit);
  return visibleLines;
}

function resetCanvasTextState(context) {
  context.fillStyle = WHITE;
  context.font = '10px sans-serif';
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
}

function renderPostcard(context, centerText) {
  const vignette = context.createRadialGradient(
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    260,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    1080,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = WHITE;
  context.font = POSTCARD_FONT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 0, 0, 0.72)';
  context.shadowBlur = 14;
  context.shadowOffsetY = 5;

  const text = String(centerText ?? '');
  const lines = /\S/u.test(text)
    ? wrapText(text, (value) => context.measureText(value).width, CANVAS_WIDTH - CANVAS_PADDING * 3, 5)
    : [];
  const startY = CANVAS_HEIGHT / 2 - ((lines.length - 1) * POSTCARD_LINE_HEIGHT) / 2;
  for (const [index, line] of lines.entries()) {
    if (line) context.fillText(line, CANVAS_WIDTH / 2, startY + index * POSTCARD_LINE_HEIGHT);
  }
}

export function renderPostStack(context, postSlots) {
  context.save();
  try {
    resetCanvasTextState(context);
    context.clearRect(0, 0, POST_STACK_LAYOUT.width, POST_STACK_LAYOUT.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, POST_STACK_LAYOUT.width, POST_STACK_LAYOUT.height);

    for (const [name, frame] of Object.entries(POST_STACK_LAYOUT.frames)) {
      const slot = postSlots?.[name];
      const image = slot?.image;
      const imageWidth = imageDimension(image, 'naturalWidth', 'width');
      const imageHeight = imageDimension(image, 'naturalHeight', 'height');
      if (!image || imageWidth <= 0 || imageHeight <= 0) continue;

      const placement = computeImagePlacement(
        imageWidth, imageHeight, slot.zoom, slot.offsetX, slot.offsetY,
        frame.width, frame.height,
      );
      context.save();
      try {
        context.beginPath();
        context.rect(frame.x, frame.y, frame.width, frame.height);
        context.clip();
        context.drawImage(
          image, frame.x + placement.x, frame.y + placement.y,
          placement.width, placement.height,
        );
      } finally {
        context.restore();
      }
    }
  } finally {
    context.restore();
  }
}

export function renderStory(context, state) {
  if (state?.template === 'post-stack') {
    renderPostStack(context, state?.postSlots);
    return;
  }

  resetCanvasTextState(context);
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const image = state?.image;
  const imageWidth = imageDimension(image, 'naturalWidth', 'width');
  const imageHeight = imageDimension(image, 'naturalHeight', 'height');
  if (image && imageWidth > 0 && imageHeight > 0) {
    const placement = computeImagePlacement(
      imageWidth,
      imageHeight,
      state?.zoom,
      state?.offsetX,
      state?.offsetY,
    );
    context.drawImage(image, placement.x, placement.y, placement.width, placement.height);
  }

  if (state?.template === 'postcard') {
    renderPostcard(context, state?.centerText);
    resetCanvasTextState(context);
    return;
  }

  const topFade = context.createLinearGradient(0, TOP_FADE_START, 0, TOP_FADE_END);
  topFade.addColorStop(0, 'rgba(0, 0, 0, 0.76)');
  topFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = topFade;
  context.fillRect(0, 0, CANVAS_WIDTH, TOP_FADE_END);

  const bottomFade = context.createLinearGradient(0, BOTTOM_FADE_START, 0, BOTTOM_FADE_END);
  bottomFade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomFade.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
  context.fillStyle = bottomFade;
  context.fillRect(
    0,
    BOTTOM_FADE_START,
    CANVAS_WIDTH,
    CANVAS_HEIGHT - BOTTOM_FADE_START,
  );

  context.textBaseline = 'top';
  context.fillStyle = RED;
  context.font = '800 34px system-ui, sans-serif';
  context.fillText(
    `Day ${formatDayValue(state?.day)} / ${formatDayValue(state?.totalDays)}`,
    CANVAS_PADDING,
    TEXT_SAFE_AREA,
  );

  context.fillStyle = WHITE;
  context.font = '800 104px system-ui, sans-serif';
  const measure = (value) => context.measureText(value).width;
  const title = String(state?.title ?? '').toUpperCase();
  const titleLines = /\S/u.test(title)
    ? wrapText(title, measure, CANVAS_WIDTH - CANVAS_PADDING * 2, 3)
    : [];
  titleLines.forEach((line, index) => {
    if (line) context.fillText(line, CANVAS_PADDING, TEXT_SAFE_AREA + 66 + index * 94);
  });

  context.font = '540 38px system-ui, sans-serif';
  const noteEntries = (state?.notes ?? [])
    .map((note) => String(note ?? ''))
    .filter((note) => /\S/u.test(note))
    .slice(0, 3)
    .map((note) => wrapText(note, measure, CANVAS_WIDTH - CANVAS_PADDING * 2, 2));

  let bottom = CANVAS_HEIGHT - TEXT_SAFE_AREA;
  for (const lines of noteEntries.reverse()) {
    bottom -= lines.length * 50;
    context.fillStyle = RED;
    context.fillText('—', CANVAS_PADDING, bottom);
    context.fillStyle = WHITE;
    for (const [index, line] of lines.entries()) {
      if (line) context.fillText(line, CANVAS_PADDING + 44, bottom + index * 50);
    }
    bottom -= 26;
  }

  resetCanvasTextState(context);
}
