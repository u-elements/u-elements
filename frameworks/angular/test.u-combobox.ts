// Angular harness page for the shared u-combobox suite (packages/u-combobox/u-combobox.suite.ts).
// Standalone component compiled JIT in the browser (no Angular CLI), zoneless change detection.
// Items are rendered from a signal (controlled), the input uses ngModel,
// and all combobox events are bound with Angular event bindings. disabled goes through ngModel,
// as Angular Forms removes a plain disabled attribute when it initializes the control.
import "@angular/compiler"; // Must be imported before @angular/core for JIT
import { NgTemplateOutlet } from "@angular/common";
import {
	Component,
	CUSTOM_ELEMENTS_SCHEMA,
	Directive,
	ElementRef,
	Input,
	inject,
	type OnChanges,
	provideZonelessChangeDetection,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { bootstrapApplication } from "@angular/platform-browser";
import "../../packages/u-datalist/u-datalist";
import "../../packages/u-combobox/u-combobox";
import {
	comboboxAttrs,
	createHarness,
	type HarnessConfig,
	type HarnessPatch,
	handleBeforeSelect,
	handleInput,
	handleSubmit,
	listId,
	log,
	type Option,
	optionKey,
} from "../../packages/u-combobox/u-combobox.harness";

// Angular templates can not spread attributes, so apply an attribute map through a directive
@Directive({ selector: "[attrs]", standalone: true })
class AttrsDirective implements OnChanges {
	@Input() attrs: Record<string, string | null | undefined> = {};
	private el = inject(ElementRef).nativeElement as HTMLElement;
	private applied = new Set<string>(); // Only remove attributes set by this directive, as elements like <u-option> manage their own id

	ngOnChanges() {
		for (const [name, value] of Object.entries(this.attrs)) {
			if (value == null) {
				if (this.applied.delete(name)) this.el.removeAttribute(name);
			} else {
				this.applied.add(name);
				if (this.el.getAttribute(name) !== value)
					this.el.setAttribute(name, value); // Only write on change to avoid MutationObserver noise
			}
		}
	}
}

@Component({
	selector: "app-root",
	standalone: true,
	imports: [FormsModule, NgTemplateOutlet, AttrsDirective],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: `
		@for (cfg of cfgs(); track $index) {
			@if (cfg.mounted) {
				@if (cfg.label) {<label [attr.for]="cfg.id">Label</label>}
				@if (cfg.form === 'outside') {
					<form id="form" (submit)="submit($event)">
						<input id="other" name="other" value="keep" />
						<button type="submit">Send</button>
					</form>
				}
				@if (cfg.form === true) {
					<form id="form" (submit)="submit($event)">
						<ng-container *ngTemplateOutlet="combobox; context: { $implicit: cfg, index: $index }" />
						<input id="other" name="other" value="keep" />
						<button type="submit">Send</button>
					</form>
				} @else {
					<ng-container *ngTemplateOutlet="combobox; context: { $implicit: cfg, index: $index }" />
				}
			}
		}

		<ng-template #combobox let-cfg let-index="index">
			<u-combobox
				[attrs]="comboboxAttrs(cfg)"
				(comboboxbeforeselect)="onBeforeSelect($event, cfg, index)"
				(comboboxafterselect)="log('comboboxafterselect', $event)"
				(comboboxbeforematch)="log('comboboxbeforematch', $event)"
				(input)="onInput($event, cfg, index)"
				(change)="log('change', $event)"
			>
				@if (cfg.select) {<select [name]="cfg.select" hidden></select>}
				@for (item of cfg.items; track item.value) {
					<data [attr.value]="item.value">{{ item.label }}</data>
				}
				<input
					[id]="cfg.id"
					[attr.list]="listId(cfg)"
					[attr.form]="cfg.form === 'outside' ? 'form' : null"
					[attr.type]="cfg.inputAttrs['type'] ?? null"
					[attr.readonly]="cfg.inputAttrs['readonly'] ?? null"
					[disabled]="cfg.inputAttrs['disabled'] !== undefined"
					[ngModel]="cfg.value"
					(ngModelChange)="patch(index, { value: $event })"
					[ngModelOptions]="{ standalone: true }"
				/>
				@if (cfg.toggle) {<button type="button" aria-expanded="false">Toggle</button>}
				@if (cfg.clear) {<button type="reset">Clear</button>}
				@if (cfg.options; as options) {
					@for (key of [cfg.listKey]; track key) {
						@if (cfg.listTag === 'u-datalist') {
							<u-datalist [id]="listId(cfg)" [attr.data-nofilter]="cfg.nofilter ? '' : null">
								@for (option of options; track optionKey(option)) {
									<u-option [attrs]="optionAttrs(option)">{{ option.text }}</u-option>
								}
							</u-datalist>
						} @else {
							<datalist [id]="listId(cfg)" [attr.data-nofilter]="cfg.nofilter ? '' : null">
								@for (option of options; track optionKey(option)) {
									<option [attrs]="optionAttrs(option)">{{ option.text }}</option>
								}
							</datalist>
						}
					}
				}
			</u-combobox>
		</ng-template>
	`,
})
class App {
	cfgs = signal<HarnessConfig[]>([]);
	comboboxAttrs = comboboxAttrs;
	listId = listId;
	log = log;
	optionKey = optionKey;
	submit = handleSubmit;

	optionAttrs = (option: Option) => ({
		id: option.id ?? null,
		value: option.value ?? null,
		label: option.label ?? null,
		hidden: option.hidden ? "" : null,
	});

	patch(index: number, patch: HarnessPatch) {
		this.cfgs.update((all) =>
			all.map((cfg, i) => (i === index ? { ...cfg, ...patch } : cfg)),
		);
	}

	onBeforeSelect(event: Event, cfg: HarnessConfig, index: number) {
		handleBeforeSelect(event, cfg, (items) => this.patch(index, { items }));
	}

	onInput(event: Event, cfg: HarnessConfig, index: number) {
		handleInput(event, cfg, (options) => this.patch(index, { options }));
	}
}

bootstrapApplication(App, {
	providers: [provideZonelessChangeDetection()],
}).then((ref) => {
	const app = ref.components[0].instance as App;
	createHarness({
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
