// Angular harness page for the shared u-progress suite (packages/u-progress/u-progress.suite.ts).
// value and max are bound as properties, which Angular writes after inserting the element
import "@angular/compiler"; // Must be imported before @angular/core for JIT
import { NgTemplateOutlet } from "@angular/common";
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "../../packages/u-progress/u-progress";
import {
	DEFAULTS,
	type HarnessConfig,
	labelId,
	progressAttrs,
} from "../../packages/u-progress/u-progress.harness";
import { AttrsDirective, bootstrapHarness, HarnessComponent } from "./harness";

@Component({
	selector: "app-root",
	standalone: true,
	imports: [NgTemplateOutlet, AttrsDirective],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: `
		@for (cfg of cfgs(); track $index) {
			@if (cfg.mounted) {
				@if (cfg.label === 'for') {<label [attr.for]="cfg.id">{{ cfg.text }}</label>}
				@if (cfg.label === 'aria-labelledby') {<span [id]="labelId(cfg)">{{ cfg.text }}</span>}
				@if (cfg.label === 'wrap') {
					<label>{{ cfg.text }} <ng-container *ngTemplateOutlet="progress; context: { $implicit: cfg }" /></label>
				} @else {
					<ng-container *ngTemplateOutlet="progress; context: { $implicit: cfg }" />
				}
			}
		}

		<ng-template #progress let-cfg>
			<u-progress [attrs]="progressAttrs(cfg)" [value]="cfg.value" [max]="cfg.max" [hidden]="cfg.hidden"></u-progress>
		</ng-template>
	`,
})
class App extends HarnessComponent<HarnessConfig> {
	labelId = labelId;
	progressAttrs = progressAttrs;
}

bootstrapHarness(App, DEFAULTS);
