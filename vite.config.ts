import type { UserConfig } from "vite";
// import csp from "vite-plugin-csp-guard";

export default {
	root: __dirname,
	// plugins: [
	// 	csp({
	// 		algorithm: "sha256",
	// 		dev: {
	// 			run: true,
	// 		},
	// 	}),
	// ],
} satisfies UserConfig;
