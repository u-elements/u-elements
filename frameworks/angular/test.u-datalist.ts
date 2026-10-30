// Angular harness page for the shared u-datalist suite (packages/u-datalist/u-datalist.suite.ts).
// Options are rendered from a keyed signal, the input uses ngModel, and input is bound with (input).
// disabled goes through the property, as Angular Forms removes a plain disabled attribute when it initializes the control
import "@angular/compiler"; // Must be imported before @angular/core for JIT
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { FormsModule } from "@angular/forms";
import "../../packages/u-datalist/u-datalist";
import { log } from "../../packages/harness";
import {
	DEFAULTS,
	datalistAttrs,
	type HarnessConfig,
	inputIds,
	listAttr,
	type Option,
} from "../../packages/u-datalist/u-datalist.harness";
import { AttrsDirective, bootstrapHarness, HarnessComponent } from "./harness";

@Component({
	selector: "app-root",
	standalone: true,
	imports: [FormsModule, AttrsDirective],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: `
		@for (cfg of cfgs(); track $index; let i = $index) {
			@if (cfg.mounted) {
				@for (id of inputIds(cfg); track id; let first = $first) {
					<label [attr.for]="id">Label {{ id }}</label>
					@if (first) {
						@for (key of [cfg.inputKey]; track key) {
							<input
								[id]="id"
								[attr.list]="listAttr(cfg)"
								[attr.readonly]="cfg.inputAttrs['readonly'] ?? null"
								[disabled]="cfg.inputAttrs['disabled'] !== undefined"
								[ngModel]="cfg.value"
								(ngModelChange)="patch(i, { value: $event })"
								[ngModelOptions]="{ standalone: true }"
								(input)="log('input', $event)"
							/>
						}
					} @else {
						<input
							[id]="id"
							[attr.list]="listAttr(cfg)"
							[attr.readonly]="cfg.inputAttrs['readonly'] ?? null"
							[disabled]="cfg.inputAttrs['disabled'] !== undefined"
						/>
					}
				}
				@if (cfg.options; as options) {
					<u-datalist [attrs]="datalistAttrs(cfg)">
						@for (option of options; track option.key) {
							<u-option [attrs]="optionAttrs(option)">{{ option.text }}</u-option>
						}
					</u-datalist>
				}
				@if (cfg.options2; as options) {
					<u-datalist [attrs]="datalistAttrs(cfg, cfg.listId + '-2')">
						@for (option of options; track option.key) {
							<u-option [attrs]="optionAttrs(option)">{{ option.text }}</u-option>
						}
					</u-datalist>
				}
			}
		}
	`,
})
class App extends HarnessComponent<HarnessConfig> {
	datalistAttrs = datalistAttrs;
	inputIds = inputIds;
	listAttr = listAttr;
	log = log;

	// Attributes only, as the directive can not write properties
	optionAttrs = (option: Option) => ({
		value: option.value ?? null,
		label: option.label ?? null,
		hidden: option.hidden ? "" : null,
		disabled: option.disabled ? "" : null,
		selected: option.selected ? "" : null,
		"aria-posinset": option.posinset == null ? null : `${option.posinset}`,
		"aria-setsize": option.setsize == null ? null : `${option.setsize}`,
	});
}

bootstrapHarness(App, DEFAULTS);
