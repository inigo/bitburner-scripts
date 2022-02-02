import { StockChooser, WixStockChooser, FakeStockmarket, RealStockmarket, doTrading, setupDatabase, replayStoredStockValues, realStockValues, OngoingStockPredictor, SmoothingStockPredictor, RealWallet, FakeWallet } from 'tix/libTix';
import { formatMoney } from 'libFormat';
import { NS } from '@ns';

export async function main(ns: NS): Promise<void> {
	ns.disableLog("sleep");
	ns.disableLog("getServerMoneyAvailable");

	const isLive = (ns.args[0] as string) == "live";

	if (! ns.getPlayer().hasTixApiAccess) {
		ns.tprint("Must have TIX API access before this script will work");
		ns.exit();
	}

	// Set up

	const storeName = "historicalTickStore6"
	// ns.print(`Using datastore ${storeName} to set up database`);
	const db = await setupDatabase(ns, storeName, 6);

	const symbols = ns.stock.getSymbols();
	const predictors = symbols.map(s => new SmoothingStockPredictor(ns, new OngoingStockPredictor(s, 90), 25));

	const stockChooser = (ns.getPlayer().has4SDataTixApi && isLive) ? new WixStockChooser(ns) : new StockChooser(ns, predictors);

	const realValuesSourceFn = () => realStockValues(ns, 0);
	const replayValuesSourceFn = () => replayStoredStockValues(ns, db, storeName, 0);
	const valuesSourceFn = isLive ? realValuesSourceFn : replayValuesSourceFn;
	
	const realStockmarket = new RealStockmarket(ns);
	const fakeStockmarket = new FakeStockmarket(ns);
	const stockmarket = isLive ? realStockmarket : fakeStockmarket;

	const realWallet = new RealWallet(ns);
	const fakeWallet = new FakeWallet();
	const wallet = isLive ? realWallet : fakeWallet;

	// Start trading
	const startTime = new Date().getTime();
	ns.tprint("Starting stock market trading - " + (isLive ? "LIVE MODE!" : "test mode")+" at "+startTime);
	await doTrading(ns, valuesSourceFn, stockChooser, stockmarket, wallet);
	
	// Report on profit
	const startingMoney = wallet.getStartingMoney()
	const finalMoney = wallet.getMoney();
	const endTime = new Date().getTime();
	const profit = finalMoney - startingMoney;
	const timeTaken = endTime - startTime;
	const profitRate = profit / (timeTaken/60000);
	ns.tprint("Commission spent is "+formatMoney(ns, wallet.getCommissionPaid()));
	ns.tprint("Final money is "+formatMoney(ns, finalMoney)+" at "+endTime+" (started with "+formatMoney(ns, startingMoney)+")");
	ns.tprint("Gives profit of "+formatMoney(ns, profit) + " in "+ns.tFormat(timeTaken)+" which is "+formatMoney(ns, profitRate)+"/min");
}