/* eslint-disable @typescript-eslint/no-non-null-assertion */
/// Sell hashes for the specified result - expected to be called regularly
import { NS } from '@ns'
import { spendHashesOnPurchases, lookupHashAlias, setHashSpend } from "hacknet/libHashes";
import * as ports from "libPorts";

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	if (ns.args.length>0) {
		const targetNames = ns.args.map(s => s as string).map(lookupHashAlias).filter(h => h!=null).map(h => h!.name);
		const targets = targetNames.map(t => { return { name: t }; });
		await setHashSpend(ns, targets);
	}

	const exchangeTargets = ports.checkPort(ns, ports.HASH_SALES_PORT, JSON.parse);
	if (exchangeTargets) {
		while(spendHashesOnPurchases(ns, exchangeTargets, 20)) {
			// Continuing to buy
		}
	}
}