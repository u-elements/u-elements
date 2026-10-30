import vue from "@vitejs/plugin-vue";
import { frameworkConfig } from "../vite.shared.ts";

export default frameworkConfig(import.meta.dirname, {
	plugins: [
		vue({
			template: {
				compilerOptions: {
					isCustomElement: (tag) => tag.startsWith("u-"),
				},
			},
		}),
	],
});
