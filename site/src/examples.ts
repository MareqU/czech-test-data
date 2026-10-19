// The hero examples: real values that break typical forms, each one opens the generator on that variant.
import { createCz } from 'czech-test-data';
import { h } from './dom.js';
import type { State } from './state.js';

/** A fixed seed, so the hero shows the same values on every visit. */
const EXAMPLE_SEED = 2026;

interface Example {
  readonly title: string;
  readonly text: string;
  readonly valid: boolean;
  readonly patch: Pick<State, 'id' | 'mode' | 'variant'>;
  readonly value: () => string;
}

const cz = createCz({ seed: EXAMPLE_SEED, referenceDate: '2026-01-01' });

const EXAMPLES: readonly Example[] = [
  {
    title: 'IČO s nulou na začátku',
    text: 'Platné. Kdo ukládá IČO jako číslo, nulu ztratí.',
    valid: true,
    patch: { id: 'ico', mode: 'edge', variant: 'leadingZeros' },
    value: () => cz.ico.edge('leadingZeros'),
  },
  {
    title: 'Rodné číslo s měsícem +20',
    text: 'Platné od roku 2004, přesto ho řada formulářů odmítne.',
    valid: true,
    patch: { id: 'birthNumber', mode: 'edge', variant: 'month+20' },
    value: () => cz.birthNumber.edge('month+20'),
  },
  {
    title: 'Mobil z řady 71x',
    text: 'Mobilní teprve od roku 2022, starší knihovny ho neznají.',
    valid: true,
    patch: { id: 'phone', mode: 'edge', variant: 'newMobileRange' },
    value: () => cz.phone.edge('newMobileRange'),
  },
  {
    title: 'Účet ze samých nul',
    text: 'Neplatný, ale projde naivní kontrolou mod 11.',
    valid: false,
    patch: { id: 'bankAccount', mode: 'invalid', variant: 'zeroNumber' },
    value: () => cz.bankAccount.invalid('zeroNumber'),
  },
];

/** Renders the example cards; `open` switches the generator to the example's variant. */
export function renderExamples(list: HTMLElement, open: (patch: Example['patch']) => void): void {
  list.replaceChildren(
    ...EXAMPLES.map((example) => {
      const button = h(
        'button',
        { type: 'button', class: `example ${example.valid ? 'is-valid' : 'is-invalid'}` },
        h('span', { class: 'example-value' }, example.value()),
        h('span', { class: 'example-title' }, example.title),
        h('span', { class: 'example-text' }, example.text),
        h('span', { class: 'example-cta' }, 'Vygenerovat další →'),
      );
      button.addEventListener('click', () => {
        open(example.patch);
      });
      return h('li', {}, button);
    }),
  );
}
