export type { UHTMLOptionElement } from "../u-datalist/u-option";

import { getWeekStartByRegion } from "./week-start";
import "../u-datalist/u-option";
import {
	attr,
	createElement,
	customElements,
	off,
	on,
	speak,
	UHTMLElement,
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
// TODO: week number attribute
// TODO: copy -item and -head elements - replacing <slot> for text
// TODO: Remove trailing dot in short days?

type DateValue = Date | number | string;
const EVENTS = "click,input,focusin,keydown,pointerdown,pointerup";
const ENGLISH_DAYS = "sun,mon,tues,wednes,thurs,fri,satur"
	.replace(/(,|$)/g, "day$1")
	.split(",");

/**
 * The `<u-datepicker>` HTML element contains lets you pick a date from a grid.
 * No MDN reference available.
 */
export class UHTMLDatePickerElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_focusedDate = new Date();
	_lang?: string;
	_week?: string;
	_firstDayOfWeek = 0;
	_input?: HTMLInputElement;
	_select?: HTMLSelectElement;
	_table?: HTMLTableElement;

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return ["lang", "data-months", "data-week"];
	}
	constructor() {
		super();
		this.attachShadow({ mode: "open" }).append(
			createElement(
				"slot",
				`<slot name="month"><select name="month" part="month">${Array.from({ length: 12 }, (_, i) => `<option value="${i}"></option>`).join("")}</select></slot>
				<slot name="year"><input name="year" part="year" type="number" /></slot>
				<slot name="prev"><button name="prev" part="prev" type="button"><slot name="prev-icon">&larr;</slot></button></slot>
				<slot name="next"><button name="next" part="next" type="button"><slot name="next-icon">&rarr;</slot></button></slot>`,
				{ part: "controls", name: "controls" },
			),
			createElement(
				"table",
				`<thead part="thead" aria-hidden="true"><tr part="tr days"><th scope="col"><slot name="week"></slot></th>${`<th scope="col"><slot name="-"></slot></th>`.repeat(7)}</tr></thead>
				<tbody part="tbody">${`<tr role="row"><th scope="row" part="weeknumber"><slot name="-"></slot></th>${`<td part="td"><button type="button" part="date"><slot name="-before"></slot><slot name="-"></slot><slot name="-after"></slot></button></td>`.repeat(7)}</tr>`.repeat(6)}</tbody>
			`,
				{ part: "table" },
			),
			createElement(
				"table",
				`<thead part="thead" aria-hidden="true"><tr part="tr days"><th scope="col"><slot name="week"></slot></th>${`<th scope="col"><slot name="-"></slot></th>`.repeat(7)}</tr></thead>
				<tbody part="tbody">${`<tr role="row"><th scope="row" part="weeknumber"><slot name="-"></slot></th>${`<td part="td"><button type="button" part="date"><slot name="-before"></slot><slot name="-"></slot><slot name="-after"></slot></button></td>`.repeat(7)}</tr>`.repeat(6)}</tbody>
			`,
				{ part: "table" },
			),
			createElement(
				"style",
				`:host(:not([hidden])) { display: flex; flex-wrap: wrap; gap: 1em; background: Canvas; color: CanvasText }
				:host(:not([data-week])) th:first-child { display: none }
				slot[name="controls"] { display: flex; align-items: center; gap: inherit; width: 100% }
				slot[name="year"] { display: block; margin-right: auto }
				button, input, select, th, td { box-sizing: border-box; field-sizing: content; font: inherit; background: none; color: inherit; padding: 0; margin: 0; border: 0; text-align: inherit }
				th { font-weight: bold }

				table { border-collapse: collapse; border-spacing: 0; table-layout: fixed; flex: 1 1 auto; text-align: center }
				th::before, button::before { content: attr(data-text) / attr(data-aria) }
				td button { width: 100% }
				button[data-month="outside"] { color: GrayText }
				button[aria-disabled="true"] { color: GrayText; text-decoration: line-through }
				button[aria-current="date"] { text-decoration: underline }
				button:enabled { cursor: pointer }`,
			),
		);
	}
	connectedCallback() {
		on(this, EVENTS, this);
		this._input = get(this, "input");
		this._select = get(this, "select");
		this._table = get(this, "table");
		this.attributeChangedCallback(); // Ensure attributeChangedCallback is called on connect
	}
	disconnectedCallback() {
		off(this, EVENTS, this);
		this._input = this._table = this._select = undefined;
	}
	attributeChangedCallback() {
		const lang = this.closest("[lang]")?.getAttribute("lang") || "en";
		const week = attr(this, "data-week") || "";

		// Only render if ready and have a change in config
		if (!this._table || (lang === this._lang && week === this._week)) return;
		const locale = new Intl.Locale(lang);
		const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format;
		const dayName = new Intl.DateTimeFormat(locale, { weekday: "long" }).format;

		this._lang = lang;
		this._week = week;
		this._firstDayOfWeek = getWeekStartByRegion(locale.region || "GB");
		this.getMonthName = (d) => toCapitalized(monthName(d));
		this.getDayName = (d) => toCapitalized(dayName(d));

		// Update month names
		for (const option of this._select?.options || [])
			option.label = this.getMonthName(new Date(0, option.index));

		this.shadowRoot?.querySelectorAll("table").forEach((table) => {
			renderTHead(this, table);
			renderTbody(this, table);
		});
	}
	getDayName(date: number | Date) {
		return `${new Date(date).getDay()}`; // Placeholder function before attributeChangedCallback has run
	}
	getMonthName(date: number | Date) {
		return `${new Date(date).getMonth()}`; // Placeholder function before attributeChangedCallback has run
	}
	handleEvent(event: Event) {
		if (event.type === "click") onClick(this, event);
		if (event.type === "input") onInput(this, event);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "focusin") speak(); // Prepare for screen reader
	}
	// Focused is the date rendered in monthpicker - not using activeElement as we need to persist it when changing month/year
	get focusedDate(): Date {
		return new Date(this._focusedDate); // return clone for immutability
	}
	set focusedDate(value: DateValue) {
		const prev = this.focusedDate;
		const next = new Date(Number.isFinite(+value) ? +value : value); // Allow timestamps as string as well

		if (+prev === +next) return; // Skip if same date, preventing infinite loop
		this._focusedDate = next;
		if (this._table) renderTbody(this, this._table);
	}
	get values(): Date[] {
		const values = attr(this, "data-value")?.split(",") || [];
		return values.map((val) => new Date(val.trim()));
	}
	set values(value: DateValue | DateValue[]) {
		const dates = Array.from([value].flat(), (val) => new Date(val));
		attr(this, "data-value", dates.map(Number).join(", "));
	}
	get disabled(): Date[] {
		const values = attr(this, "data-disabled")?.split(",") || [];
		return values.map((val) => new Date(val.trim()));
	}
	set disabled(value: DateValue | DateValue[]) {
		const dates = Array.from([value].flat(), (val) => new Date(val));
		attr(this, "data-disabled", dates.map(Number).join(", "));
	}
	get firstDayOfWeek() {
		return this._firstDayOfWeek;
	}
}

