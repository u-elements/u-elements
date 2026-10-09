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

// Framework typings (JSX, Vue and Svelte templates) are written to a standalone dist/<pkg>.frameworks.d.ts,
// referenced from the bundled typings so consumers get them, and included directly by the
// frameworks/* harness projects, which import the package source and so can not use the bundled typings
const frameworkTypesFile = `${pkgName}.frameworks.d.ts`;

// Clean here instead of with clean: true, as tsup then also removes every *.d.ts in dist
// right before its DTS build, which runs after onSuccess has written the framework typings
fs.rmSync(path.resolve(pkgPath, "dist"), { recursive: true, force: true });

export default defineConfig({
	clean: false,
	entry: [pkgFile],
	format: ["cjs", "esm"],
	target: "es6", // For backwards compatibility
	treeshake: true,
	dts: {
		banner: `/// <reference path="./${frameworkTypesFile}" />`,
	},
	async onSuccess() {
		const manifestFile = path.resolve(pkgPath, `dist/${pkgName}.manifest.json`);
		const manifestData = manifest.create({
			modules: modules.map(tsToSource),
			plugins: [manifestVSCode],
		});

		fs.writeFileSync(manifestFile, JSON.stringify(manifestData, null, " "));
		fs.writeFileSync(
			path.resolve(pkgPath, `dist/${frameworkTypesFile}`),
			getFrameworkTypes(modules),
		);
	},
});

// Element types are looked up in HTMLElementTagNameMap instead of imported, so the file has no
// dependency on the bundled typings and can sit next to the package source as well as dist
function getFrameworkTypes(modules: string[][]) {
	const tagRexes = /['"](u-\S*?)['"]: (U?HTML[a-z]*Element)/gi;
	const eventRexes = /['"]?(\S*?)['"]?: (CustomEvent(<[^>]+>)?)/gi;

	const types = modules.flatMap(([, code]) => {
		const eventMap = `${code.match(/GlobalEventHandlersEventMap[^}]+/s) || ""}`;
		const events = Array.from(eventMap.matchAll(eventRexes));
		const onEvents = (...prefixes: string[]) =>
			prefixes
				.flatMap((prefix) =>
					events.map(
						([, type, event]) =>
							`"${prefix}${type}"?: (event: ${event}) => void`,
					),
				)
				.join("; ");

		return Array.from(code.matchAll(tagRexes), ([, tag, domInterface]) => {
			const isNative = domInterface.startsWith("HTML");
			const tagNative = isNative ? tag.replace(/^u-/, "") : "div"; // Fallback to div for u-elements that does not correlate with a HTMLElement
			const type = tag.replace(/\W/g, "").replace(/./, (m) => m.toUpperCase());
			const element = `'${tag}' extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap['${tag}'] : HTMLElement`;

			return `
type ${type}Element = ${element}
export type Preact${type} = ${
				isNative
					? `PreactTypes.JSX.IntrinsicElements['${tagNative}']`
					: `PreactTypes.JSX.HTMLAttributes<${type}Element> & { ${onEvents("on")} }`
			}
export type React${type} = ${
				isNative
					? `ReactTypes.JSX.IntrinsicElements['${tagNative}']`
					: `ReactTypes.DetailedHTMLProps<ReactTypes.HTMLAttributes<${type}Element>, ${type}Element>`
			} & { class?: string }
export type Qwik${type} = QwikJSX.IntrinsicElements['${tagNative}']
export type Vue${type} = ${isNative ? `VueJSX.IntrinsicElementAttributes['${tagNative}']` : "VueJSX.HTMLAttributes"}
export type Svelte${type} = ${
				isNative
					? `SvelteTypes.SvelteHTMLElements['${tagNative}']`
					: `SvelteTypes.HTMLAttributes<${type}Element> & { ${onEvents("on:", "on")} }`
			}
export type Solid${type} = ${
				isNative
					? `SolidJSX.HTMLElementTags['${tagNative}']`
					: `SolidJSX.HTMLAttributes<${type}Element>`
			}

// Augmenting @vue/runtime-dom instead of vue directly to avoid interfering with React JSX
declare global { namespace React.JSX { interface IntrinsicElements { '${tag}': React${type} } } }
declare module 'preact' { namespace JSX { interface IntrinsicElements { '${tag}': Preact${type} } } }
declare module '@qwik.dev/core/jsx-runtime' { export namespace JSX { export interface IntrinsicElements { '${tag}': Qwik${type} } } }
declare module '@vue/runtime-dom' { export interface GlobalComponents { '${tag}': Vue${type} } }
declare module 'svelte/elements' { interface SvelteHTMLElements { '${tag}': Svelte${type} } }
declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements { '${tag}': Solid${type} }
    interface CustomEvents { ${events.map(([, type, event]) => `"${type}": ${event}`).join("; ")} }
  }
}
`;
		});
	});

	return `// Generated by tsup.config.ts, do not edit
import type * as PreactTypes from 'preact'
import type * as ReactTypes from 'react'
import type * as SvelteTypes from 'svelte/elements'
import type * as VueJSX from '@vue/runtime-dom'
import type { JSX as QwikJSX } from '@qwik.dev/core/jsx-runtime'
import type { JSX as SolidJSX } from 'solid-js'
${types.join("")}`;
}
