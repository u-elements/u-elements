// Angular adapter for the harness pages (see packages/harness.ts): standalone components compiled
// JIT in the browser (no Angular CLI) with zoneless change detection. Configs live in a signal on the
// app component, and every harness call ticks the application
import "@angular/compiler"; // Must be imported before @angular/core for JIT
import {
	Directive,
	ElementRef,
	Input,
	inject,
	type OnChanges,
	provideZonelessChangeDetection,
	signal,
	type Type,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { createHarness, type Mountable } from "../../packages/harness";

// Angular templates can not spread attributes, so apply an attribute map through a directive
@Directive({ selector: "[attrs]", standalone: true })
export class AttrsDirective implements OnChanges {
	@Input() attrs: Record<string, string | null | undefined> = {};
	private el = inject(ElementRef).nativeElement as HTMLElement;
	private applied = new Set<string>(); // Only remove attributes set by this directive, as elements like <u-option> manage their own id

	ngOnChanges() {
		for (const name of this.applied)
			if (this.attrs[name] == null) {
				this.applied.delete(name); // Absent or null removes, like frameworks remove an attribute bound to undefined
				this.el.removeAttribute(name);
			}
		for (const [name, value] of Object.entries(this.attrs))
			if (value != null) {
				this.applied.add(name);
				if (this.el.getAttribute(name) !== value)
					this.el.setAttribute(name, value); // Only write on change to avoid MutationObserver noise
			}
	}
}

// Base for the app component of a harness page
@Directive()
export abstract class HarnessComponent<C extends Mountable> {
	cfgs = signal<C[]>([]);

	patch(index: number, patch: Partial<C>) {
		this.cfgs.update((all) =>
			all.map((cfg, i) => (i === index ? { ...cfg, ...patch } : cfg)),
		);
	}
}

export const bootstrapHarness = <C extends Mountable>(
	App: Type<HarnessComponent<C>>,
	defaults: C,
) =>
	bootstrapApplication(App, {
		providers: [provideZonelessChangeDetection()],
	}).then((ref) => {
		const app = ref.components[0].instance as HarnessComponent<C>;
		createHarness(defaults, {
			render: (cfgs) => {
				app.cfgs.set(cfgs);
				ref.tick();
			},
			update: (patch, index) => {
				app.patch(index, patch);
				ref.tick();
			},
		});
	});
