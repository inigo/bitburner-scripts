/// Buy access to the 4S market data stockmarket API
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	if (ns.getPlayer().has4SDataTixApi) {
		ns.print("Already have access to stock market");
		return;
	}
	const totalMoney = ns.getServerMoneyAvailable("home");
	const dataApiCost = 25000000000 * ns.getBitNodeMultipliers().FourSigmaMarketDataApiCost;
	if (totalMoney > dataApiCost) {
		ns.tprint("INFO Buying stockmarket access");
		if (ns.stock.purchase4SMarketDataTixApi()) {
			ns.scriptKill("/tix/stockTrade.js", "home");
			ns.exec("/tix/stockTrade.js", "home", 1, "live");
		}
	}
}