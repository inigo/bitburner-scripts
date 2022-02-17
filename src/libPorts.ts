/* eslint-disable @typescript-eslint/no-explicit-any */
import { NS } from '@ns';

export const HACKING_PORT = 1; // Sets the target for the "spread" attacks
export const LOGGING_PORT = 2; // A server name or "all" for servers that should log to the terminal
export const SHARE_VALUE_PORT = 3; // Reports the current share value to the UI
export const HASH_SALES_PORT = 4; // What should hashes be sold for?
export const SLEEVE_REPORTS_PORT = 5; // What are the sleeves working on?
export const GANG_CONTROL_PORT = 6; // What action should the gang be doing?
export const GANG_REPORTS_PORT = 7; // How is the gang?
export const ACTIVE_FRAGMENTS_PORT = 8; // A list of the active fragments in Stanek's Gift
export const PAUSE_SHARE_TRADING = 9; // Temporarily pause share trading if there is a message present
export const CRACKS_BOUGHT_COUNT = 10; // Record whether all crack programs (e.g. BruteSSH) have been bought
export const CORP_CONTROL_PORT = 11; // Send instructions and priorities to the corporation control script
export const SLEEVE_CONTROL_PORT = 12; // Send instructions to sleeves
export const CORP_REPORTS_PORT = 13; // What is the status of the corporation?

export const AUGMENT_AND_RESTART = 20; // Install all augmentations and restart

/* If run directly, dump the values of all ports to the terminal. */
export async function main(ns: NS): Promise<void> {
	dumpPorts(ns);
}

/**
 * Set a single value on the specified port.
 */
export async function setPortValue(ns: NS, portNumber: number, value: any = null): Promise<void> {
	ns.clearPort(portNumber);
	if (value!=null) {
		await ns.writePort(portNumber, value);
	}
}

/**
 * Peek at the latest value on the specified port - optionally transforming it e.g. via parseInt or JSON.parse
 * 
 * @param {NS} ns
 * @param {number} portNumber
 * @param {fn} transformFn
 */
export function checkPort(ns: NS, portNumber: number, transformFn = (x: any) => x): any {
    const portValue = ns.peek(portNumber);
	return (portValue=="NULL PORT DATA") ? null : transformFn(portValue);
}

/** Pop the latest value from a port */
export function popPort(ns: NS, portNumber: number, transformFn = (x: any) => x): any {
    const portValue = ns.readPort(portNumber);
	return (portValue=="NULL PORT DATA") ? null : transformFn(portValue);
}

export function dumpPorts(ns: NS): void {
	for (let i = 1; i <= 20; i++) {
		const value = checkPort(ns, i);
		ns.tprint("Port "+i+" has value "+value);
	}
}