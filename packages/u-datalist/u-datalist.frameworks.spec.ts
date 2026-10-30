// Runs the shared suite against the framework harness pages (frameworks/<name>/test.html?component=u-datalist),
// once per framework project, see playwright.config.ts
import { datalistSuite } from "./u-datalist.suite";

datalistSuite();
