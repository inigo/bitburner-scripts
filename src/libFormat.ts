/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NS } from '@ns';

/**
 * "Tagged template" for formatting strings - e.g.
 *    fmt(ns)`Current money is £${money} and server memory is ${mem}GB after time ${time}s`
 */
export function fmt(ns: NS): ((template: TemplateStringsArray, ... expr: any[]) => string) {
  const fn = (strings: TemplateStringsArray, ...values: any[]) => {

    const isNumber = (s: string) => ! Number.isNaN( parseFloat(s) );

	const firstString = (strings[0].endsWith("£")) ? strings[0].substring(0, strings[0].length-1) : strings[0];
    const result = [firstString];
    values.forEach(function(value, i) {
      const previousString = strings[i];
      const nextString = strings[i+1];

      const isInteger = (s: string) => /^\d+$/.test(s);
      const moneyFn = (s: number) => ns.nFormat(s, "($0.00a)");
      const memoryFn = (s: number) => ns.nFormat(s * 1024 * 1024 * 1024, "0.00b");
      const numberFn = (s: number) => ns.nFormat(s, "0,0.00");
      const integerFn = (s: number) => ns.nFormat(s, "0,0");
      const timeFn = (s: number) => ns.tFormat(s, true);
      const objFn = (s: any) => ns.sprintf("%4j", s);
      const arrayFn = (s: any[]) => ns.sprintf("%j", s);
      const identifyFn = (s: any) => s

      const formatFn = (isNumber(value) && previousString.endsWith("£")) ? moneyFn :
                        (isNumber(value) && nextString.startsWith("GB")) ? memoryFn :
                        (isNumber(value) && nextString.startsWith("s")) ? timeFn :
                        Array.isArray(value) ? arrayFn :
                        isInteger(value) ? integerFn :
                        (typeof value === "object") ? objFn :
                        (isNumber(value)) ? numberFn :
                        identifyFn;

      let amendedNextString = nextString;
      if (formatFn == memoryFn) { amendedNextString = amendedNextString.substring(2); }
      if (formatFn == timeFn) { amendedNextString = amendedNextString.substring(1); }

      result.push(formatFn(value), amendedNextString);
    });
    return result.join("");
  }
  return fn;
}

export function formatMoney(ns: NS, amount: number): string {
	return ns.nFormat(amount, "($0.00a)");
}

export function formatMemory(ns: NS, amount: number): string {
  return ns.nFormat(amount * 1024 * 1024 * 1024, "0.00b");
}

/**
 * Display a table of data, with header rows and appropriately formatted values. 
 */
export class PrettyTable {
	private rows: (any)[] = [];
	private header: string[];
	private ns: NS;
	constructor(ns: NS, header: string[]) {
		this.ns = ns;
		this.header = header;
	}

	addRow(values: (number | string)[]): void {
		this.rows.push(values);
	}

  /** Render the entire table as a single string, expected to be output separately via tprint. */
	display(): string {
		const headerRow: string = this.header.map((s, i) => this.displayHeaderCell(s, i)).join("")+"|\n";
		const totalWidth: number = this.header.map((_, i) => this.colWidth(i)+3).reduce((a, b) => a + b)-1;
		const fillerRow: string = "|"+"-".repeat(totalWidth)+"|\n";
		const bodyRows = this.rows.map(row => this.displayRow(row)).join("");

		return fillerRow+headerRow+fillerRow+bodyRows+fillerRow;
	}

	/** Display each cell in a row. */
	displayRow(row: any[]): string {
		return row.map((s, i) => this.displayCell(s, i)).join("")+"|\n";
	}

	/** Display a header cell, rendering its value as-is (avoids confusion since the body value formatting is based on the header) */
	displayHeaderCell(value: string, position: number): string {
		const rPadding = this.colWidth(position) - value.length;
		return "| "+value+" ".repeat(rPadding+1);
	}

	/** Display a body cell, calling displayValue to render its value. */
	displayCell(value: string, position: number): string {
		const formatted = this.displayValue(value, position);
		const rPadding = this.colWidth(position) - formatted.length;
		return "| "+formatted+" ".repeat(rPadding+1);
	}

	/** Render the value inside a cell, formatting it appropriately for its type. */
	displayValue(value: any, position: number): string {
		const colType = this.colType(position);
		const isInteger = (s: string) => /^\d+$/.test(s);
		const isNumber = (s: string) => ! Number.isNaN( parseFloat(s) );
		const formatted = (colType == ODataType.Money) ? this.ns.nFormat(value, "($0.00a)") :
							(colType == ODataType.Time) ? this.ns.tFormat(value, false) :
							(colType == ODataType.Memory) ? this.ns.nFormat(value * 1024 * 1024 * 1024, "0.00b") :
							(isInteger(value)) ? this.ns.nFormat(value, "0,0") :
							(isNumber(value)) ? this.ns.nFormat(value, "0,0.00") :
							""+value;
		return formatted;
	}

	/** Column width is the width of the longest value in that column (or the header). */
	colWidth(col: number): number {
		const headerWidth = this.header.at(col)?.length ?? 0;
		const widths = [ headerWidth, ... this.rows.map(row => this.displayValue(row.at(col), col).length) ];
		const maxWidth = Math.max(... widths);
		return maxWidth;
	}

	/** Formatting to apply to the cell value is based on the unit defined in the column header (if any) - e.g. ($) for money. */
	colType(col: number): DataType {
		const headerString: string = (this.header.at(col) as string);
		return (headerString.includes("($)") || headerString.includes("($/s)")) ? ODataType.Money :
				(headerString.includes("(s)")) ? ODataType.Time :
				(headerString.includes("(GB)")) ? ODataType.Memory :
				ODataType.Unspecified;
	}

}

type DataType = typeof ODataType[keyof typeof ODataType];
const ODataType = {
	Unspecified : 0,
	Money : 1,
	Memory : 2,
	Time : 3
} as const;