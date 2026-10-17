import vue from "@vitejs/plugin-vue";

export default {
	root: import.meta.dirname,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/vue`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [
		vue({
			template: {
				compilerOptions: {
					isCustomElement: (tag) => tag.startsWith("u-"),
				},
			},
		}),
	],
};
