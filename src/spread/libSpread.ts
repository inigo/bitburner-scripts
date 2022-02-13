import * as ports from "libPorts";
import { NS, Server } from '@ns'

/**
 * Comms functions to send and receive targets to the nodes.
 */

/** Broadcast a new attack target to every node listening. */
export async function sendAttackTarget(ns: NS, targetServer: string): Promise<void> {
	const server: Server = ns.getServer(targetServer);
	const maxMoney = ns.getServerMaxMoney(targetServer);
	const minSecurity = ns.getServerMinSecurityLevel(targetServer);

	const player = ns.getPlayer();
	const hackPercent = ns.formulas.hacking.hackPercent(server, player);

	const cmd: SpreadAttackInstructions = { targetServer: targetServer, maxMoney, minSecurity, hackPercent, server };
	await ports.setPortValue(ns, ports.HACKING_PORT, JSON.stringify(cmd));
}
 
/** Returns the server info for the server to be attacked if one has been sent - otherwise null */
export function receiveAttackTarget(ns: NS): (SpreadAttackInstructions  | null) {
	return ports.checkPort(ns, ports.HACKING_PORT, JSON.parse);
}

type SpreadAttackInstructions = { targetServer: string, maxMoney: number, minSecurity: number, hackPercent: number, server: Server };

/**
 * Basic attack functions - run a single command in a loop. Imported by the various simple attack scripts.
 */

export async function growLoop(ns: NS): Promise<void> {
	// We might as well affect the stock market on grow, because we generally want stocks to go up in value
	await attackLoop(ns, async s => await ns.grow(s, { "stock" : true }));
}

export async function weakenLoop(ns: NS): Promise<void> {
	await attackLoop(ns, async s => await ns.weaken(s, { "stock" : false }));
}


// Hacking script can afford to be more complex - because we're generally not maxing out threads anyway,
// since we only want to hack when there is enough money.
export async function hackLoop(ns: NS): Promise<void> {
	await attackLoop(ns, async s => {
		const targetInfo = receiveAttackTarget(ns) as SpreadAttackInstructions;
		
		const availableThreads = ns.getRunningScript().threads;
		const maxHackThreads = 0.5 / targetInfo.hackPercent;
		const threadsToUse = Math.min(maxHackThreads, availableThreads);

		if (ns.getServerMoneyAvailable(s) < targetInfo.maxMoney*0.95) {
			// This is more efficient than attempting to grow the server in this thread, because
			// the other servers get the target to a hackable state faster than it takes to run grow
			
			// @todo Not necessarily true on tougher targets... maybe record timings to decide?
			return await ns.sleep(300);
		} else {
			return await ns.hack(s, { threads: threadsToUse  });
		}
	});
}


async function attackLoop(ns: NS, attackFn: (s: string) => Promise<number>) {
	while (true) {
		const targetServer = receiveAttackTarget(ns)?.targetServer ?? "joesguns";
		await attackFn(targetServer);
	}
}