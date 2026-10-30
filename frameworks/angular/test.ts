// Entry for the harness pages, see frameworks/entry.ts: test.html?component=<tag> loads ./test.<tag>.ts
import { loadHarness } from "../entry";

loadHarness(import.meta.glob("./test.u-*.ts"));
