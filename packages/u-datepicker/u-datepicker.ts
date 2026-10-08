export type { UHTMLOptionElement } from "../u-datalist/u-option";

import { getWeekStartByRegion } from "./week-start";
import "../u-datalist/u-option";
import {
	attachStyle,
	attr,
	customElements,
	getComposedPath,
	getFocusedElement,
	off,
	on,
	tag,
	UHTMLElement,
} from "../utils";

declare global {
	interface HTMLElementTagNameMap {
		"u-datepicker": UHTMLDatePickerElement;
	}
}
// TODO: Announce button change also on year
// TODO: Add year to label if changing year
// TODO: Disabled - create function on attributeChanged, and support weekdays
// TODO: Find focus from selected (if not provided), and fallback to today if none provided
// TODO: change month when screen reader focusing a date outside month (buggy now)
// TODO: u-datepicker.value/.ymd? readOnly
// TODO: Event: datepickerFocused
// TODO: Event: datepickerChange
// TODO: Range + maxRange + minRange
// TODO: Months?
// TODO: Today override

type DateValue = Date | number | string;
type DisabledFn = (date: Date) => boolean;
type Weekday = (typeof WEEKDAYS)[number];
const EVENTS = "click input keydown";
const EVENTS_SHADOW = "slotchange";
const FALSE = "false";
const WEEKDAYS = ["sun", "mon", "tue", "wed", "tue", "fri", "sat"] as const;

const ATTRS = {
	disabled: "data-disabled",
	focused: "data-focused",
	multiple: "data-multiple",
	selected: "data-selected",
	locale: "data-locale",
	weeknumbers: "data-week-numbers",
	weekstart: "data-week-start",
} as const;

const TEXTS = {
	month: "Month",
	next: "Next",
	prev: "Previous",
	today: "Today",
	week: "Week",
	year: "Year",
};

/**
 * The `<u-datepicker>` HTML element contains lets you pick a date from a grid.
 * No MDN reference available.
 */
export class UHTMLDatePickerElement extends UHTMLElement {
	// Using underscore instead of private fields for backwards compatibility
	_disabled = () => false;
	_dayNameLong?: (d: Date) => string;
	_focused = new Date();
	_input?: HTMLInputElement;
	_isInternalSlotChange = false;
	_select?: HTMLSelectElement;
	_table?: HTMLTableElement;
	_texts = { ...TEXTS };
	_weekStart = 0;

	// Allow user set disabled property function
	isDateDisabled?: (date: Date) => boolean;
	dayContent?: (date: Date) => string;

