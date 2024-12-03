import { NS } from '@ns'
import {
	FakeStockmarket,
	doTrading,
	setupDatabase,
	replayStoredStockValues,
	FakeWallet,
	FakeWixStockChooser
} from 'tix/libTix';
import { formatMoney } from 'libFormat';

export async function main(ns : NS) : Promise<void> {
    const storeName = "historicalTickStore6"
	ns.tprint(`Using datastore ${storeName} to set up database`);
	const db = await setupDatabase(ns, storeName, 6);

	const stockChooser = new FakeWixStockChooser(ns);

	// CONTEMPLATE SELLING EXISTING THINGS MORE AGGRESSIVELY IF HIGHER VOL THINGS COME UP

	const valuesSourceFn = () => replayStoredStockValues(ns, db, storeName, 0);
	const stockmarket = new FakeStockmarket(ns);
	const wallet = new FakeWallet();

	// Start trading
	ns.tprint("Starting stock market trading - test mode");
	const ticks = await doTrading(ns, valuesSourceFn, stockChooser, stockmarket, wallet);
	
	// Report on profit
	const startingMoney = wallet.getStartingMoney()
	const finalMoney = wallet.getMoney();
	const profit = finalMoney - startingMoney;
	const timeTakenMilliseconds = ticks * 6000;
	const profitRatePerMinute = profit / (timeTakenMilliseconds/60000);

	ns.tprint("Commission spent is "+formatMoney(ns, wallet.getCommissionPaid()));
	ns.tprint("Final money is "+formatMoney(ns, finalMoney)+" after "+ticks+" ticks (started with "+formatMoney(ns, startingMoney)+")");
	ns.tprint("Gives profit of "+formatMoney(ns, profit) + " in "+ns.tFormat(timeTakenMilliseconds)+" which is "+formatMoney(ns, profitRatePerMinute)+"/min");
}