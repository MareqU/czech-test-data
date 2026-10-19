# Web tool (site/)

A static page for manual testers: valid, edge and invalid values of every identifier, a validator with the Czech
meaning of each reason, links that reproduce the same values, and the equivalent code and CLI command.
Czech only. Everything runs in the browser; nothing is sent anywhere.

- Uses the package only through its public exports (`czech-test-data: file:..`), like a user from npm.
  Build the library first: `npm run build` in the repository root.
- Texts for identifiers, options, variants and reasons are in `src/catalog.ts`. The build fails when the library
  gets a variant or reason without a text there.
- No framework: Vite + TypeScript, plain DOM.

```bash
npm run build            # in the repository root: dist/ for the site
cd site && npm ci
npm run dev              # local server
npm run check            # types, lint (repo ESLint config), tests, production build into site/dist/
```

`tests/site.test.ts` runs the code snippet with Node and the CLI snippet against `../dist/cli.mjs` and checks that
both print exactly the values the page shows.
