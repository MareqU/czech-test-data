import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    // Library. ESM is the primary format; CJS is only a fallback for require().
    // Each identifier gets its own entry from M2 on, so consumers can tree-shake per module.
    entry: ['src/index.ts', 'src/birthNumber/index.ts', 'src/phone/index.ts'],
    format: ['esm', 'cjs'],
    platform: 'neutral',
    tsconfig: 'tsconfig.build.json',
    target: 'node22',
    dts: true,
    clean: true,
    // Keeps package.json "exports" in sync with the entries above.
    exports: true,
    publint: { level: 'error' },
    attw: { profile: 'node16', level: 'error' },
    failOnWarn: true,
  },
  {
    // CLI ("bin"): separate entry, ESM only, never imported by the library.
    entry: ['src/cli.ts'],
    format: ['esm'],
    platform: 'node',
    tsconfig: 'tsconfig.json',
    target: 'node22',
    dts: false,
    clean: false,
    failOnWarn: true,
  },
]);