const toCapitalized = (s: string) =>
	`${s.slice(0, 1).toUpperCase()}${s.slice(1)}`;

const getYMD = (d: Date) =>
	`${d.getFullYear()}-${`0${d.getMonth() + 1}`.slice(-2)}-${`0${d.getDate()}`.slice(-2)}`;

const get = <K extends keyof HTMLElementTagNameMap>(el: HTMLElement, tag: K) =>
	el.shadowRoot?.querySelector(tag) as HTMLElementTagNameMap[K];

// Source: https://stackoverflow.com/a/6117889
const getWeek = (d: Date) => {
	const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // ISO-week starts on Monday
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
};

const renderTHead = (self: UHTMLDatePickerElement, table: HTMLTableElement) => {
	const weekday = new Date(2023, 0, self._firstDayOfWeek % 7); // 2023-01-01 is a Sunday
	for (const cell of table?.tHead?.rows[0].cells || []) {
		const isDay = cell.previousElementSibling;
		const slot = cell.firstElementChild as HTMLSlotElement; // Using <div> for headers as VoiceOver skips aria-label on <slot>
		slot.name = isDay ? ENGLISH_DAYS[weekday.getDay()] : "week";
		slot.textContent = `${isDay ? self.getDayName(weekday)[0] : self._week}`;
		attr(cell, "part", `th ${isDay ? `day ${slot.name}` : slot.name}`);
		weekday.setDate(weekday.getDate() + 1);
	}
};

