// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import type { NoOptions } from '../core/types.js';
import { edge } from './edge.js';
import type { PostalCodeEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import { invalid } from './invalid.js';
import type { PostalCodeInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { PostalCodeReason } from './validate.js';

/** `create` and `validate` of postalCode; internal. */
export const postalCode: Identifier<PostalCodeReason, PostalCodeEdgeVariant, PostalCodeInvalidVariant, NoOptions> = defineIdentifier({
  id: 'postalCode',
  generate,
  validate,
  edge,
  invalid,
});
