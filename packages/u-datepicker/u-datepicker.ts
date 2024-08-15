export type { UHTMLOptionElement } from "../u-datalist/u-option";
import { getWeekStartByRegion } from "weekstart";
import "../u-datalist/u-option";
import {
	UHTMLElement,
	createElement,
	customElements,
	getRoot,
	off,
	on,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-datepicker": UHTMLDatePickerElement;
		// 'u-datepicker-head': UHTMLDatePickerHeadElement
		// 'u-datepicker-option': HTMLOptionElement
	}
}
// TODO: Announce button change also on year
// TODO: Add year to label if changing year
// TODO: Add focus as prop
// TODO: Disabled
// TODO: Find focus from selected (if not provided), and fallback to today if none provided
// TODO: change month when screen reader focusing a date outside month (buggy now)
// TODO: u-datepicker-date.value/.ymd? readOnly
// TODO: weeknumber attribute
// TODO: copy -item and -head elements - replacing <slot> for text
// TODO: Remove trailing dot in short days?

type DateValue = Date | number | string;

let IS_POINTER = false; // Used in screen-reader vs pointer-detection
const EVENTS = "click,focusin,keydown,pointerdown,pointerup";

/**
 * The `<u-datepicker>` HTML element contains lets you pick a date from a grid.
 * No MDN reference available.
 */
export class UHTMLDatePickerElement extends UHTMLElement {
	#focused = new Date();
	#grid: HTMLDivElement;
	#lang = "";
	#week = "";
	#weekStart = 0;

	static observedAttributes = ["lang", "data-week"];
	constructor() {
		super();
		this.#grid = createElement("table", {
			innerHTML: `<caption></caption>
      <thead><tr part="days"><th scope="col"><slot></slot></th>${`<th scope="col"><slot name="-"></slot></th>`.repeat(7)}</tr></thead>
      <tbody part="dates">${`<tr role="row" part="row"><th scope="row" part="weeknumber"></th>${`<td><div><slot name="-"></slot></div></td>`.repeat(7)}</tr>`.repeat(7)}</tbody>`,
		});
		this.attachShadow({ mode: "closed" }).append(
			this.#grid,
			createElement("style", {
				textContent: `:host { text-align: center }
        :host table { border-collapse: collapse; table-layout: fixed ; width: 100% }
        :host th { text-align: inherit }
        /*:host(:not([hidden])) { display: grid; grid-template-columns: repeat(8, 1fr); grid-auto-rows: auto; text-align: center }
        :host(:not([data-week])) { grid-template-columns: repeat(7, 1fr) } /* 7 columns when week number is hidden
        :host(:not([data-week])) :is([part="day week"], [part="weeknumber"]) { display: none }
        :host > div { display: contents }
        :host > div > div, :host > div > div > div { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid } */
        :host::before { content: attr(aria-label); position: absolute; margin-top: -2rem }`,
			}),
		);
	}
	connectedCallback() {
		this.attributeChangedCallback(); // Ensure attributeChangedCallback is called on connect
		// this.role = 'table'
		on(this, EVENTS, this);
	}
	disconnectedCallback() {
		off(this, EVENTS, this);
	}
	attributeChangedCallback() {
		const lang = this.closest("[lang]")?.getAttribute("lang") || "en";
		const week = this.getAttribute("data-week") || "";

		if (lang === this.#lang && week === this.#week) return; // Only re-render if necessary

		const locale = new Intl.Locale(lang);
		const english = new Intl.DateTimeFormat("en", { weekday: "long" }).format;
		const long = new Intl.DateTimeFormat(locale, { weekday: "long" }).format;
		const short = new Intl.DateTimeFormat(locale, { weekday: "short" }).format;

		this.#lang = lang;
		this.#week = week;
		this.#weekStart = getWeekStartByRegion(locale.region || "GB");
		this.getMonthName = new Intl.DateTimeFormat(locale, {
			month: "long",
		}).format;

		this.#grid.querySelectorAll("thead th").forEach((cell, index) => {
			const day = new Date(2023, 0, (index + this.#weekStart) % 7);
			const slot = cell.firstElementChild as HTMLSlotElement; // Using <div> for headers as VoiceOver skips aria-label on <slot>
			const capitalized = short(day).replace(/^./, (m) => m.toUpperCase());

			slot.name = index ? english(day).toLowerCase() : "week";
			slot.textContent = index ? capitalized.replace(/\.$/, "") : this.#week; // Strip trailing dot
			cell.ariaLabel = index ? long(day) : this.#week;
			cell.setAttribute("part", `day ${slot.name}`);
		});
		this.#render();
	}
	handleEvent(event: Event) {
		if (event.type === "click") onClick(this, event);
		if (event.type === "focusin" && !IS_POINTER) onFocusIn(this, event); // Focus-to-move when screen reader is moving focus
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "pointerdown") IS_POINTER = true; // Prevent focus-to-move when touch/mouse interaction
		if (event.type === "pointerup") IS_POINTER = false; // Re-enable focus-to-move
	}
	getMonthName(date: number | Date) {
		return `${new Date(date).getMonth()}`; // Placeholder function before attributeChangedCallback has run
	}
	get focused(): Date {
		return new Date(this.#focused); // return clone for immutability
	}
	set focused(value: DateValue) {
		const prev = this.focused;
		const next = new Date(Number.isFinite(+value) ? +value : value); // Allow timestamps as string as well

		if (+prev === +next) return; // Skip if same date, preventing infinite loop
		this.#focused = next;
		this.attributeChangedCallback();
		console.log(prev, next);
	}
	get selected(): Date[] {
		const values = this.getAttribute("data-value")?.split(",") || [];
		return values.map((val) => new Date(val));
	}
	set selected(value: DateValue | DateValue[]) {
		const dates = Array.from([value].flat(), (val) => new Date(val));
		this.setAttribute("data-value", dates.map(Number).join(","));
	}
	get weekStart() {
		return this.#weekStart;
	}
	#render() {
		const date = this.focused;
		const focused = getRoot(this).activeElement;
		const month = date.getMonth();
		const focusedYMD = getYMD(date);
		const shouldFocus = this.contains(focused);
		const todayYMD = getYMD(new Date());
		// const week = this.getAttribute('data-week')
		// const values = this.selected.map((date) => getYMD(date))
		// const templates = [...this.querySelectorAll('time')].reduce(
		//   (all, opt) => {
		//     if (!this.#options.includes(opt))
		//       all[getYMD(new Date(opt.dateTime))] = opt
		//     return all
		//   },
		//   {} as Record<string, HTMLTimeElement>
		// )

		this.ariaLabel = `${this.getMonthName(date)}, ${date.getFullYear()}`; // Set before manipulating date
		date.setDate(1 - new Date(date.setDate(1)).getDay() + this.weekStart); // Move to first day of week

		for (const cell of this.#grid.querySelectorAll<HTMLSlotElement>("td")) {
			// if (!(index % 7)) {
			//   const th = cell.previousElementSibling!
			//   const num = `${getWeek(date)}`
			//   th.ariaLabel = week ? `${week} ${num}` : ''
			//   th.textContent = week ? num : ''
			// }

			const ymd = getYMD(date);
			const day = date.getDate();
			const opt = cell.firstElementChild as HTMLElement;
			// const opt = templates[ymd] || this.#options[index]
			const slot = opt.querySelector("slot") || opt;

			slot.textContent = `${day}`;
			// slot.innerHTML = `<b>${day}</b><span>hei</span>`
			opt.ariaCurrent = ymd === todayYMD ? "date" : "false";
			opt.ariaDisabled = `${date.getMonth() !== month}`;
			// opt.ariaLabel = `${day} ${this.getMonthName(date)}`
			opt.ariaPressed = opt.ariaSelected || opt.ariaPressed;
			opt.ariaSelected = null;
			opt.role = "button";
			opt.slot = cell.name = ymd;
			opt.tabIndex = ymd === focusedYMD ? 0 : -1;
			// opt.dateTime = `${date.getTime()}`

			if (shouldFocus && ymd === focusedYMD && focused !== opt) opt.focus();
			date.setDate(day + 1);
			// }
		}
	}
}

