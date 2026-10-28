import { basename, resolve } from "node:path";
import type { ServerOptions, UserConfig } from "vite";

// Dev servers started by Playwright (see playwright.config.ts) must never reload the page:
// a save to packages/** or a harness file while the suite runs would otherwise trigger a full
// reload and fail the running test with "Execution context was destroyed". A server started by
// hand with `npm run dev` keeps watching, as Playwright reuses it only when it is already running.
export const server: ServerOptions | undefined = process.env.PLAYWRIGHT
	? { watch: null, hmr: false }
	: undefined;

// Config for a framework folder: served from the folder, with its own cache as concurrent
// dev servers sharing one cache invalidate each other
export const frameworkConfig = (
	root: string,
	config: UserConfig = {},
): UserConfig => ({
	root,
	server,
	cacheDir: resolve(root, `../../node_modules/.vite/${basename(root)}`),
	...config,
});
