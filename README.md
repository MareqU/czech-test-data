# czech-test-data
Czech test data for automated tests: rodné číslo, IČO, DIČ, bank accounts, IBAN, phone, PSČ, EAN and EIC, including edge cases and invalid values. TypeScript, zero dependencies, seeded. License plates (SPZ) and VIN are planned for v1.1.

> **Status:** under development, not published on npm yet.

> **Warning:** a randomly generated valid birth number (rodné číslo) or phone number may belong to a real person. No fictional phone range exists in Czechia, so never call or text generated numbers. Use the generated data only in test systems.

> **Note:** the validators follow the official rules. A few real, legally assigned birth numbers break those rules (for example a number that is not divisible by 11), so they fail validation even though they exist.