const getYMD = (d: Date) =>
	[d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-");

// Souce: https://stackoverflow.com/a/6117889
// const getWeek = (d: Date) => {
//   const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
//   date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)) // ISO-week starts on Monday
//   const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
//   return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7)
// }

function onClick(self: UHTMLDatePickerElement, { target }: Event) {
	console.log("onClick");
	const button = (target as Element)?.closest<HTMLButtonElement>("td button");
	if (button) self.focused = button.value;
}

function onFocusIn(self: UHTMLDatePickerElement, { target }: Event) {
	console.log("onFocusIn");
	const button = (target as Element)?.closest<HTMLButtonElement>("td button");
	if (button) self.focused = button.value;
}

function onKeyDown(self: UHTMLDatePickerElement, event: KeyboardEvent) {
	const { key, shiftKey: shift } = event;
	const d = self.focused;
	const weekStart = d.getDate() - d.getDay() + self.weekStart;
	let next: number | null = null;

	if (key === "ArrowUp") next = d.setDate(d.getDate() - 7); // Prev week
	if (key === "ArrowDown") next = d.setDate(d.getDate() + 7); // Next week
	if (key === "ArrowLeft") next = d.setDate(d.getDate() - 1); // Next day
	if (key === "ArrowRight") next = d.setDate(d.getDate() + 1); // Prev day

	if (key === "PageUp" && !shift) next = d.setMonth(d.getMonth() - 1); // Prev month
	if (key === "PageDown" && !shift) next = d.setMonth(d.getMonth() + 1); // Next month
	if (key === "PageUp" && shift) next = d.setFullYear(d.getFullYear() - 1); // Prev year
	if (key === "PageDown" && shift) next = d.setFullYear(d.getFullYear() + 1); // Next year
	if (key === "Home") next = d.setDate(weekStart); // First day of week
	if (key === "End") next = d.setDate(weekStart + 7); // Last day of week

	if (typeof next === "number") {
		event.preventDefault(); // TODO Move
		self.focused = next;
	}
}

customElements.define("u-datepicker", UHTMLDatePickerElement);
