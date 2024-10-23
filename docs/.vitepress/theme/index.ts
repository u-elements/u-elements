import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import Sandbox from "./sandbox.vue";
import Layout from './layout.vue';
import "./custom.css";

export default {
	Layout,
	extends: DefaultTheme,
	enhanceApp({ app }) {
		app.component("Sandbox", Sandbox);
	},
} satisfies Theme;
