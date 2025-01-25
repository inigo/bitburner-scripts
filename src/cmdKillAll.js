/// Kill all processes on all servers apart from home

import { findAllServers } from "/libServers.js";

/** @param {NS} ns **/
export async function main(ns) {
	const killTargets = findAllServers(ns).filter(t => t != "home");
	killTargets.forEach(s => ns.killall(s));
	ns.toast("Killed all jobs on "+killTargets.length+" servers", "info");
}