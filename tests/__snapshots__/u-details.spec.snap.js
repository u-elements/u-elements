/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["u-details"] = 
`<div>
        <u-details>
          <u-summary id="summary-1" aria-controls="details-1" aria-expanded="false" role="button" tabindex="0">Summary 1</u-summary>
          <details id="details-1" aria-hidden="true" aria-labelledby="summary-1" role="group">Details 1<summary hidden=""></summary></details>
        </u-details>
        <u-details open="">
          <u-summary id="summary-2" aria-controls="details-2" aria-expanded="true" role="button" tabindex="0">Summary 2</u-summary>
          <details id="details-2" aria-hidden="false" aria-labelledby="summary-2" open="" role="group">Details 2<summary hidden=""></summary></details>
        </u-details>
        <u-details>
          <u-summary id="summary-3" summary="" 3<="" u-summary="" aria-expanded="false" role="button" tabindex="0">
          <details id="details-3"><summary>Summary 3 nested</summary>Details 3</details>
        </u-summary></u-details>
      </div>`;
/* end snapshot u-details */

snapshots["u-details-ios"] = 
`<div>
        <u-details>
          <u-summary id="summary-1" aria-controls="details-1" aria-expanded="false" role="button" tabindex="0">Summary 1</u-summary>
          <details id="details-1" aria-hidden="true" aria-labelledby="summary-1" role="group">Details 1<summary hidden=""></summary></details>
        </u-details>
        <u-details open="">
          <u-summary id="summary-2" aria-controls="details-2" aria-expanded="true" role="button" tabindex="0">Summary 2</u-summary>
          <details id="details-2" aria-hidden="false" aria-labelledby="summary-2" open="" role="group">Details 2<summary hidden=""></summary></details>
        </u-details>
        <u-details>
          <u-summary id="summary-3" summary="" 3<="" u-summary="" aria-expanded="false" role="button" tabindex="0">
          <details id="details-3"><summary>Summary 3 nested</summary>Details 3</details>
        </u-summary></u-details>
      </div>`;
/* end snapshot u-details-ios */

snapshots["u-details-android"] = 
`<div>
        <u-details>
          <u-summary id="summary-1" aria-controls="details-1" aria-expanded="false" role="button" tabindex="0">Summary 1</u-summary>
          <details id="details-1" aria-hidden="true" data-labelledby="summary-1" role="group">Details 1<summary hidden=""></summary></details>
        </u-details>
        <u-details open="">
          <u-summary id="summary-2" aria-controls="details-2" aria-expanded="true" role="button" tabindex="0">Summary 2</u-summary>
          <details id="details-2" aria-hidden="false" data-labelledby="summary-2" open="" role="group">Details 2<summary hidden=""></summary></details>
        </u-details>
        <u-details>
          <u-summary id="summary-3" summary="" 3<="" u-summary="" aria-expanded="false" role="button" tabindex="0">
          <details id="details-3"><summary>Summary 3 nested</summary>Details 3</details>
        </u-summary></u-details>
      </div>`;
/* end snapshot u-details-android */

