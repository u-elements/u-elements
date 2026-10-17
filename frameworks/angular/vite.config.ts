// Angular without the CLI: JIT compiled in the browser, decorators handled by esbuild
export default {
	root: import.meta.dirname,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/angular`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	esbuild: {
		tsconfigRaw: {
			compilerOptions: {
				experimentalDecorators: true,
				useDefineForClassFields: false,
			},
		},
	},
	optimizeDeps: {
		include: [
			"@angular/compiler",
			"@angular/core",
			"@angular/common",
			"@angular/forms",
			"@angular/platform-browser",
			"rxjs",
		],
	},
};
