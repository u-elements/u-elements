// Preact JSX typings for the u-elements used in this folder. The source packages declare
// HTMLElementTagNameMap only, while the published dist typings also augment Preact JSX
import type { JSX } from "preact";

type UElement = JSX.HTMLAttributes<HTMLElement> & Record<string, unknown>;

declare module "preact" {
	namespace JSX {
		interface IntrinsicElements {
			"u-combobox": UElement;
			"u-datalist": UElement;
			"u-option": UElement;
			"u-progress": UElement;
		}
	}
}
