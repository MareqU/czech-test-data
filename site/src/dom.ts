// Small DOM helpers; the page has no framework.

type Attributes = Readonly<Record<string, string | boolean | undefined>>;

/** Creates an element; `true` sets an empty attribute, `false` and `undefined` leave it out. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: readonly (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) {
      element.setAttribute(name, '');
    } else if (typeof value === 'string') {
      element.setAttribute(name, value);
    }
  }
  element.append(...children);
  return element;
}

/** The element with this id; the page markup guarantees it exists. */
export function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`#${id} is missing`);
  }
  return element;
}

/** The element with this id, checked to be of `type`. */
export function byTypedId<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = byId(id);
  if (!(element instanceof type)) {
    throw new TypeError(`#${id} is not a ${type.name}`);
  }
  return element;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** A short message at the bottom of the screen. */
export function toast(message: string): void {
  const element = byId('toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.classList.remove('visible');
  }, 1600);
}

/** Copies text and confirms it; clipboard errors (e.g. no permission) are reported, not thrown. */
export async function copyText(text: string, what = 'Zkopírováno'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(what);
  } catch {
    toast('Kopírování se nepovedlo – označte text ručně.');
  }
}
