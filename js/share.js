// Sharing: hands images and text to the system share sheet (mobile, e.g. to WeChat), falling
// back to a download or the clipboard. Also draws a report model (see report.js) as a PNG.

import { h } from './dom.js';

/**
 * Shares a file, or downloads it where file sharing is unsupported. Call it straight from a
 * click handler with a ready blob: iOS Safari rejects share() once the tap is "used up".
 * @returns {Promise<boolean>} false when the user cancelled the share sheet
 */
export async function shareFile(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      console.warn('Share failed, downloading instead', err);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Copies text, with a fallback for in-app browsers lacking the async clipboard API. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h('textarea', { value: text, readOnly: true });
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/**
 * Copies text and also opens the share sheet where supported. Both start in the same tick so
 * the click's user activation covers both.
 * @returns {Promise<boolean>} whether the text reached the clipboard
 */
export async function shareText(text) {
  const copied = copyText(text);
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch {
      // Cancelled or unsupported: the text is still on the clipboard.
    }
  }
  return copied;
}

// ---------- Image rendering ----------

// Fixed light palette: shared images look the same whatever the app theme.
const COLORS = {
  bg: '#f4f5f7',
  surface: '#ffffff',
  border: '#e3e5e8',
  text: '#1f2328',
  muted: '#6b7280',
  primary: '#2563eb',
  danger: '#dc2626',
};
const FAMILY = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif';
const font = (size, weight = 400) => `${weight} ${size}px ${FAMILY}`;

const WIDTH = 420;
const PAD = 20; // page padding
const CARD_PAD = 14; // horizontal padding inside list cards
const ROW_PAD = 11; // vertical padding of a row
const GAP = 12; // gap between a row's main text and its side text
const MAX_SCALE = 2;
const MAX_DEVICE_HEIGHT = 16000; // stay clear of mobile canvas size limits
const MAX_DEVICE_AREA = 16_000_000;

const STYLES = {
  title: { size: 20, weight: 700, color: COLORS.text, line: 28 },
  period: { size: 14, weight: 400, color: COLORS.muted, line: 20 },
  summary: { size: 15, weight: 600, color: COLORS.primary, line: 22 },
  heading: { size: 13, weight: 500, color: COLORS.muted, line: 18 },
  rowTitle: { size: 15, weight: 600, color: COLORS.text, line: 21 },
  rowMeta: { size: 13, weight: 400, color: COLORS.muted, line: 18 },
  side: { size: 15, weight: 600, color: COLORS.text, line: 21 },
  footer: { size: 12, weight: 400, color: COLORS.muted, line: 16 },
};

// Punctuation that must not start a line; it may overhang the right edge slightly instead.
const NO_LINE_START = new Set('、，。：；！？）」』》,.:;!?)');

/** Breaks text into lines no wider than maxWidth. Wraps per character (fine for CJK). */
function wrap(ctx, text, style, maxWidth) {
  ctx.font = font(style.size, style.weight);
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (line && !NO_LINE_START.has(ch) && ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line);
      line = ch.trim() ? ch : '';
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Lays the model out as a list of draw operations, so the canvas height is known before
 * drawing. Operations: {kind: 'text', x, y, text, style, color?, align?} and
 * {kind: 'card', y, height} and {kind: 'rule', y}.
 */
function layout(ctx, model, footer) {
  const ops = [];
  let y = PAD;
  const inner = WIDTH - PAD * 2;
  const block = (text, style) => {
    for (const line of wrap(ctx, text, style, inner)) {
      ops.push({ kind: 'text', x: PAD, y, text: line, style });
      y += style.line;
    }
  };

  block(model.title, STYLES.title);
  y += 2;
  block(model.period, STYLES.period);
  y += 4;
  block(model.summary, STYLES.summary);

  for (const group of model.groups) {
    y += 14;
    if (group.heading) {
      block(group.heading, STYLES.heading);
      y += 6;
    }
    const card = { kind: 'card', y, height: 0 };
    ops.push(card);
    group.rows.forEach((row, i) => {
      if (i) ops.push({ kind: 'rule', y });
      const sideColor = row.tone === 'leave' ? COLORS.danger : row.tone === 'muted' ? COLORS.muted : COLORS.text;
      ctx.font = font(STYLES.side.size, STYLES.side.weight);
      const sideWidth = row.side ? Math.ceil(ctx.measureText(row.side).width) : 0;
      const mainWidth = inner - CARD_PAD * 2 - (sideWidth ? sideWidth + GAP : 0);
      const x = PAD + CARD_PAD;
      let rowY = y + ROW_PAD;
      if (row.side) {
        ops.push({ kind: 'text', x: WIDTH - PAD - CARD_PAD, y: rowY, text: row.side, style: STYLES.side, color: sideColor, align: 'right' });
      }
      for (const line of wrap(ctx, row.title, STYLES.rowTitle, mainWidth)) {
        ops.push({ kind: 'text', x, y: rowY, text: line, style: STYLES.rowTitle });
        rowY += STYLES.rowTitle.line;
      }
      for (const text of [row.meta, ...row.lines].filter(Boolean)) {
        for (const line of wrap(ctx, text, STYLES.rowMeta, mainWidth)) {
          ops.push({ kind: 'text', x, y: rowY, text: line, style: STYLES.rowMeta });
          rowY += STYLES.rowMeta.line;
        }
      }
      y = Math.max(rowY, y + ROW_PAD + STYLES.side.line) + ROW_PAD;
    });
    card.height = y - card.y;
  }

  y += 16;
  ops.push({ kind: 'text', x: WIDTH / 2, y, text: footer, style: STYLES.footer, align: 'center' });
  y += STYLES.footer.line + PAD;
  return { ops, height: Math.ceil(y) };
}

function roundRect(ctx, x, y, w, hgt, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + hgt, r);
  ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
  ctx.arcTo(x, y + hgt, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws a report model as a PNG.
 * @param {object} model see report.js
 * @param {string} footer small line at the bottom (app name, date)
 * @returns {Promise<Blob>}
 */
export function reportImage(model, footer) {
  const measure = document.createElement('canvas').getContext('2d');
  const { ops, height } = layout(measure, model, footer);
  const scale = Math.min(MAX_SCALE, MAX_DEVICE_HEIGHT / height, Math.sqrt(MAX_DEVICE_AREA / (WIDTH * height)));

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(WIDTH * scale);
  canvas.height = Math.floor(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = 'top';

  for (const op of ops) {
    if (op.kind === 'card') {
      roundRect(ctx, PAD + 0.5, op.y + 0.5, WIDTH - PAD * 2 - 1, op.height - 1, 12);
      ctx.fillStyle = COLORS.surface;
      ctx.fill();
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (op.kind === 'rule') {
      ctx.fillStyle = COLORS.border;
      ctx.fillRect(PAD + CARD_PAD, op.y, WIDTH - (PAD + CARD_PAD) * 2, 1);
    } else {
      const { style } = op;
      ctx.font = font(style.size, style.weight);
      ctx.fillStyle = op.color ?? style.color;
      ctx.textAlign = op.align ?? 'left';
      // Center the glyphs within the line box.
      ctx.fillText(op.text, op.x, op.y + (style.line - style.size) / 2);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png');
  });
}
