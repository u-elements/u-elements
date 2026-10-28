import { svelte } from "@sveltejs/vite-plugin-svelte";
import { frameworkConfig } from "../vite.shared.ts";

export default frameworkConfig(import.meta.dirname, { plugins: [svelte()] });
