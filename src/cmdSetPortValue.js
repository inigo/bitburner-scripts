/// Set the value of a port

import * as ports from "/libPorts.js"; 

/** @param {NS} ns **/
export async function main(ns) {
	const portNumber = ns.args[0];
	const value = ns.args[1] ?? null;

	await ports.setPortValue(ns, portNumber, value);
}