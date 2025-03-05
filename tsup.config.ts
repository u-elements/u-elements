import fs from "node:fs";
import path from "node:path";
// Use tsup (not Vite) for building, as it has better dts support out of the box
// @ts-expect-error (Since @custom-elements-manifest/analyzer does not provide Typescript types)
import * as manifest from "@custom-elements-manifest/analyzer/src/browser-entrypoint.js";
import { customElementVsCodePlugin } from "custom-element-vs-code-integration";
import { defineConfig } from "tsup";

// Config runs from all workspaces, so process.cwd is current package path
const pkgPath = process.cwd();
const pkgName = path.basename(pkgPath);
const pkgFile = path.resolve(pkgPath, `${pkgName}.ts`);
const modules = fs
	.readdirSync(pkgPath)
	.filter((file) => file.match(/u-[^.]+\.ts/)) // Skip .spec.ts
	.map((file) => [file, fs.readFileSync(file).toString()]);

const tsToSource = ([file, code]: string[]) =>
	manifest.ts.createSourceFile(
		file,
		code,
		manifest.ts.ScriptTarget.Latest,
		true,
	);

const manifestVSCode = customElementVsCodePlugin({
	cssFileName: null,
	htmlFileName: `${pkgName}.vscode.json`,
	outdir: path.resolve(pkgPath, "dist"),
});

export default defineConfig({
	clean: true,
	entry: [pkgFile],
	format: ["cjs", "esm"],
	target: "es6", // For backwards compatibility
	treeshake: true,
	dts: {
		footer: modules.map(getFrameworkTypes).join(""),
	},
	async onSuccess() {
		const manifestFile = path.resolve(pkgPath, `dist/${pkgName}.manifest.json`);
		const manifestData = manifest.create({
			modules: modules.map(tsToSource),
			plugins: [manifestVSCode],
		});

		fs.writeFileSync(manifestFile, JSON.stringify(manifestData, null, " "));
	},
});

function getFrameworkTypes([_file, code]: string[]) {
	const tagRexes = /['"](u-\S*?)['"]: (U?HTML[a-z]*Element)/gi;
	const tagDefinitions = Array.from(code.matchAll(tagRexes));

	const eventMap = `${code.match(/GlobalEventHandlersEventMap[^}]+/s) || ""}`;
	const eventRexes = /(\S+): (CustomEvent(<[^>]+>)?)/gi;
	const events = Array.from(eventMap.matchAll(eventRexes));

	return `
import type * as PreactTypes from 'preact'
import type * as ReactTypes from 'react'
import type * as SvelteTypes from 'svelte/elements'
import type * as VueJSX from '@vue/runtime-dom'
import type { JSX as QwikJSX } from '@builder.io/qwik/jsx-runtime'
import type { JSX as SolidJSX } from 'solid-js'

${tagDefinitions
	.map(([, tag, domInterface]) => {
		const isNative = domInterface.startsWith("HTML");
		const tagNative = isNative ? tag.replace(/^u-/, "") : "div"; // Fallback to div for u-elements that does not correlate with a HTMLElement
		const type = tag.replace(/\W/g, "").replace(/./, (m) => m.toUpperCase());

		return `
export type Preact${type} = ${
			isNative
				? `PreactTypes.JSX.IntrinsicElements['${tagNative}']`
				: `PreactTypes.JSX.HTMLAttributes<UHTMLTagsElement> & { ${events
						.map(([, type, event]) => `on${type}?: (event: ${event}) => void`)
						.join("; ")} }`
		}
export type React${type} = ${
			isNative
				? `ReactTypes.JSX.IntrinsicElements['${tagNative}']`
				: `ReactTypes.DetailedHTMLProps<ReactTypes.HTMLAttributes<${domInterface}>, ${domInterface}>`
		} & { class?: string }
export type Qwik${type} = QwikJSX.IntrinsicElements['${tagNative}']
export type Vue${type} = ${isNative ? `VueJSX.IntrinsicElementAttributes['${tagNative}']` : "VueJSX.HTMLAttributes"}
export type Svelte${type} = ${
			isNative
				? `SvelteTypes.SvelteHTMLElements['${tagNative}']`
				: `SvelteTypes.HTMLAttributes<${domInterface}> & { ${events
						.map(([, type, event]) => `'on:${type}'?: (event: ${event}) => void, on${type}?: (event: ${event}) => void`)
						.join("; ")} }`
		}
export type Solid${type} = ${
			isNative
				? `SolidJSX.HTMLElementTags['${tagNative}']`
				: `SolidJSX.HTMLAttributes<${domInterface}>`
		}

// Augmenting @vue/runtime-dom instead of vue directly to avoid interfering with React JSX
declare global { namespace React.JSX { interface IntrinsicElements { '${tag}': React${type} } } }
declare global { namespace preact.JSX { interface IntrinsicElements { '${tag}': Preact${type} } } }
declare module '@builder.io/qwik/jsx-runtime' { export namespace JSX { export interface IntrinsicElements { '${tag}': Qwik${type} } } }
declare module '@vue/runtime-dom' { export interface GlobalComponents { '${tag}': Vue${type} } }
declare module 'svelte/elements' { interface SvelteHTMLElements { '${tag}': Svelte${type} } }
declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements { '${tag}': Solid${type} }
    interface CustomEvents { ${events.map(([, type, event]) => `${type}: (event: ${event}) => void`).join("; ")} }
  }
}`;
	})
	.join("")}`;
}
