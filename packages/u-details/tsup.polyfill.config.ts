import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["./polyfill.ts"],
	format: ["cjs", "esm"],
	target: "es6", // For backwards compatibility
	treeshake: true,
	dts: true,
});
