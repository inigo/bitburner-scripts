import { findCrackedServers }  from "libServers";
import { NS } from '@ns'
import { receiveAttackTarget, sendAttackTarget } from "spread/libSpread";

/// Spread hack, grow and weaken scripts across all servers. Pass "weaken" as an argument to only set weaken scripts.

const pauseBetweenLaunches = 1000;

export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
	const isWeakenOnly = ns.args[0]=="weaken";
	const shouldKill = ns.args[0]=="kill" || ns.args[1]=="kill";

	if (receiveAttackTarget(ns)==null) {
		ns.print("No attack target already set, so defaulting to joesguns");
		await sendAttackTarget(ns, "joesguns");
	}

	await copyFiles(ns, findCrackedServers(ns));

    if (shouldKill) { 
		ns.print("Killing existing attacks");
		killExistingAttacks(ns); 
	}
	await launchAttacks(ns, isWeakenOnly);
}

export function autocomplete(): string[] {
	return ["attack", "weaken", "kill"];
}

async function launchAttacks(ns: NS, isWeakenOnly: boolean): Promise<void> {
	const hackRam = ns.getScriptRam("/spread/simpleHack.js");
	const growRam = ns.getScriptRam("/spread/simpleGrow.js");
	const weakenRam = ns.getScriptRam("/spread/simpleWeaken.js");
	const smallestScriptMem = Math.min(hackRam, growRam, weakenRam);

	if (getServersWithFreeMemory(ns, smallestScriptMem) > 3) {
		ns.print("Killing existing attacks because number of available servers changed significantly - probably acquired a new crack");
		killExistingAttacks(ns);
	}

	const startHackCount = serversHacking(ns);
	const targetHackCount = 1;
	const weakenGrowRatio = 4 / 3.2; // Need more weaken threads than grow threads

	let hackCount = startHackCount;
	let growThreads = 0;
	let weakenThreads = 0;
	const serversWithFreeMemory = getServersWithFreeMemory(ns, smallestScriptMem);

	for (const s of serversWithFreeMemory) {										
		await ns.sleep(pauseBetweenLaunches);

		const freeMemory = ns.getServerMaxRam(s) - ns.getServerUsedRam(s);
		if (hackCount < targetHackCount) {
			ns.print("Launching hack on "+s);
			const threadsToLaunch = Math.floor(freeMemory / hackRam);
			ns.exec("/spread/simpleHack.js", s, threadsToLaunch, uniqueId());
			hackCount++;
			continue;			
		}

		if (growThreads < weakenThreads * weakenGrowRatio && !isWeakenOnly) {
			ns.print("Launching grow on "+s);
			const threadsToLaunch = Math.floor(freeMemory / growRam);
			if (threadsToLaunch<1) { continue; }
			ns.exec("/spread/simpleGrow.js", s, threadsToLaunch, uniqueId());
			growThreads += threadsToLaunch;
		} else {
			ns.print("Launching weaken on "+s);
			const threadsToLaunch = Math.floor(freeMemory / weakenRam);
			if (threadsToLaunch<1) { continue; }
			ns.exec("/spread/simpleWeaken.js", s, threadsToLaunch, uniqueId());
			weakenThreads += threadsToLaunch;
		}
	}
	ns.print("Spread attackers set up - use setTarget to change its target");
}

function getServersWithFreeMemory(ns: NS, smallestScriptMem: number): string[] {
	return findCrackedServers(ns)
			.filter(s => ns.getServerMaxRam(s) > 0 )
			.filter(s => ns.getServerMaxRam(s) - ns.getServerUsedRam(s)	>= smallestScriptMem)
			.sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b))
			.reverse();	
}


async function copyFiles(ns: NS, servers: string[]): Promise<void> {
	for (const s of servers) {
		const filesToCopy = [ "/spread/simpleHack.js", "/spread/simpleGrow.js", "/spread/simpleWeaken.js", "/spread/libSpread.js", "libPorts.js" ]; 
		await ns.scp(filesToCopy, "home", s);			
	}	
}

function serversHacking(ns: NS) {
	return findCrackedServers(ns).filter(s => ns.ps(s).some(job => job.filename.includes("simpleHack"))).length;
}


function killExistingAttacks(ns: NS): void {
	findCrackedServers(ns)
		.filter(s => ns.getServerMaxRam(s) > 0 )
		.forEach(s => ns.killall(s));
}

function uniqueId(): string {
	return "spread_"+Math.random()+"_"+Math.random(); 
}
