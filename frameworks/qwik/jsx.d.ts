// Qwik JSX typings for the u-elements used in this folder. The source packages declare
// HTMLElementTagNameMap only, while the published dist typings also augment Qwik JSX
import type { JSX } from "@qwik.dev/core/jsx-runtime";

type UElement = JSX.IntrinsicElements["div"] & Record<string, unknown>;

declare module "@qwik.dev/core/jsx-runtime" {
	export namespace JSX {
		export interface IntrinsicElements {
			"u-combobox": UElement;
			"u-datalist": UElement;
			"u-option": UElement;
			"u-progress": UElement;
		}
	}
}