const renderTbody = (self: UHTMLDatePickerElement, table: HTMLTableElement) => {
	const hasFocus = table.contains(self.shadowRoot?.activeElement as Node);
	const date = self.focusedDate;
	const today = new Date();
	const month = date.getMonth();
	const week = attr(self, "data-week");
	const todayYMD = getYMD(today);
	const focusedYMD = getYMD(date);
	const selectedYMD = self.values.map(getYMD);
	const disabledYMD = self.disabled.map(getYMD);

	// Update caption and announce
	const prev = attr(table, "aria-label");
	const next = `${self.getMonthName(date)}, ${date.getFullYear()}`;
	attr(table, "aria-label", next); // Must be set before moving to first day of week
	if (prev !== next) speak(next);

	// Update select/input
	const select = get(self, "select");
	const input = self.querySelector("input") || get(self, "input");
	if (select) select.value = `${month}`;
	if (input) input.value = `${date.getFullYear()}`;

	// Update table
	let index = 0;
	let weekNumber = 0;
	date.setDate(1 - new Date(date.setDate(1)).getDay() + self.firstDayOfWeek); // Move to first day of week
	for (const row of table.tBodies[0].rows || []) {
		weekNumber = getWeek(date);
		attr(row, "part", `tr week week-${weekNumber}`);
		for (const cell of row.cells) {
			if (!(index % 8)) {
				const slot = cell.firstElementChild as HTMLSlotElement;
				attr(slot, "name", `weeknumber weeknumber-${weekNumber}`);
				attr(cell, "data-text", `${weekNumber}`);
				attr(cell, "data-aria", `${week} ${weekNumber}`);
			} else {
				const btn = cell.firstElementChild as HTMLButtonElement;
				const slots = btn.children;
				const day = date.getDate();
				const dateYMD = getYMD(date);
				const isFocusedDate = dateYMD === focusedYMD;
				const isSameMonth = date.getMonth() === month ? "inside" : "outside";
				const isSelected = selectedYMD.includes(dateYMD);
				const isToday = dateYMD === todayYMD;
				const aria = `${self.getDayName(date)} ${day} ${self.getMonthName(date)}, ${week} ${weekNumber}, ${date.getFullYear()}`;
				const part = `td date ${dateYMD} ${ENGLISH_DAYS[date.getDay()]} ${isToday ? "today" : today < date ? "future" : "past"} ${isSameMonth}${isSelected ? " selected" : ""}`;

				attr(btn.firstElementChild as HTMLSlotElement, "name", dateYMD);
				attr(btn, "aria-current", `${isToday && "date"}`);
				attr(btn, "aria-disabled", `${disabledYMD.includes(dateYMD)}`);
				attr(btn, "aria-pressed", `${isSelected}`);
				attr(btn, "aria-description", aria);
				attr(btn, "data-month", isSameMonth);
				attr(btn, "name", `${date.getTime()}`);
				attr(btn, "part", part);
				attr(btn, "tabindex", `${isFocusedDate ? 0 : -1}`);
				attr(slots[0], "name", `${dateYMD}-before`);
				attr(slots[1], "name", dateYMD);
				attr(slots[2], "name", `${dateYMD}-after`);
				slots[1].textContent = `${day}`;

				if (hasFocus && isFocusedDate) btn.focus(); //  && focus !== btn
				date.setDate(day + 1);
			}
			index++;
		}
	}
};

function onInput(self: UHTMLDatePickerElement, e: Event) {
	const el = e.composedPath()[0] as HTMLInputElement | null;
	const name = el?.slot || el?.name;
	const value = Number(el?.value);
	if (name === "month") self.focusedDate = self.focusedDate.setMonth(value);
	if (name === "year") self.focusedDate = self.focusedDate.setFullYear(value);
}

