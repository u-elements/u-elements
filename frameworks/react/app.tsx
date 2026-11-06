import { useRef, useState } from "react";
import ReactDOM, { type Root } from "react-dom/client";
// import { render } from 'react-dom' // For React 16.8
import "../../packages/u-progress/u-progress";
import "../../packages/u-datalist/u-datalist";
import "../../packages/u-combobox/u-combobox";
import "../../packages/u-tabs/u-tabs";

// Import types
import type { UHTMLComboboxElement } from "../../packages/u-combobox/u-combobox";
import "../../packages/u-datalist";
import "../../packages/u-progress";
import "../../packages/u-tabs";

export default function App() {
	const [count, setCount] = useState(0);
	const [selected, setSelected] = useState([{ value: "HEI", label: "Test 1" }]);
	const ref = useRef<UHTMLComboboxElement>(null);

	const handleBeforeSelect = (event: CustomEvent<HTMLDataElement>) => {
		const { multiple, items } = event.target as UHTMLComboboxElement;
		const { isConnected, textContent: label, value } = event.detail;
		console.log("beforeselect", { isConnected, value, items, multiple });
		event.preventDefault();

		if (!multiple) setSelected(isConnected ? [] : [{ value, label }]);
		else
			setSelected((prev) =>
				prev
					.concat({ value, label })
					.filter((item) => value !== item.value || !isConnected),
			);
	};

	// useEffect(() => {
	//   const self = ref.current
	//   const beforeSelect = (event: CustomEvent<HTMLDataElement>) => {
	//     const target = event.target as UHTMLComboboxElement;
	//     const item = event.detail;
	//     event.preventDefault();
	//     setSelected(target.values.concat(item.value).filter((v) => item.value !== v || !item.isConnected));
	//   }

	//   self?.addEventListener('comboboxbeforeselect', beforeSelect, true)
	//   return () => self?.removeEventListener('comboboxbeforeselect', beforeSelect, true);
	// }, []);

	return (
		<div>
			<style>{`u-option[selected]{color:red;font-weight:bold}`}</style>
			<h1>React + u-elements</h1>
			<button type="button" onClick={() => setCount((count) => count + 1)}>
				count is {count}
			</button>
			<u-progress value="5" max="15"></u-progress>
			<br />
			<br />
			<label htmlFor="my-input">Choose ice cream</label>
			<br />
			{/* @ts-expect-error */}
			<u-combobox
				ref={ref}
				data-multiple
				oncomboboxbeforeselect={handleBeforeSelect}
			>
				<select hidden></select>
				{selected.map(({ label, value }) => (
					<data key={value} value={value}>
						{label}
					</data>
				))}
				<input
					// biome-ignore lint/a11y/noAutofocus: Demo page
					autoFocus
					id="my-input"
					onInput={(e) => console.log("onInput", e.currentTarget.value)}
				/>
				<button type="reset" aria-label="Fjern tekst">
					&times;
				</button>
				<u-datalist id="my-list">
					<u-option value="HEI">Test 1</u-option>
					<u-option value="Hade">Test 2</u-option>
					<u-option>Test 3</u-option>
					<u-option>Bergen</u-option>
				</u-datalist>
				{/* @ts-expect-error */}
			</u-combobox>
			<br />
			<br />
			<style>{`
        u-tab { padding: 2px 5px }
        u-tab[aria-selected="true"] { background: black; color: white }
        u-tabpanel { padding: 10px; border: 1px solid }
      `}</style>
			<div>
				`u-tabpanel`s are defined outside `u-tabs`. when using
				`aria-selected=true` the initial selected tab is `hidden`, and if you
				inspect the DOM you can see that the tab that has `aria-selected=true`
				has no value for the `aria-controls` attribute
			</div>
			<br />
			<br />
			<u-tabs>
				<u-tablist>
					<u-tab>Tab 1</u-tab>
					<u-tab>Tab 2</u-tab>
					{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: Custom element with role tab */}
					<u-tab aria-selected="true">Tab 3</u-tab>
				</u-tablist>
				<u-tabpanel>Panel 1</u-tabpanel>
				<u-tabpanel>Panel 2</u-tabpanel>
				<u-tabpanel>Panel 3</u-tabpanel>
			</u-tabs>
			<div>
				<label htmlFor="dest">Velg en destinasjon</label>
				{/* @ts-expect-error */}
				<u-combobox className="ds-suggestion" data-multiple id="dest">
					<input className="ds-input" type="text" placeholder="" />
					<button
						aria-expanded="false"
						aria-label="Valg"
						type="button"
					></button>
					<button hidden={true} type="reset"></button>
					<u-datalist data-nofilter="" popover="manual" role="listbox">
						<u-option data-empty="">Ingen treff</u-option>
						<u-option label="Sogndal" value="Sog">
							Sogndal
						</u-option>
						<u-option label="Oslo" value="Osl">
							Oslo
						</u-option>
						<u-option label="Brønnøysund" value="Brø">
							Brønnøysund
						</u-option>
					</u-datalist>
					{/* @ts-expect-error */}
				</u-combobox>
			</div>
		</div>
	);
}

declare global {
	interface Window {
		mount?: Root; // Reused across Vite HMR reloads
	}
}
window.mount =
	window.mount ||
	ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
window.mount.render(<App />);
// render(<App />, document.getElementById('root')!); // For React 16.8
