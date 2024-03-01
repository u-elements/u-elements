/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["u-details"] = 
`<div>
        <u-details>
          <u-summary id="summary-1" aria-controls="details-1" aria-expanded="false" role="button" tabindex="0">Summary 1</u-summary>
          <div id="details-1" aria-hidden="true" hidden="until-found" aria-labelledby="summary-1" role="group">Details 1</div>
        </u-details>
        <u-details open="">
          <u-summary id="summary-2" aria-controls="details-2" aria-expanded="true" role="button" tabindex="0">Summary 2</u-summary>
          <div id="details-2" aria-hidden="false" aria-labelledby="summary-2" role="group">Details 2</div>
        </u-details>
        <u-details>
          <u-summary id="summary-3" aria-controls="details-3" aria-expanded="false" role="button" tabindex="0">Summary 3</u-summary>
          <div id="details-3" aria-hidden="true" hidden="until-found" aria-labelledby="summary-3" role="group">Details 3</div>
        </u-details>
      </div>`;
/* end snapshot u-details */

snapshots["u-details-android"] = 
`<div>
        <u-details>
          <u-summary id="summary-1" aria-controls="details-1" aria-expanded="false" role="button" tabindex="0">Summary 1</u-summary>
          <div id="details-1" aria-hidden="true" hidden="until-found" data-labelledby="summary-1" role="group">Details 1</div>
        </u-details>
        <u-details open="">
          <u-summary id="summary-2" aria-controls="details-2" aria-expanded="true" role="button" tabindex="0">Summary 2</u-summary>
          <div id="details-2" aria-hidden="false" data-labelledby="summary-2" role="group">Details 2</div>
        </u-details>
        <u-details>
          <u-summary id="summary-3" aria-controls="details-3" aria-expanded="false" role="button" tabindex="0">Summary 3</u-summary>
          <div id="details-3" aria-hidden="true" hidden="until-found" data-labelledby="summary-3" role="group">Details 3</div>
        </u-details>
      </div>`;
/* end snapshot u-details-android */

