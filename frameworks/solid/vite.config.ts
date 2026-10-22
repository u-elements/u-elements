import solid from "vite-plugin-solid";

export default {
	root: import.meta.dirname,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/solid`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [solid()],
};
