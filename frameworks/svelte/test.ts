// Entry for the harness pages, see frameworks/entry.ts: test.html?component=<tag> mounts ./test.<tag>.svelte
import { type Component, mount } from "svelte";
import { loadHarness } from "../entry";

loadHarness(import.meta.glob("./test.u-*.svelte"), (mod) =>
	mount((mod as { default: Component }).default, {
		target: document.getElementById("app") as HTMLElement,
	}),
);
