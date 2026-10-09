import { svelte } from "@sveltejs/vite-plugin-svelte";

export default {
	root: import.meta.dirname,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/svelte`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [svelte()],
};
