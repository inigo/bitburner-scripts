import { NS } from '@ns'
import * as ports from "libPorts";


export function listHashOptions(): HashInfo[] {
	return [
		{ name: "Sell for Money", emoji: "💰", aliases: ["money", "cash"] }
		, { name: "Sell for Corporation Funds", emoji: "🏢", aliases: ["funding", "corporation", "funds" ] }
		, { name: "Reduce Minimum Security", emoji: "🔓", aliases: ["weaken", "security"] }
		, { name: "Increase Maximum Money", emoji: "💎", aliases: ["grow", "increasemoney"] }
		, { name: "Improve Studying", emoji: "📚", aliases: ["study", "studying"] }
		, { name: "Improve Gym Training", emoji: "🏋️‍♂️", aliases: ["gym", "workout"] }
		, { name: "Exchange for Corporation Research", emoji: "🧪", aliases: ["research"] }
		, { name: "Exchange for Bladeburner Rank", emoji: "🦄", aliases: ["rank"] }
		, { name: "Exchange for Bladeburner SP", emoji: "🔪", aliases: ["skills", "skill"] }
		, { name: "Generate Coding Contract", emoji: "💻", aliases: ["contract", "contracts"] }
		, { name: "Company Favor", emoji: "👔", aliases: ["company", "favor", "favour"] }
		, { name: "Clear", emoji: "🫗", aliases: ["clear"] }
	]
}

export type HashInfo = { name: string, emoji: string, aliases: string[]}
export type HashUpgrade = { name: string, target?: string };

export function lookupHashIcons(names: string[]): string {
	const exchangeOptions = listHashOptions();
	return exchangeOptions.filter(h => names.includes(h.name) ).map(h => h.emoji).join();
}

export function lookupHashAlias(alias: string): (HashInfo | null) {
	const hashInfo = listHashOptions().find(h => h.aliases.includes(alias.toLowerCase()) || h.name.toLowerCase()===alias.toLowerCase() );
	return hashInfo ?? null;
}

export function retrieveHashSpends(ns: NS): HashUpgrade[] {
	return (ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse) as HashSpendReport)?.targets ?? [];
}
export function retrieveHashNumber(ns: NS): number {
	return (ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse) as HashSpendReport)?.numHashes ?? 0;
}
export function retrieveHashSpendReport(ns: NS): HashSpendReport | null {
	return (ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse) as HashSpendReport);
}

export type HashSpendReport = {
	targets: HashUpgrade[],
	numHashes: number,
	setManually: boolean
}

export async function setHashSpend(ns: NS, targets: HashUpgrade[], setManually = false): Promise<void> {
	const numHashes = ns.hacknet.numHashes();
	const existingHashSpends = retrieveHashSpends(ns);

	const targetsExcludingClear = targets.filter(t => t.name !== "Clear");
	if (targetsExcludingClear.length==0) {
		if (existingHashSpends.length > 0) {
			ns.toast("Clearing hash spend target"); 
		}
	} else if (JSON.stringify(targetsExcludingClear)!=JSON.stringify(existingHashSpends)) {
		ns.toast("Hash spend target: "+targetsExcludingClear.map(t => t.name).join(", "));
	}
	const spendReport: HashSpendReport = {targets: targetsExcludingClear, numHashes: numHashes, setManually: (setManually && targetsExcludingClear.length>0) };
	await ports.setPortValue(ns, ports.HASH_SALES_PORT, JSON.stringify(spendReport));
}

export async function updateHashReport(ns: NS): Promise<void> {
	const spendReport = retrieveHashSpendReport(ns);
	if (spendReport) {
		spendReport.numHashes = ns.hacknet.numHashes();
		await ports.setPortValue(ns, ports.HASH_SALES_PORT, JSON.stringify(spendReport));
	}
}

export async function spendHashesOnPurchases(ns: NS, purchases: HashUpgrade[], maxPurchases = 100): Promise<boolean> {
	let count = 0;
	let purchaseMade = false;

	for (const p of purchases) {
		// Batch server upgrades together, because they are disruptive of hacking
		const isServerUpgrade = p.name == "Reduce Minimum Security" || p.name == "Increase Maximum Money";
		const initialCost = ns.hacknet.hashCost(p.name, isServerUpgrade ? 4 : 1);

		if (initialCost < ns.hacknet.numHashes()) {
			let wasSuccessful = false;
			while (ns.hacknet.spendHashes(p.name, p.target) && count<maxPurchases) {
				ns.print("Hashes: "+p.name);
				wasSuccessful = true;
				count++;
			}
			if (wasSuccessful) {
				if (p.name!="Sell for Money") {
					ns.toast("Hashes: "+p.name);
				}
			}
			purchaseMade = purchaseMade || wasSuccessful;
		} else {
			count++;
		}
		if (count >= maxPurchases) break;
	}
	await updateHashReport(ns);
	return purchaseMade;
}