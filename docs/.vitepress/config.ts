import { defineConfig } from "vitepress";

const base = "/u-elements/";

export default defineConfig({
	appearance: false,
	title: "u-elements",
	base,
	cleanUrls: true,
	description: "Standard HTML tags - just truly accessible",
	vue: {
		template: {
			compilerOptions: {
				whitespace: "preserve", // Making Sandbox html render nicer
				isCustomElement: (tag) => tag.includes("-"),
			},
		},
	},
	head: [
		["link", { rel: "icon", href: `${base}logo.svg` }],
		[
			"script",
			{ async: "", defer: "", src: "https://scripts.withcabin.com/hello.js" },
		], // Analytics
	],
	markdown: {
		theme: {
			light: "github-light-high-contrast",
			dark: "github-dark-high-contrast",
		},
	},
	themeConfig: {
		logo: "/logo.svg",
		editLink: {
			pattern: "https://github.com/u-elements/u-elements/edit/main/docs/:path",
			text: "Suggest changes to this page",
		},
		search: {
			provider: "local",
		},
		nav: [
			{ text: "Guide", link: "/guide/" },
			{ text: "Elements", link: "/elements/" },
		],
		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Why u-elements", link: "/guide/why" },
					{ text: "Getting started", link: "/guide/" },
					{ text: "Browser support", link: "/guide/support" },
				],
			},
			{
				text: "Elements",
				items: [
					{
						text: "&lt;u-datalist&gt;",
						link: "/elements/u-datalist",
					},
					{
						text: "&lt;u-progress&gt;",
						link: "/elements/u-progress",
					},
					{
						text: "&lt;u-tabs&gt;",
						link: "/elements/u-tabs",
					},
					{
						text: "&lt;u-combobox&gt;",
						link: "/elements/u-combobox",
					},
					{
						text: '&lt;u-details&gt; <mark data-badge="POLYFILL"></mark>',
						link: "/elements/u-details",
					},
					{
						text: '<del>&lt;u-dialog&gt;</del> <mark data-badge="SUPPORTED"></mark>',
						link: "/elements/u-dialog",
					},
					{
						text: '<del>&lt;u-select&gt;</del> <mark data-badge="SUPPORTED"></mark>',
						link: "/elements/u-select",
					},
					{
						text: '<del>&lt;u-tags&gt;</del> <mark data-badge="DEPRECATED"></mark>',
						link: "/elements/u-tags",
					},
				],
			},
		],
		socialLinks: [
			{ icon: "github", link: "https://github.com/u-elements/u-elements" },
		],
		footer: {
			message: "Released under the MIT License",
		},
	},
});
