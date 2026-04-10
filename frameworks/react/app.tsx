import { useRef, useState } from "react";
import ReactDOM from "react-dom/client";
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
	const [selected, setSelected] = useState(["Test 1"]);
	const ref = useRef<UHTMLComboboxElement>(null);

	const handleBeforeSelect = (event: CustomEvent<HTMLDataElement>) => {
		const { multiple, values } = event.target as UHTMLComboboxElement;
		const { isConnected, value } = event.detail;
		console.log("beforeselect", {isConnected, value, values, multiple});
		event.preventDefault();

		if (!multiple) setSelected(isConnected ? [] : [value]);
		else
			setSelected(
				values
					.concat(value)
					.filter((v) => value !== v || !isConnected),
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
			<u-combobox ref={ref} data-multiple oncomboboxbeforeselect={handleBeforeSelect}>
				<select hidden></select>
				{selected.map((opt) => (
					<data key={opt}>{opt}</data>
				))}
				<input
					autoFocus
					id="my-input"
					onInput={(e) => console.log("onInput", e.currentTarget.value)}
				/>
				<del role="img" aria-label="Fjern tekst">
					&times;
				</del>
				<u-datalist id="my-list">
					<u-option>Test 1</u-option>
					<u-option>Test 2</u-option>
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
					<u-tab aria-selected="true">Tab 3</u-tab>
				</u-tablist>
				<u-tabpanel>Panel 1</u-tabpanel>
				<u-tabpanel>Panel 2</u-tabpanel>
				<u-tabpanel>Panel 3</u-tabpanel>
			</u-tabs>
		</div>
	);
}

// @ts-ignore
window.mount = window.mount || ReactDOM.createRoot(document.getElementById("root"));
// @ts-ignore
window.mount.render(<App />);
// render(<App />, document.getElementById('root')!); // For React 16.8
