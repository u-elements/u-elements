// Entry for the harness pages, see frameworks/entry.ts: test.html?component=<tag> mounts ./test.<tag>.vue
import { type Component, createApp } from "vue";
import { loadHarness } from "../entry";

loadHarness(import.meta.glob("./test.u-*.vue"), (mod) =>
	createApp((mod as { default: Component }).default).mount("#app"),
);
