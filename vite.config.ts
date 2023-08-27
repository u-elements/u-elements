/// <reference types="vitest" />
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'
// import customElementsManifest from 'vite-plugin-cem';

export default defineConfig({
  plugins: [
    dts({ rollupTypes: true })
    // customElementsManifest({
    //   files: ['./src/**/index.ts']
    // })
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve('src/index.ts'),
      fileName: '[name]',
      formats: ['es']
    }
  },
  test: {
    environment: 'jsdom',
    // Store snapshots in .snapshots-folder
    resolveSnapshotPath: (testPath, ext) => `.snapshots${testPath}${ext}`
  }
})
