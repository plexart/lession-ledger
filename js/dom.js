// Small DOM helpers. All user-provided text goes through textContent, never innerHTML.

/**
 * Creates an element. Props: `class`, `dataset`, `on<Event>` handlers, DOM properties
 * (value, checked, type, ...) or plain attributes. Children may be nodes, strings or arrays.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in el) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  appendChildren(el, children);
  return el;
}

/** Appends children, skipping null/false and flattening arrays. */
function appendChildren(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
}

/** Like el.replaceChildren(), but skips null/false (which the DOM would render as text). */
export function setChildren(el, ...children) {
  el.replaceChildren();
  appendChildren(el, children);
}

let toastTimer = 0;

export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}
