import { NS } from '@ns'
import { getOwnedShareValue, sellAllShares, reportShareStatus, pauseTrading } from '@/tix/libTix.js';

/**
 * Make a purchase, selling shares if necessary to finance it.
 */
export async function buyWithShares(ns: NS, cost: number, buyFn: () => boolean): Promise<boolean> {
	const availableMoney = ns.getServerMoneyAvailable("home");
	const allAvailableMoney = availableMoney + getOwnedShareValue(ns);

	if (availableMoney>=cost) {
		return buyFn();
	} else if (availableMoney < cost && allAvailableMoney >= cost) {
		await pauseTrading(ns, 60);
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