// Solid JSX typings for the u-elements used in this folder. The source packages declare
// HTMLElementTagNameMap only, while the published dist typings also augment Solid JSX
import type { JSX } from "solid-js";

type UElement = JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"u-combobox": UElement;
			"u-datalist": UElement;
			"u-option": UElement;
			"u-progress": UElement;
		}
	}
}
