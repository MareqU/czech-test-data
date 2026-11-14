// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import type { NoOptions } from '../core/types.js';
import { edge } from './edge.js';
import type { VinEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import { invalid } from './invalid.js';
import type { VinInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { VinReason } from './validate.js';

/** `create` and `validate` of vin; internal. */
export const vin: Identifier<VinReason, VinEdgeVariant, VinInvalidVariant, NoOptions> = defineIdentifier({
  id: 'vin',
  generate: (random) => generate(random),
  validate,
  edge,
  invalid,
});