	// Using ES2015 syntax for backwards compatibility
	static get observedAttributes() {
		return [
			"lang",
			...Object.values(ATTRS),
			...Object.keys(TEXTS).map((key) => `data-sr-${key}`),
		];
	}
	constructor() {
		super();
		const shadow = this.shadowRoot || this.attachShadow({ mode: "open" });

		shadow.appendChild(
			tag("slot", { part: "controls", name: "controls" }),
		).innerHTML =
			`<slot name="month"><select aria-label="Måned" name="month" part="month">${Array.from({ length: 12 }, (_, i) => `<option value="${i}"></option>`).join("")}</select></slot>
		<slot name="year"><input name="year" part="year" type="number" /></slot>
		<slot name="prev"><button name="prev" part="prev" type="button"><slot name="prev-icon">&larr;</slot></button></slot>
		<slot name="today"><button name="today" part="today" type="button"><slot name="today-icon">&#9675;</slot></button></slot>
		<slot name="next"><button name="next" part="next" type="button"><slot name="next-icon">&rarr;</slot></button></slot>`;

		shadow.appendChild(tag("table", { part: "table" })).innerHTML =
			`<thead part="thead"><tr part="tr weekdays"><th scope="col"><slot name="-"></slot></th>${`<th scope="col"><slot name="-"></slot></th>`.repeat(7)}</tr></thead>
		<tbody part="tbody">${`<tr role="row"><th part="th" scope="row"><slot name="-"></slot></th>${`<td part="td"><button type="button"><slot name="-"></slot></button></td>`.repeat(7)}</tr>`.repeat(6)}</tbody>`;

		attachStyle(
			this,
			`:host(:not([hidden])) { display: block; gap: 1em; text-align: center }
			:host(:not([${ATTRS.weeknumbers}])) th:first-child { display: none }
			slot[name="controls"] { display: flex; align-items: center; gap: inherit; margin-bottom: 1em }
			slot[name="year"] { display: block; margin-right: auto }
			button, input, select, th, td { box-sizing: border-box; field-sizing: content; font: inherit; background: none; color: inherit; padding: 0; margin: 0; border: 0; text-align: inherit }
			
			th { font-weight: bold }
			th, select { text-transform: capitalize }
			table { border-collapse: collapse; border-spacing: 0; table-layout: fixed; width: 100% }
			td button { width: 100% }
			button[part*="day-other-month"] { color: GrayText }
			button[aria-disabled="true"] { color: GrayText; text-decoration: line-through }
			button[aria-current="date"] { text-decoration: underline }
			button:enabled { cursor: pointer }`,
		);
	}
	connectedCallback() {
		on(this, EVENTS, this);
		on(this.shadowRoot as ShadowRoot, EVENTS_SHADOW, this);
		onSlotChange(this);
		this.attributeChangedCallback(); // Ensure attributeChangedCallback is called on connect
	}
	disconnectedCallback() {
		off(this, EVENTS, this);
		off(this.shadowRoot as ShadowRoot, EVENTS_SHADOW, this);
		this._input = this._table = this._select = undefined;
	}
	attributeChangedCallback(prop?: string, _?: string, val?: string) {
		const text = prop?.split("data-sr-")[1] as keyof typeof TEXTS;
		if (TEXTS[text]) this._texts[text] = val || TEXTS[text]; // Cache text attributes for performance
		if (!this._table) return; // Wait rendering until contected

		const locale = new Intl.Locale(
			attr(this, ATTRS.locale) || getComposedPath(this, getLang) || "en",
		);

		this._isInternalSlotChange = true; // Prevent onSlotChange events doe to render
		this._weekStart = getWeekStartByRegion(locale.region || "GB");
		this.getMonthName = new Intl.DateTimeFormat(locale, {
			month: "long",
		}).format;
		this.getDayName = new Intl.DateTimeFormat(locale, {
			weekday: "short",
		}).format;
		this._dayNameLong = new Intl.DateTimeFormat(locale, {
			weekday: "long",
		}).format;

		// Update month names
		for (const option of this._select?.options || [])
			option.label = this.getMonthName(new Date(0, option.index));

		const weekday = new Date(2023, 0, this.weekStartIndex); // 2023-01-01 is a Sunday
		for (const cell of this._table?.tHead?.rows[0].cells || []) {
			const isDay = cell.previousElementSibling;
			const slot = cell.firstElementChild as HTMLSlotElement; // Using <div> for headers as VoiceOver skips aria-label on <slot>
			const name = `${isDay ? `weekday-${WEEKDAYS[weekday.getDay()]}` : "weeknumber-heading"}`;
			attr(cell, "part", `th ${isDay ? `weekday ${name}` : name}`);
			attr(slot, "name", name);
			slot.textContent = `${isDay ? this.getDayName(weekday).replace(/\.$/, "") : ""}`;
			weekday.setDate(weekday.getDate() + 1);
		}

		renderTbody(this);
		setTimeout(() => (this._isInternalSlotChange = false), 0); // Reset after slotchange event has run
	}
	getDayName(value: number | Date): string {
		return WEEKDAYS[toDate(value).getDay()]; // Placeholder function before attributeChangedCallback has run
	}
	getMonthName(value: number | Date) {
		return `${toDate(value).getMonth()}`; // Placeholder function before attributeChangedCallback has run
	}
	handleEvent(event: Event) {
		if (event.type === "click") onClick(this, event);
		if (event.type === "input") onInput(this, event);
		if (event.type === "keydown") onKeyDown(this, event as KeyboardEvent);
		if (event.type === "slotchange") onSlotChange(this);
	}
	// Focused is the date rendered in monthpicker - not using activeElement as we need to persist it when changing month/year
	get focused(): Date {
		return new Date(this._focused); // return clone for immutability
	}
	set focused(value: DateValue) {
		const prev = this.focused;
		const next = toDate(value); // Allow timestamps as string as well

		if (+prev === +next) return; // Skip if same date, preventing infinite loop
		this._focused = next;
		renderTbody(this);
	}
	get selected(): Date[] {
		return parseDateAttributes(this, ATTRS.selected);
	}
	set selected(value: DateValue | DateValue[]) {
		attr(this, ATTRS.selected, toDates(value).map(getYMD).join(" "));
	}
	// TODO: Support days, and both isDateDisabled, future, past, date-, date+ and attribute
	get disabled(): DisabledFn {
		if (this.isDateDisabled) return this.isDateDisabled;
		const dates = parseDateAttributes(this, ATTRS.disabled);
		const ymds = new Set(...dates.map(getYMD)); // Fast way to check if same day

		return dates?.length ? (date: Date) => ymds.has(getYMD(date)) : () => false;
	}
	set disabled(value: DisabledFn | string | false | undefined | null) {
		const isFn = typeof value === "function";
		this.isDateDisabled = isFn ? value : undefined;
		attr(this, ATTRS.disabled, (!isFn && value) || null);
	}
	get weekStartIndex(): number {
		const day = attr(this, ATTRS.weekstart);
		const index = day ? WEEKDAYS.indexOf(day as Weekday) : -1;
		return index < 0 || index > 6 ? this._weekStart : index;
	}
	get weekStart(): Weekday {
		return WEEKDAYS[this.weekStartIndex];
	}
	set weekStart(value: Weekday | null) {
		attr(this, ATTRS.weekstart, value);
	}
	get weekNumbers(): boolean {
		return (attr(this, ATTRS.weeknumbers) ?? FALSE) !== FALSE; // Allow data-multiple="false" to be more React friendly
	}
	set weekNumbers(value: boolean) {
		attr(this, ATTRS.weeknumbers, value ? "" : null);
	}
}

