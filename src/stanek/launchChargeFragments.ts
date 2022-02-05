import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	const ramPerThread = ns.getScriptRam("/stanek/chargeFragments.js");
	const totalRam = ns.getServerMaxRam("home");

	const preciseThreads = totalRam / ramPerThread;

	const threads = (preciseThreads > 1000) ? Math.floor(preciseThreads / 1000) * 1000
								: Math.floor(preciseThreads / 100) * 100;
	ns.run("/stanek/chargeFragments.js", threads, ... ns.args);
}