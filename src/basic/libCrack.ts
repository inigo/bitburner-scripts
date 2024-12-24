import { NS } from '@ns'
import {findAllServers} from "@/libServers"; 
import * as ports from "@/libPorts";

export function crackAll(ns: NS): void {
	const availableCracks = listAllCracks(ns).filter(c => c.exists);
	const crackTargets = findAllServers(ns)
					.filter(t => ! ns.hasRootAccess(t))
					.filter(t => ns.getServerNumPortsRequired(t) <= availableCracks.length);
	for (const t of crackTargets) {
		availableCracks.map(c => c.fn(t));
		ns.nuke(t);
	}
	if (crackTargets.length>0) ns.toast(`Cracked ${crackTargets.length} servers`);
}

export function buyCracks(ns: NS): void {
	if (! ns.hasTorRouter() && ns.getServerMoneyAvailable("home") > 200000) {
		ns.singularity.purchaseTor();
	}
	while (attemptToBuyCrack(ns)) {
		ns.print("Checking for more cracks to buy");
	}
}

function attemptToBuyCrack(ns: NS): boolean {
	const availableMoney = ns.getServerMoneyAvailable("home")
	const buyableCracks = listAllCracks(ns).filter(c => ! c.exists)
		.filter(c => c.cost <= availableMoney);
	if (buyableCracks.length > 0) {
		ns.toast("Buying crack "+buyableCracks[0].filename);
		ns.singularity.purchaseProgram(buyableCracks[0].filename);
		return true;
	} else {
		return false;
	}
}

export async function reportCrackStatus(ns: NS): Promise<void> {
	const boughtCracksCount = listAllCracks(ns).filter(c => c.exists).length;
	await ports.setPortValue(ns, ports.CRACKS_BOUGHT_COUNT, boughtCracksCount);
}

function listAllCracks(ns: NS): Crack[] {
	const potentialCracks = [
		{ filename: "BruteSSH.exe", fn: ns.brutessh, cost: 500000 }
		, { filename: "FTPCrack.exe", fn: ns.ftpcrack, cost: 1500000 }
		, { filename: "relaySMTP.exe", fn: ns.relaysmtp, cost: 5000000 }
		, { filename: "HTTPWorm.exe", fn: ns.httpworm, cost: 30000000 }
		, { filename: "SQLInject.exe", fn: ns.sqlinject, cost: 250000000 }
	];
	return potentialCracks.map(c => { return { ...c, exists: ns.fileExists(c.filename, "home")  } })
}

type Crack = { filename: string, cost: number, exists: boolean, fn: ((host: string) => void)}