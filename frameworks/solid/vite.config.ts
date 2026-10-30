import solid from "vite-plugin-solid";
import { frameworkConfig } from "../vite.shared.ts";

export default frameworkConfig(import.meta.dirname, { plugins: [solid()] });
