// Use tsup (not Vite) for building, as it has better dts support out of the box
// @ts-expect-error (Since @custom-elements-manifest/analyzer does not provide Typescript types)
import * as manifest from '@custom-elements-manifest/analyzer/src/browser-entrypoint.js'
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration'
import { defineConfig } from 'tsup'
import path from 'node:path'
import fs from 'node:fs'

// Config runs from all workspaces, so process.cwd is current package path
const pkgPath = process.cwd()
const pkgName = path.basename(pkgPath)
const pkgFile = path.resolve(pkgPath, `${pkgName}.ts`)
const modules = fs
  .readdirSync(pkgPath)
  .filter((file) => file.match(/u-[^.]+\.ts/)) // Skip .spec.ts
  .map((file) => path.resolve(pkgPath, file))
  .map((file) => [file, fs.readFileSync(file).toString()])

const tsToSource = ([file, code]: string[]) =>
  manifest.ts.createSourceFile(
    file,
    code,
    manifest.ts.ScriptTarget.Latest,
    true
  )

const manifestVSCode = customElementVsCodePlugin({
  cssFileName: null,
  htmlFileName: `${pkgName}.vscode.json`,
  outdir: path.resolve(pkgPath, 'dist')
})

export default defineConfig({
  clean: true,
  entry: [pkgFile],
  format: ['cjs', 'esm'],
  treeshake: true,
  dts: {
    footer: getFrameworkTypes(modules.flat().join(''))
  },
  async onSuccess() {
    const manifestFile = path.resolve(pkgPath, `dist/${pkgName}.manifest.json`)
    const manifestData = manifest.create({
      modules: modules.map(tsToSource),
      plugins: [manifestVSCode]
    })

    fs.writeFileSync(manifestFile, JSON.stringify(manifestData, null, ' '))
  }
})

function getFrameworkTypes(code: string) {
  const tagRexes = /['"]u-([^'"]+)['"]: (U?)HTML[a-z]*Element/gi
  const tagDefinitions = Array.from(code.matchAll(tagRexes))

  return `import type * as VueJSX from '@vue/runtime-dom'
import type { JSX as QwikJSX } from '@builder.io/qwik/jsx-runtime'
import type { JSX as ReactJSX } from 'react'
import type { JSX as SolidJSX } from 'solid-js'
import type { SvelteHTMLElements } from 'svelte/elements'

${tagDefinitions
  .map(([, tag, isNonStandard]) => {
    const tagNative = isNonStandard ? 'div' : tag // Fallback to div for u-elements that does not correlate with a HTMLElement
    const type = `${tag[0].toUpperCase()}${tag.slice(1)}`

    return `export type Vue${type} = VueJSX.IntrinsicElementAttributes['${tagNative}']
export type Qwik${type} = QwikJSX.IntrinsicElements['${tagNative}']
export type React${type} = ReactJSX.IntrinsicElements['${tagNative}']
export type SolidJS${type} = SolidJSX.HTMLElementTags['${tagNative}']
export type Svelte${type} = SvelteHTMLElements['${tagNative}']

// Augmenting @vue/runtime-dom instead of vue directly to avoid interfering with React JSX
declare module '@vue/runtime-dom' { export interface GlobalComponents { 'u-${tag}': Vue${type} } }
declare module '@builder.io/qwik/jsx-runtime' { export namespace JSX { export interface IntrinsicElements { 'u-${tag}': Qwik${type} } } }
declare global { namespace React.JSX { interface IntrinsicElements { 'u-${tag}': React${type} } } }
declare module 'solid-js' { namespace JSX { interface IntrinsicElements { 'u-${tag}': SolidJS${type} } } }
declare module 'svelte/elements' { interface SvelteHTMLElements { 'u-${tag}': Svelte${type} } }
`
  })
  .join('')}`
}
