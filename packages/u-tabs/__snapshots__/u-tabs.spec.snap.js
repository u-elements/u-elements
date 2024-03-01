/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["u-tabs"] = 
`<u-tabs>
        <u-tablist role="tablist">
          <u-tab id="tab-1" aria-selected="true" aria-controls="panel-1" role="tab" tabindex="0">Tab 1</u-tab>
          <u-tab id="tab-2" aria-selected="false" aria-controls="panel-2" role="tab" tabindex="-1">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1" aria-labelledby="tab-1" role="tabpanel">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2" hidden="" aria-labelledby="tab-2" role="tabpanel">Panel 2</u-tabpanel>
      </u-tabs>`;
/* end snapshot u-tabs */

snapshots["u-tabs-android"] = 
`<u-tabs>
        <u-tablist role="tablist">
          <u-tab id="tab-1" aria-selected="true" aria-controls="panel-1" role="tab" tabindex="0">Tab 1</u-tab>
          <u-tab id="tab-2" aria-selected="false" aria-controls="panel-2" role="tab" tabindex="-1">Tab 2</u-tab>
        </u-tablist>
        <u-tabpanel id="panel-1" data-labelledby="tab-1" role="tabpanel">Panel 1</u-tabpanel>
        <u-tabpanel id="panel-2" hidden="" data-labelledby="tab-2" role="tabpanel">Panel 2</u-tabpanel>
      </u-tabs>`;
/* end snapshot u-tabs-android */

