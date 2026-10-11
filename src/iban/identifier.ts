// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import { edge } from './edge.js';
import type { IbanEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import type { IbanOptions } from './generate.js';
import { invalid } from './invalid.js';
import type { IbanInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { IbanReason } from './validate.js';

/** `create` and `validate` of iban; internal. */
export const iban: Identifier<IbanReason, IbanEdgeVariant, IbanInvalidVariant, IbanOptions> = defineIdentifier({
  id: 'iban',
  generate,
  validate,
  edge,
  invalid,
});
