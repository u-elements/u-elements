import react from "@vitejs/plugin-react";
import { frameworkConfig } from "../vite.shared.ts";

export default frameworkConfig(import.meta.dirname, { plugins: [react()] });
