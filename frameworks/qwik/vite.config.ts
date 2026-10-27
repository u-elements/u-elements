import { qwikVite } from "@qwik.dev/core/optimizer";
import { server } from "../vite.shared";

export default {
	root: import.meta.dirname,
	server,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/qwik`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [
		qwikVite({
			csr: true,
			srcDir: "./",
		}),
	],
};
