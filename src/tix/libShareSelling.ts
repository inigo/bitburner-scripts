import { NS } from '@ns'
import { getOwnedShareValue, sellAllShares, reportShareStatus } from '/tix/libTix.js';

/**
 * Make a purchase, selling shares if necessary to finance it.
 */
export async function buyWithShares(ns: NS, cost: number, buyFn: () => boolean): Promise<boolean> {
	const availableMoney = ns.getServerMoneyAvailable("home");
	const allAvailableMoney = availableMoney + getOwnedShareValue(ns);

	if (availableMoney>=cost) {
		return buyFn();
	} else if (availableMoney < cost && allAvailableMoney >= cost) {
		sellAllShares(ns);
        await reportShareStatus(ns);
		return buyFn();
	} else {
		return false;
	}
}

export function getTotalMoney(ns: NS): number {
	return ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
}