function onClick(self: UHTMLDatePickerElement, e: Event) {
	const btn = e.composedPath().find((el) => el instanceof HTMLButtonElement);
	const month = self.focusedDate.getMonth();
	const name = btn?.slot || btn?.name;

	// if (btn && self.contains(btn)) self.focusedDate = btn.value;
	if (name === "prev") self.focusedDate = self.focusedDate.setMonth(month - 1);
	if (name === "next") self.focusedDate = self.focusedDate.setMonth(month + 1);
}

function onKeyDown(self: UHTMLDatePickerElement, event: KeyboardEvent) {
	const { key, shiftKey: shift } = event;
	const d = self.focusedDate;
	const firstDayOfWeek = d.getDate() - d.getDay() + self.firstDayOfWeek;
	let next: number | null = null;

	if (!self._table || !event.composedPath().includes(self._table)) return; // Only handle keys when focus is inside date table
	if (key === "ArrowUp") next = d.setDate(d.getDate() - 7); // Prev week
	if (key === "ArrowDown") next = d.setDate(d.getDate() + 7); // Next week
	if (key === "ArrowLeft") next = d.setDate(d.getDate() - 1); // Next day
	if (key === "ArrowRight") next = d.setDate(d.getDate() + 1); // Prev day

	if (key === "PageUp" && !shift) next = d.setMonth(d.getMonth() - 1); // Prev month
	if (key === "PageDown" && !shift) next = d.setMonth(d.getMonth() + 1); // Next month
	if (key === "PageUp" && shift) next = d.setFullYear(d.getFullYear() - 1); // Prev year
	if (key === "PageDown" && shift) next = d.setFullYear(d.getFullYear() + 1); // Next year
	if (key === "Home") next = d.setDate(firstDayOfWeek); // First day of week
	if (key === "End") next = d.setDate(firstDayOfWeek + 7); // Last day of week

	if (typeof next === "number") {
		event.preventDefault();
		self.focusedDate = next;
	}
}

customElements.define("u-datepicker", UHTMLDatePickerElement);

// let IS_POINTER = false; // Used in screen-reader vs pointer-detection
// function onFocusIn(_self: UHTMLDatePickerElement, { target }: Event) {
// 	console.log("onFocusIn");
// 	const _button = (target as Element)?.closest<HTMLButtonElement>("td button");
// 	// if (button) self.focused = button.value;
// }
// if (event.type === "focusin" && !IS_POINTER) onFocusIn(this, event); // Focus-to-move when screen reader is moving focus
// if (event.type === "pointerdown") IS_POINTER = true; // Prevent focus-to-move when touch/mouse interaction
// if (event.type === "pointerup") IS_POINTER = false; // Re-enable focus-to-move

// this._table,
// createElement("div", null, { role: "caption", part: "caption" }),
// createElement(
// 	"div",
// 	`<div role="row"><div role="columnheader" part="weeknumber"><slot name="weeknumber"></slot></div>${Array.from({ length: 7 }, (_, i) => `<div role="columnheader" part="weekday weekday-${i}"><slot name="weekday-${i}"></slot></div>`).join("")}</div>`,
// 	{ role: "rowgroup", part: "weekdays" },
// ),
// createElement(
// 	"div",
// 	`${`<div role="row" part="row"><div role="rowheader" part="weeknumber"></div>${`<div role="cell"><div role="button"><slot name="-"></div></slot></div>`.repeat(7)}</div>`.repeat(7)}`,
// 	{ role: "rowgroup", part: "dates" },
// ),
/*:host(:not([hidden])) { display: grid; grid-template-columns: repeat(8, 1fr); grid-auto-rows: auto; text-align: center }
:host [role="rowgroup"],
:host [role="row"] { display: grid; grid-template-columns: subgrid; grid-column: 1 / -1 }
:host(:not([data-week])) { grid-template-columns: repeat(7, 1fr) } /* 7 columns when week number is hidden *
:host(:not([data-week])) :is([part="day week"], [part="weeknumber"]) { display: none }
:host::before { content: attr(aria-label); position: absolute; margin-top: -2rem }*/
