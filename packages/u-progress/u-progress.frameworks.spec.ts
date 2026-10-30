// Runs the shared suite against the framework harness pages (frameworks/<name>/test.html?component=u-progress),
// once per framework project, see playwright.config.ts
import { progressSuite } from "./u-progress.suite";

progressSuite();
