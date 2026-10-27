import { svelte } from "@sveltejs/vite-plugin-svelte";
import { server } from "../vite.shared";

export default {
	root: import.meta.dirname,
	server,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/svelte`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [svelte()],
};
