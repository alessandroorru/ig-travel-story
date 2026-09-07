export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

const CANVAS_PADDING = 80;
const RED = '#ff3b30';
const WHITE = '#f7f7f4';
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

export function computeImagePlacement(imageWidth, imageHeight, zoom, offsetX, offsetY) {
  const sourceWidth = finiteNumber(imageWidth, 0);
  const sourceHeight = finiteNumber(imageHeight, 0);
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new RangeError('Image dimensions must be positive.');
  }

  const baseScale = Math.max(CANVAS_WIDTH / sourceWidth, CANVAS_HEIGHT / sourceHeight);
  const scale = baseScale * clamp(finiteNumber(zoom, 1), 1, 3);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const maxX = Math.max(0, (width - CANVAS_WIDTH) / 2);
  const maxY = Math.max(0, (height - CANVAS_HEIGHT) / 2);
  const clampedOffsetX = clamp(finiteNumber(offsetX, 0), -maxX, maxX);
  const clampedOffsetY = clamp(finiteNumber(offsetY, 0), -maxY, maxY);

  return {
    scale,
    width,
    height,
    x: (CANVAS_WIDTH - width) / 2 + clampedOffsetX,
    y: (CANVAS_HEIGHT - height) / 2 + clampedOffsetY,
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

export function renderStory(context, state) {
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

  const topFade = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.36);
  topFade.addColorStop(0, 'rgba(0, 0, 0, 0.76)');
  topFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = topFade;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.36);

  const bottomFade = context.createLinearGradient(0, CANVAS_HEIGHT * 0.48, 0, CANVAS_HEIGHT);
  bottomFade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomFade.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
  context.fillStyle = bottomFade;
  context.fillRect(0, CANVAS_HEIGHT * 0.48, CANVAS_WIDTH, CANVAS_HEIGHT * 0.52);

  context.textBaseline = 'top';
  context.fillStyle = RED;
  context.font = '800 34px system-ui, sans-serif';
  context.fillText(
    `${formatDayValue(state?.day)} / ${formatDayValue(state?.totalDays)}`,
    CANVAS_PADDING,
    CANVAS_PADDING,
  );

  context.fillStyle = WHITE;
  context.font = '800 104px system-ui, sans-serif';
  const measure = (value) => context.measureText(value).width;
  const title = String(state?.title ?? '').toUpperCase();
  const titleLines = /\S/u.test(title)
    ? wrapText(title, measure, CANVAS_WIDTH - CANVAS_PADDING * 2, 3)
    : [];
  titleLines.forEach((line, index) => {
    if (line) context.fillText(line, CANVAS_PADDING, 146 + index * 94);
  });

  context.font = '540 38px system-ui, sans-serif';
  const noteEntries = (state?.notes ?? [])
    .map((note) => String(note ?? ''))
    .filter((note) => /\S/u.test(note))
    .slice(0, 3)
    .map((note) => wrapText(note, measure, CANVAS_WIDTH - CANVAS_PADDING * 2, 2));

  let bottom = CANVAS_HEIGHT - CANVAS_PADDING;
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
}
