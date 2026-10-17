import { qwikVite } from "@qwik.dev/core/optimizer";

export default {
	root: import.meta.dirname,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/qwik`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [
		qwikVite({
			csr: true,
			srcDir: "./",
		}),
	],
};
