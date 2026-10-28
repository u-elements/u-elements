// Entry for the harness pages, see frameworks/entry.ts: test.html?component=<tag> loads ./test.<tag>.tsx
import { loadHarness } from "../entry";

loadHarness(import.meta.glob("./test.u-*.tsx"));
