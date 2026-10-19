// The sample at the top: a short filled-in form with real values that break typical forms. Each row opens the
// generator on that variant.
import { createCz } from 'czech-test-data';
import { h } from './dom.js';
import { boxes, stamp } from './results.js';
import type { State } from './state.js';

/** A fixed seed, so the sample shows the same values on every visit. */
const EXAMPLE_SEED = 2026;

interface Example {
  readonly field: string;
  readonly text: string;
  readonly valid: boolean;
  readonly patch: Pick<State, 'id' | 'mode' | 'variant'>;
  readonly value: () => string;
}

const cz = createCz({ seed: EXAMPLE_SEED, referenceDate: '2026-01-01' });

const EXAMPLES: readonly Example[] = [
  {
    field: 'IČO',
    text: 'Začíná nulou. Kdo ukládá IČO jako číslo, nulu ztratí.',
    valid: true,
    patch: { id: 'ico', mode: 'edge', variant: 'leadingZeros' },
    value: () => cz.ico.edge('leadingZeros'),
  },
  {
    field: 'Rodné číslo',
    text: 'Měsíc zvýšený o 20 je platný od roku 2004, přesto ho řada formulářů odmítne.',
    valid: true,
    patch: { id: 'birthNumber', mode: 'edge', variant: 'month+20' },
    value: () => cz.birthNumber.edge('month+20'),
  },
  {
    field: 'Telefon',
    text: 'Řada 71x je mobilní teprve od roku 2022, starší knihovny ji neznají.',
    valid: true,
    patch: { id: 'phone', mode: 'edge', variant: 'newMobileRange' },
    value: () => cz.phone.edge('newMobileRange'),
  },
  {
    field: 'Číslo účtu',
    text: 'Samé nuly projdou naivní kontrolou mod 11, přitom takový účet neexistuje.',
    valid: false,
    patch: { id: 'bankAccount', mode: 'invalid', variant: 'zeroNumber' },
    value: () => cz.bankAccount.invalid('zeroNumber'),
  },
];

/** Renders the sample rows; `open` switches the generator to the example's variant. */
export function renderExamples(list: HTMLElement, open: (patch: Example['patch']) => void): void {
  list.replaceChildren(
    ...EXAMPLES.map((example) => {
      const row = h(
        'button',
        { type: 'button', class: 'sample-row' },
        h('span', { class: 'sample-label' }, example.field),
        h('span', { class: 'filled' }, boxes(example.value(), false), stamp(example.valid)),
        h('span', { class: 'sample-text' }, example.text, ' ', h('span', { class: 'sample-cta' }, 'Vygenerovat další takové →')),
      );
      row.addEventListener('click', () => {
        open(example.patch);
      });
      return h('li', {}, row);
    }),
  );
}
