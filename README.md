# u-elements

HTML tags, just truly accessible.

[Open documentation →](https://u-elements.github.io/u-elements/)

## Local development

### Install dependencies

```SH
npm install
```

### Linting

Eslint can be run using the npm `lint`-script:

```SH
npm run lint
```

### Building

To generate production bundles, run the npm `build`-script

```sh
npm run build
```

This creates a `dist`-folder in the project root containing all built artefacts

### Development

Run the npm `start`-script to launch a local development-server using Vite:

```sh
npm start
```

### Testing

Tests run with Playwright, which starts the Vite dev servers it needs:

```sh
npm run test             # Every project: browsers, mobile viewports and framework harness pages
npm run test:frameworks  # Only the framework projects (React, Vue, Svelte, Angular, Solid, Qwik, Preact)
npm run test:vanilla     # Only the browser projects: raw DOM specs and the vanilla harness pages, no frameworks
npm run test:update      # Update the snapshots
```

A single project or component runs with `npx playwright test --project=React` or `npx playwright test u-tabs`.

Each `packages/<tag>/<tag>.spec.ts` holds the raw DOM tests, run in every browser project against `test.html`.
Components rendered from framework state are tested through a shared harness:

- `packages/<tag>/<tag>.harness.ts` defines the config a page renders, with its defaults
- `packages/<tag>/<tag>.suite.ts` is the shared Playwright suite driving `window.harness`, see `packages/harness.ts` and `packages/suite.ts`
- `packages/<tag>/<tag>.frameworks.spec.ts` runs the suite once per framework project, while the vanilla page runs from `<tag>.spec.ts` in every browser project
- `frameworks/<name>/test.<tag>.*` renders the config with the framework's own idioms, loaded by `frameworks/<name>/test.html?component=<tag>` through the adapter in `frameworks/<name>/harness.*`

To add a framework page for a component, create `frameworks/<name>/test.<tag>.*` next to the existing ones, render the config from `<tag>.harness.ts`, and mount it through the framework's `mountHarness` or `harnessState`.
The `framework` option on `test` (see `packages/test.ts`) names the running framework, so a suite can document behaviour that differs between frameworks.