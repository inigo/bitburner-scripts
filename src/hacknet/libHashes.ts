import { NS } from '@ns'
import * as ports from "libPorts";


function listHashOptions() {
	return [
		{ name: "Sell for Money", emoji: "💰", aliases: ["money", "cash"] }
		, { name: "Sell for Corporation Funds", emoji: "🏢", aliases: ["corporation", "funding", "funds"] }
		, { name: "Reduce Minimum Security", emoji: "🔓", aliases: ["weaken", "seurity"] }
		, { name: "Increase Maximum Money", emoji: "💎", aliases: ["grow", "increasemoney"] }
		, { name: "Improve Studying", emoji: "📚", aliases: ["study", "studying"] }
		, { name: "Improve Gym Training", emoji: "🏋️‍♂️", aliases: ["gym", "workout"] }
		, { name: "Exchange for Corporation Research", emoji: "🧪", aliases: ["research"] }
		, { name: "Exchange for Bladeburner Rank", emoji: "🦄", aliases: ["rank"] }
		, { name: "Exchange for Bladeburner SP", emoji: "🔪", aliases: ["skills", "skill"] }
		, { name: "Generate Coding Contract", emoji: "💻", aliases: ["contract", "contracts"] }
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
	return (ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse) as HashUpgrade[]) ?? [];
}

export async function setHashSpend(ns: NS, targets: HashUpgrade[]): Promise<void> {
	const existingHashSpends = retrieveHashSpends(ns);
	if (targets.length==0 && existingHashSpends.length > 0) { 
		ns.toast("Clearing hash spend target"); 
	} else if (targets!=existingHashSpends) {
		ns.toast("Hash spend target: "+targets.map(t => t.name).join(", "));
	}
	await ports.setPortValue(ns, ports.HASH_SALES_PORT, JSON.stringify(targets));
}

export function spendHashesOnPurchases(ns: NS, purchases: HashUpgrade[]): boolean {
	let purchaseMade = false;
	for (const p of purchases) {
		const wasSuccessful = ns.hacknet.spendHashes(p.name, p.target);
		if (wasSuccessful) { 
			ns.print("Hashes: "+p.name); 
			if (p.name!="Sell for Money") {
				ns.toast("Hashes: "+p.name); 
			}
		}
		purchaseMade = purchaseMade || wasSuccessful;
	}
	return purchaseMade;
}