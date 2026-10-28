/**
 * Shared loader for the harness entry pages (frameworks/<name>/test.html). The page passes the
 * modules found by import.meta.glob, and the component named by ?component=<tag> is loaded,
 * i.e. test.html?component=u-tabs loads ./test.u-tabs.<ext>. Frameworks whose harness modules
 * export a component (Vue, Svelte) pass a mount function, the others mount themselves on import.
 */
export const loadHarness = async (
	pages: Record<string, () => Promise<unknown>>,
	mount?: (mod: unknown) => void,
) => {
	const params = new URLSearchParams(location.search);
	const component = params.get("component") || "u-combobox";
	const page = Object.entries(pages).find(([path]) =>
		path.split("/").pop()?.startsWith(`test.${component}.`),
	);
	if (!page) throw new Error(`No harness page for ${component}`);
	const mod = await page[1]();
	mount?.(mod);
};
