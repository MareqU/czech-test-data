// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import { edge } from './edge.js';
import type { DicEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import type { DicOptions } from './generate.js';
import { invalid } from './invalid.js';
import type { DicInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { DicReason } from './validate.js';

/** `create` and `validate` of dic; internal. */
export const dic: Identifier<DicReason, DicEdgeVariant, DicInvalidVariant, DicOptions> = defineIdentifier({
  id: 'dic',
  generate,
  validate,
  edge,
  invalid,
});
