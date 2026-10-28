// Runs the shared suite against the framework harness pages (frameworks/<name>/test.html?component=u-tabs),
// once per framework project, see playwright.config.ts
import { tabsSuite } from "./u-tabs.suite";

tabsSuite();
