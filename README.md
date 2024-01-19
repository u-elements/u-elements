# u-tags

Standard HTML tags - just truly accessible

## Local development

### Install dependencies

To install dependencies according to `package-lock.json` run the following command:

```SH
npm ci
```

### Linting

Eslint can be run using the npm `lint`-script:

```SH
npm run lint
```

### Building

To generate production bundles, run the npm `build`-script

```SH
npm run build
```

This creates a `dist`-folder in the project root containing all built artefacts

### watch-mode

Run the npm `start`-script to launch a local development-server using Vite:

```sh
npm run start
```