import { qwikVite } from "@qwik.dev/core/optimizer";
import { frameworkConfig } from "../vite.shared.ts";

export default frameworkConfig(import.meta.dirname, {
	plugins: [qwikVite({ csr: true, srcDir: "./" })],
});
