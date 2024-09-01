import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
// @ts-ignore
import Sandbox from "./sandbox.vue";
import "./custom.css";

export default {
	...DefaultTheme,
	enhanceApp({ app }) {
		app.component("Sandbox", Sandbox);
	},
} satisfies Theme;
