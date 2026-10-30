import { frameworkConfig } from "../vite.shared.ts";

// Angular without the CLI: JIT compiled in the browser, decorators handled by esbuild
export default frameworkConfig(import.meta.dirname, {
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
});
