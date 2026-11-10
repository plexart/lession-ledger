// Share dialog: pick a date range, preview the report, then share it as an image or as text.

import { t } from '../i18n.js';
import { h, setChildren, toast } from '../dom.js';
import { toISODate } from '../dates.js';
import { reportText } from '../report.js';
import { reportImage, shareFile, shareText } from '../share.js';

/** Keeps characters that are safe in file names on every platform. */
const safeName = (s) => s.replace(/[\\/:*?"<>|\s]+/g, '-');

/**
 * Opens the share dialog.
 * @param {object} options
 * @param {{key: string, label: string, range: {from: string, to: string}}[]} options.presets
 * @param {string} options.defaultPreset key of the preset selected initially
 * @param {(range: {from: string, to: string}) => object} options.build returns a report model
 * @param {string} options.fileLabel used in the image file name, e.g. the student name
 */
export function openShareDialog({ presets, defaultPreset, build, fileLabel }) {
  let preset = presets.find((p) => p.key === defaultPreset) ?? presets[0];
  let range = { ...preset.range };
  let model = null;
  // The image is rendered as soon as the range changes, so a tap can call share() right away
  // (iOS Safari rejects share() after an async wait). `generation` drops stale renders.
  let generation = 0;
  let image = null; // { generation, promise, blob }

  const footer = () => t('share.footer', { app: t('app.title'), date: toISODate(new Date()) });
  const fromInput = h('input', { type: 'date', onChange: (e) => setRange({ ...range, from: e.target.value }) });
  const toInput = h('input', { type: 'date', onChange: (e) => setRange({ ...range, to: e.target.value }) });
  const presetChips = h('div', { class: 'chips' });
  // Focused on open (rather than the close button) so no focus ring shows up front.
  const preview = h('pre', { class: 'share-preview', tabIndex: -1, autofocus: true });
  const status = h('p', { class: 'muted small' });
  const imageButton = h('button', { type: 'button', class: 'btn primary', onClick: onShareImage }, t('share.image'));
  const textButton = h('button', { type: 'button', class: 'btn', onClick: onShareText }, t('share.text'));

  const dialog = h('dialog', { class: 'sheet' },
    h('div', { class: 'sheet-body' },
      h('div', { class: 'card-head' },
        h('h2', null, t('share.dialogTitle')),
        h('button', {
          type: 'button', class: 'sheet-close', 'aria-label': t('share.close'), onClick: () => dialog.close(),
        }, '✕')),
      h('h3', null, t('share.range')),
      presetChips,
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', null, t('share.from')), fromInput),
        h('label', { class: 'field' }, h('span', null, t('share.to')), toInput)),
      preview,
      status,
      h('div', { class: 'actions' }, textButton, imageButton)));

  // Tapping the backdrop (outside .sheet-body) closes the dialog.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    const toastEl = document.getElementById('toast');
    if (dialog.contains(toastEl)) document.body.append(toastEl);
    dialog.remove();
  });

  function setRange(next, nextPreset = null) {
    range = next;
    preset = nextPreset;
    update();
  }

  function update() {
    fromInput.value = range.from;
    toInput.value = range.to;
    setChildren(presetChips, presets.map((p) => h('button', {
      type: 'button',
      class: `chip${p === preset ? ' info' : ''}`,
      'aria-pressed': String(p === preset),
      onClick: () => setRange({ ...p.range }, p),
    }, p.label)));

    const badRange = range.from && range.to && range.from > range.to;
    model = badRange ? null : build(range);
    preview.textContent = model ? reportText(model) : '';
    preview.hidden = !model;
    status.textContent = badRange ? t('share.badRange') : '';
    const empty = !model?.count;
    imageButton.disabled = empty;
    textButton.disabled = empty;

    generation += 1;
    image = null;
    if (empty) return;
    const current = { generation, blob: null };
    current.promise = reportImage(model, footer()).then((blob) => {
      current.blob = blob;
      return blob;
    });
    current.promise.catch((err) => console.error(err));
    image = current;
  }

  async function onShareImage() {
    if (!image) return;
    const filename = `lesson-ledger-${safeName(fileLabel)}-${range.from || 'start'}_${range.to || 'end'}.png`;
    try {
      // Share synchronously when the render is done; otherwise wait (may fall back to download).
      const blob = image.blob ?? await image.promise;
      await shareFile(blob, filename);
    } catch (err) {
      console.error(err);
      toast(t('share.imageFailed'));
    }
  }

  async function onShareText() {
    if (!model) return;
    toast(t(await shareText(reportText(model)) ? 'share.copied' : 'share.copyFailed'));
  }

  update();
  document.body.append(dialog);
  dialog.showModal();
}