const getLang = (el: Node) => el.nodeType === 1 && (el as HTMLElement).lang;
const toDates = (val: DateValue | DateValue[]) => [val].flat().map(toDate);
const toDate = (val: DateValue): Date => {
	if (val instanceof Date) return val;
	if (typeof val === "number") return new Date(val);
	const num = +val;
	return new Date(Number.isFinite(num) ? num : val);
};

const getYMD = (d: Date) =>
	`${d.getFullYear()}-${`0${d.getMonth() + 1}`.slice(-2)}-${`0${d.getDate()}`.slice(-2)}`;

const queryEl = <K extends keyof HTMLElementTagNameMap>(
	el: HTMLElement,
	tag: K,
) =>
	(el.querySelector(tag) ||
		el.shadowRoot?.querySelector(tag)) as HTMLElementTagNameMap[K];

// Source: https://stackoverflow.com/a/6117889
const getWeek = (d: Date) => {
	const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // ISO-week starts on Monday
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
};

const parseDateAttributes = (self: Element, name: string): Date[] => {
	const dates: Date[] = [];
	for (const d of attr(self, name)?.split(/\s+/) || [])
		if (d) dates.push(toDate(d));
	return dates;
};

const renderTbody = (self: UHTMLDatePickerElement) => {
	if (!self._table) return;
	const table = self._table;
	const focused = getFocusedElement(table);
	const hasFocus = table.contains(focused);
	const date = self.focused;
	const today = new Date();
	const month = date.getMonth();
	const todayYMD = getYMD(today);
	const focusedYMD = getYMD(date);
	const selectedYMD = self.selected.map(getYMD);
	const getDayName = self._dayNameLong || self.getDayName;

	// Update caption and announce
	// const prev = attr(table, "aria-label");
	const next = `${self.getMonthName(date)}, ${date.getFullYear()}`;
	attr(table, "aria-label", next); // Must be set before moving to first day of week
	// if (prev !== next) speak(next); // TODO EIRIK

	// Update select/input
	if (self._select) self._select.value = `${month}`;
	if (self._input) self._input.value = `${date.getFullYear()}`;

	// Update table
	let index = 0;
	let weeknumber = 0;
	date.setDate(1 - new Date(date.setDate(1)).getDay() + self.weekStartIndex); // Move to first day of week
	for (const row of table.tBodies[0].rows || []) {
		weeknumber = getWeek(date);
		attr(row, "part", `tr week week-${weeknumber}`);
		for (const cell of row.cells) {
			if (!(index % 8)) {
				const slot = cell.firstElementChild as HTMLSlotElement;
				attr(slot, "name", `weeknumber weeknumber-${weeknumber}`);
				attr(cell, "part", `th ${slot.name}`);
				attr(cell, "aria-label", `${self._texts.week} ${weeknumber}`);
				slot.textContent = `${weeknumber}`;
			} else {
				const btn = cell.firstElementChild as HTMLButtonElement;
				const slot = btn.firstElementChild as HTMLSlotElement;
				const day = date.getDate();
				const ymd = getYMD(date);
				const weekday = date.getDay();
				const isFocusedDate = ymd === focusedYMD;
				const isSelected = selectedYMD.includes(ymd);
				const isToday = ymd === todayYMD;
				const aria = `${getDayName(date)} ${day} ${self.getMonthName(date)}, ${date.getFullYear()}`;
				const part = `day day-${ymd} day-${WEEKDAYS[weekday]} day-${weekday % 6 ? "workday" : "weekend"} day-${isToday ? "today" : today < date ? "future" : "past"} day-${date.getMonth() === month ? "same" : "other"}-month day-${isSelected ? "selected" : "unselected"}`;

				attr(btn.firstElementChild as HTMLSlotElement, "name", ymd);
				attr(btn, "aria-current", `${isToday && "date"}`);
				attr(btn, "aria-description", aria);
				attr(btn, "aria-disabled", `${self.disabled(date)}`);
				attr(btn, "aria-pressed", `${isSelected}`);
				attr(btn, "name", "date");
				attr(btn, "part", part);
				attr(btn, "tabindex", `${isFocusedDate ? 0 : -1}`);
				attr(btn, "value", `${date.getTime()}`);
				attr(slot, "name", ymd);
				slot.textContent = `${day}`;

				if (hasFocus && isFocusedDate) btn.focus();
				date.setDate(day + 1);
			}
			index++;
		}
	}
};

