// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import type { NoOptions } from '../core/types.js';
import { edge } from './edge.js';
import type { EicEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import { invalid } from './invalid.js';
import type { EicInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { EicReason } from './validate.js';

/** `create` and `validate` of eic; internal. */
export const eic: Identifier<EicReason, EicEdgeVariant, EicInvalidVariant, NoOptions> = defineIdentifier({
  id: 'eic',
  generate: (random) => generate(random),
  validate,
  edge,
  invalid,
});
