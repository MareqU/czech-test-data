// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import { edge } from './edge.js';
import type { EanEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import type { EanOptions } from './generate.js';
import { invalid } from './invalid.js';
import type { EanInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { EanReason } from './validate.js';

/** `create` and `validate` of ean; internal. */
export const ean: Identifier<EanReason, EanEdgeVariant, EanInvalidVariant, EanOptions> = defineIdentifier({
  id: 'ean',
  generate,
  validate,
  edge,
  invalid,
});