const onSlotChange = (self: UHTMLDatePickerElement) => {
	if (!self._isInternalSlotChange) {
		self._input = queryEl(self, "input");
		self._select = queryEl(self, "select");
		self._table = queryEl(self, "table");
	}
};

const onInput = (self: UHTMLDatePickerElement, e: Event) => {
	const el = e.composedPath()[0] as HTMLInputElement | null;
	const name = el?.slot || el?.name;
	const value = Number(el?.value);
	if (name === "month") self.focused = self.focused.setMonth(value);
	if (name === "year") self.focused = self.focused.setFullYear(value);
};

const onClick = (self: UHTMLDatePickerElement, e: Event) => {
	const btn = e.composedPath().find((el) => el instanceof HTMLButtonElement);
	const month = self.focused.getMonth();
	const name = btn?.slot || btn?.name;

	console.log(ATTRS.multiple); // TODO

	if (name === "date") self.focused = btn?.value || self.focused; // TODO Move focus AND set selected?
	if (name === "prev") self.focused = self.focused.setMonth(month - 1);
	if (name === "next") self.focused = self.focused.setMonth(month + 1);
};

const onKeyDown = (self: UHTMLDatePickerElement, event: KeyboardEvent) => {
	const { key, shiftKey: shift } = event;
	const d = self.focused;
	const firstDayOfWeek = d.getDate() - d.getDay() + self.weekStartIndex;
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
		self.focused = next;
	}
};

customElements.define("u-datepicker", UHTMLDatePickerElement);
