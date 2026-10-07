// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import { edge } from './edge.js';
import type { PhoneEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import type { PhoneOptions } from './generate.js';
import { invalid } from './invalid.js';
import type { PhoneInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { PhoneReason } from './validate.js';

/** `create` and `validate` of phone; internal. */
export const phone: Identifier<PhoneReason, PhoneEdgeVariant, PhoneInvalidVariant, PhoneOptions> = defineIdentifier({
  id: 'phone',
  generate,
  validate,
  edge,
  invalid,
});
