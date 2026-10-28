import preact from "@preact/preset-vite";
import { frameworkConfig } from "../vite.shared.ts";

export default frameworkConfig(import.meta.dirname, { plugins: [preact()] });
