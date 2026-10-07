// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import type { NoOptions } from '../core/types.js';
import { edge } from './edge.js';
import type { IcoEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import { invalid } from './invalid.js';
import type { IcoInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { IcoReason } from './validate.js';

/** `create` and `validate` of ico; internal. */
export const ico: Identifier<IcoReason, IcoEdgeVariant, IcoInvalidVariant, NoOptions> = defineIdentifier({
  id: 'ico',
  generate,
  validate,
  edge,
  invalid,
});
