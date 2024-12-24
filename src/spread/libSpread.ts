import * as ports from "@/libPorts";
import { NS, Server } from '@ns'

/**
 * Comms functions to send and receive targets to the nodes.
 */

/** Broadcast a new attack target to every node listening. */
export async function sendAttackTarget(ns: NS, targetServer: string): Promise<void> {
	const targetServerInfo: Server = ns.getServer(targetServer);
	const maxMoney = ns.getServerMaxMoney(targetServer);
	const minSecurity = ns.getServerMinSecurityLevel(targetServer);

	const player = ns.getPlayer();
	const hackPercent = ns.formulas.hacking.hackPercent(targetServerInfo, player);

	const cmd: SpreadAttackInstructions = { targetServer: targetServer, maxMoney, minSecurity, hackPercent, targetServerInfo };
	await ports.setPortValue(ns, ports.HACKING_PORT, JSON.stringify(cmd));
}
 
/** Returns the server info for the server to be attacked if one has been sent - otherwise null */
export function receiveAttackTarget(ns: NS): (SpreadAttackInstructions  | null) {
	return ports.checkPort(ns, ports.HACKING_PORT, JSON.parse);
}

/** Refresh the info stored for the attack target, because things like the player hack level may have changed. */
export async function refreshAttackTarget(ns: NS): Promise<void> {
	const currentAttackTarget = receiveAttackTarget(ns)?.targetServer;
	if (currentAttackTarget!=null) {
		await sendAttackTarget(ns, currentAttackTarget);
	}
}

export type SpreadAttackInstructions = { targetServer: string, maxMoney: number, minSecurity: number, hackPercent: number, targetServerInfo: Server };

/**
 * Basic attack functions - run a single command in a loop. Imported by the various spread attack scripts.
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
		
		// Don't take more than half the money while hacking, to reduce time to grow it back
		const availableThreads = ns.getRunningScript()?.threads ?? 0;
		const maxHackThreads = (targetInfo) ? (0.5 / targetInfo.hackPercent) : Infinity;
		const threadsToUse = Math.min(maxHackThreads, availableThreads);
		// This means we won't hack at all until the target info has been set
		const requiredMoney = (targetInfo) ? targetInfo.maxMoney*0.95 : Infinity;

		// Only hack when the server is almost full of money
		if (ns.getServerMoneyAvailable(s) < requiredMoney) {
			// This is more efficient than attempting to grow the server in this thread, because
			// the other servers get the target to a hackable state faster than it takes to run grow

			// @todo Not necessarily true on tougher targets... maybe record timings to decide?
			await ns.sleep(300);
			return Promise.resolve(0);
		} else {
			return await ns.hack(s, { threads: threadsToUse  });
		}
	});
}


async function attackLoop(ns: NS, attackFn: (s: string) => Promise<number>) {
	// noinspection InfiniteLoopJS
	while (true) {
		const targetServer = receiveAttackTarget(ns)?.targetServer ?? "joesguns";
		await attackFn(targetServer);
	}
}