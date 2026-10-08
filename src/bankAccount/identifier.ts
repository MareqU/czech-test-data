// Internal (not a package entry): shared by the subpath entry and `createCz`, so both use one definition.
import { defineIdentifier } from '../core/identifier.js';
import type { Identifier } from '../core/identifier.js';
import { edge } from './edge.js';
import type { BankAccountEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import type { BankAccountOptions } from './generate.js';
import { invalid } from './invalid.js';
import type { BankAccountInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { BankAccountReason } from './validate.js';

/** `create` and `validate` of bankAccount; internal. */
export const bankAccount: Identifier<BankAccountReason, BankAccountEdgeVariant, BankAccountInvalidVariant, BankAccountOptions> =
  defineIdentifier({
    id: 'bankAccount',
    generate,
    validate,
    edge,
    invalid,
  });
