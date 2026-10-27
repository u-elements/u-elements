import preact from "@preact/preset-vite";
import { server } from "../vite.shared";

export default {
	root: import.meta.dirname,
	server,
	cacheDir: `${import.meta.dirname}/../../node_modules/.vite/preact`, // Own cache, as concurrent dev servers sharing one cache invalidate each other
	plugins: [preact()],
};
