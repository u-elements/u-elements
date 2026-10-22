import react from "@vitejs/plugin-react";

export default {
	root: import.meta.dirname,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/react`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [react()],
};
