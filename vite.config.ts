/// <reference types="vitest" />
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'
import customElementsManifest from 'vite-plugin-cem'
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration'

export default defineConfig({
  plugins: [
    dts({ rollupTypes: true }),
    customElementsManifest({
      files: ['./src/**/*.ts'],
      plugins: [
        // eslint-disable-next-line
        // @ts-ignore
        customElementVsCodePlugin({
          htmlFileName: 'vscode.json',
          cssFileName: null,
          outdir: 'dist'
        })
      ]
    })
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve('src/index.ts'),
      fileName: '[name]',
      formats: ['es', 'cjs']
    }
  },
  test: {
    environment: 'jsdom',
    // Store snapshots in .snapshots-folder
    resolveSnapshotPath: (testPath, ext) => `.snapshots${testPath}${ext}`
  }
})
