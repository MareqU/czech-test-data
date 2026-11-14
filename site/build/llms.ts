// /llms.txt (https://llmstxt.org): how an AI agent gets Czech test data from this project instead of inventing
// numbers that fail their checksums. Generated from src/catalog.ts like the pages, so every variant is listed.
import { IDENTIFIERS } from '../src/catalog.js';
import type { IdentifierInfo } from '../src/catalog.js';
import { SITE } from './pages.js';
import { dataPath, PRERENDER_SEED } from './prerender.js';

const REPOSITORY = 'https://github.com/MareqU/czech-test-data';

/** Commands an agent can run as they are; tests/site.test.ts runs each of them against the built CLI. */
export const LLMS_COMMANDS = [
  'npx czech-test-data ico',
  'npx czech-test-data ico --invalid all --format json',
  'npx czech-test-data birth-number --edge month+20 --seed 42',
  'npx czech-test-data bank-account --count 5 --format csv',
  'npx czech-test-data validate ico 06541186',
  'npx czech-test-data ico --help',
] as const;

function variants(info: IdentifierInfo, kind: 'edge' | 'invalid'): string {
  const texts = kind === 'edge' ? info.edge : info.invalid;
  return Object.keys(texts)
    .map((name) => {
      const disputed = info.disputed.includes(name) ? ', disputed' : '';
      return `\`${name}\` (${info.titles[name] ?? name}${disputed})`;
    })
    .join(', ');
}

function identifier(info: IdentifierInfo): string {
  return `### ${info.label}: \`${info.id}\` (CLI \`${info.cli}\`)

- Edge variants, valid: ${variants(info, 'edge')}
- Invalid variants: ${variants(info, 'invalid')}`;
}

/** The text of /llms.txt. */
export function renderLlms(): string {
  return `# czech-test-data

> Valid, edge-case and invalid Czech test data: rodné číslo (birth number), IČO, DIČ, bank account, IBAN, phone
> number, PSČ (postal code), electricity EAN, gas EIC and VIN, with validators that say why a value is invalid.
> An npm library and a CLI, zero dependencies, seeded: the same seed gives the same values.

Do not make up Czech identifiers for tests, fixtures or seed data: most of them carry a checksum, so invented
numbers are usually invalid. Generate them with the CLI or the library, and check values with \`validate\`.
A valid birth number or phone number may belong to a real person: use generated data only in test systems.

## CLI (Node.js 22.12+, no install needed)

${LLMS_COMMANDS.map((command) => `- \`${command}\``).join('\n')}

Options: \`--count N\`, \`--seed N\`, \`--format text|json|csv\`, \`--edge VARIANT|all|random\`,
\`--invalid VARIANT|all|random\`, \`--reference-date YYYY-MM-DD\`. JSON output is an array of
\`{ "value", "kind", "variant" }\`. \`validate\` reads values from arguments or stdin; exit code 0 when all are
valid, 1 when any is invalid.

## Library

\`\`\`ts
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });
cz.ico(); // a valid IČO
cz.ico.edge('leadingZeros'); // a valid edge case
cz.ico.invalid('badChecksum'); // an invalid value
cz.validate.ico('06541186'); // { valid: true } or { valid: false, reason: 'badChecksum' }
\`\`\`

## Identifiers and variants

Disputed variants are valid by some readings of the rules only.

${IDENTIFIERS.map(identifier).join('\n\n')}

## Static data (no JavaScript needed)

Every identifier's form-check kit as JSON: plain valid values, every edge and every undisputed invalid variant
once. An array of \`{ "id", "value", "valid", "kind", "variant", "description" }\`; \`valid\` is whether a form
should accept the value, \`description\` is Czech. Fixed values (seed ${String(PRERENDER_SEED)}), regenerated on every deploy with
that day as "today"; for fresh or reproducible values use the CLI.

${IDENTIFIERS.map((info) => `- [${info.label}](${SITE}${dataPath(info)})`).join('\n')}

The pages of the web tool also carry these values in their HTML.

## Links

- [Web tool](${SITE}) (Czech): every identifier with valid, edge and invalid values to copy, and a form-check kit
- [README](${REPOSITORY}#readme): full API, options of every generator, examples for Playwright, Cypress and Vitest
- [Agent skill](${REPOSITORY}/blob/main/skills/czech-test-data/SKILL.md): instructions to copy into your project
- [npm](https://www.npmjs.com/package/czech-test-data)
- [Rules with official sources](${REPOSITORY}/tree/main/docs/rules)
`;
}
