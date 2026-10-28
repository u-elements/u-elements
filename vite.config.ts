import type { UserConfig } from "vite";
import { server } from "./frameworks/vite.shared.ts";
// import csp from "vite-plugin-csp-guard";

export default {
	root: import.meta.dirname,
	server,
	// plugins: [
	// 	csp({
	// 		algorithm: "sha256",
	// 		dev: {
	// 			run: true,
	// 		},
	// 	}),
	// ],
} satisfies UserConfig;
