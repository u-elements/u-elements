import { mount } from "svelte";
import Test from "./test.u-combobox.svelte";

export default mount(Test, {
	target: document.getElementById("app") as HTMLElement,
});
