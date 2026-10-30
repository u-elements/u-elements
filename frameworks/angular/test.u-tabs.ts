// Angular harness page for the shared u-tabs suite (packages/u-tabs/u-tabs.suite.ts).
// Tabs and panels are rendered from a keyed signal, aria-selected is rendered from state in controlled mode,
// and click is bound with (click), which Angular attaches directly to the element
import "@angular/compiler"; // Must be imported before @angular/core for JIT
import { NgTemplateOutlet } from "@angular/common";
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "../../packages/u-tabs/u-tabs";
import {
	DEFAULTS,
	type HarnessConfig,
	handleClick,
	panelAttrs,
	type Tab,
	tabAttrs,
	visiblePanels,
} from "../../packages/u-tabs/u-tabs.harness";
import { AttrsDirective, bootstrapHarness, HarnessComponent } from "./harness";

@Component({
	selector: "app-root",
	standalone: true,
	imports: [NgTemplateOutlet, AttrsDirective],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	template: `
		@for (cfg of cfgs(); track $index; let i = $index) {
			@if (cfg.mounted) {
				<u-tabs [attrs]="cfg.attrs" [selectedIndex]="cfg.selectedIndex" [attr.data-rewrite]="cfg.rewrite">
					<u-tablist>
						@for (tab of cfg.tabs; track tab.key) {
							<u-tab [attrs]="tabAttrs(tab, cfg)" (click)="onClick($event, tab, cfg, i)">{{ tab.label }}</u-tab>
						}
					</u-tablist>
					@if (!cfg.panelsOutside) {
						<ng-container *ngTemplateOutlet="panels; context: { $implicit: cfg }" />
					}
				</u-tabs>
				@if (cfg.panelsOutside) {
					<ng-container *ngTemplateOutlet="panels; context: { $implicit: cfg }" />
				}
			}
		}

		<ng-template #panels let-cfg>
			@for (panel of visiblePanels(cfg); track panel.key) {
				<u-tabpanel [attrs]="panelAttrs(panel, cfg)">
					{{ panel.text }}
					@if (cfg.nested && panel.key === cfg.panels[0].key) {
						<u-tabs>
							<u-tablist>
								<u-tab>Nested 1</u-tab>
								<u-tab>Nested 2</u-tab>
							</u-tablist>
							<u-tabpanel>Nested panel 1</u-tabpanel>
							<u-tabpanel>Nested panel 2</u-tabpanel>
						</u-tabs>
					}
				</u-tabpanel>
			}
		</ng-template>
	`,
})
class App extends HarnessComponent<HarnessConfig> {
	tabAttrs = tabAttrs;
	panelAttrs = panelAttrs;
	visiblePanels = visiblePanels;

	onClick(event: Event, tab: Tab, cfg: HarnessConfig, index: number) {
		handleClick(event, tab, cfg, (selected) => this.patch(index, { selected }));
	}
}

bootstrapHarness(App, DEFAULTS);
