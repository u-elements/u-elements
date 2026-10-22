import preact from "@preact/preset-vite";

export default {
	root: import.meta.dirname,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/preact`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [preact()],
};
