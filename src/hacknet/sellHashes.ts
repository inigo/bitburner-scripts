/* eslint-disable @typescript-eslint/no-non-null-assertion */
/// Sell hashes for the specified result - expected to be called regularly automaticaly, but can also be called manually
import {NS} from '@ns'
import {lookupHashAlias, retrieveHashSpends, setHashSpend, spendHashesOnPurchases} from "hacknet/libHashes";

export async function main(ns: NS): Promise<void> {
	ns.disableLog("ALL");

	if (ns.args.length>0) {
		const targetNames = ns.args.map(s => s as string).map(lookupHashAlias).filter(h => h!=null).map(h => h!.name);
		const targets = targetNames.map(t => { return { name: t }; });
		await setHashSpend(ns, targets);
	}

	const exchangeTargets = retrieveHashSpends(ns);
	if (exchangeTargets) {
		while(await spendHashesOnPurchases(ns, exchangeTargets, 20)) {
			// Continuing to buy
		}
	}
}