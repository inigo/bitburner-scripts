/// Upgrade hacknet nodes with the most effective purchases, as long as they pay back in under X minutes (1 hour by default)

import { NS } from '@ns'
import { buyUpgrades, buyCache } from "hacknet/libHacknet";

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	const paybackTimeInMinutes = (ns.args[0] as number) ?? 90;
	const passedInBudget = (ns.args[1] as number) ?? Number.MAX_VALUE;

	const budget = Math.min(ns.getServerMoneyAvailable("home"), passedInBudget);	
	const paybackTimeInMilliseconds = paybackTimeInMinutes * 60 * 1000;

	let remainingCash = budget;
	while (remainingCash > 0) {
		const moneySpent = buyUpgrades(ns, remainingCash, paybackTimeInMilliseconds);
		remainingCash -= moneySpent;
		if (moneySpent == 0) {
			break;
		}
	}

	buyCache(ns);
}