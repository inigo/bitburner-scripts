/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { openDB, IDBPDatabase } from 'idb/entry';
import { formatMoney } from 'libFormat';
import * as ports from "libPorts";
import { NS } from '@ns';
import { ShareStatus } from 'tix/libShareInfo';

// IDB is from https://github.com/jakearchibald/idb
// Imported files are from https://cdn.jsdelivr.net/npm/idb@7.0.0/build/
// with mild editing to add export before variables imports + exports 

const dbName = "stocktest";

export async function* realStockValues(ns: NS, limit = 0): AsyncGenerator<Tick[], number, undefined> {
	const symbols = ns.stock.getSymbols();
	let previousTicks: Tick[] = [];
	let i = 0; 
	while(true) {
		const datetime = new Date().getTime();
		const ticks = symbols.map(s => getTick(ns, s));

		if (JSON.stringify(ticks) != JSON.stringify(previousTicks)) {
			ns.print("Stock values have changed - returning them");
			const ticksWithDates = ticks.map(t => { return { ... t, datetime } });
			yield ticksWithDates;
			previousTicks = ticks;

			if (limit>0 && i++ > limit) {
				ns.print("Reached limit - stopping");
				break;
			}
		}
		
		// Stock market updates approximately every 6s, but is faster when catching up
		// So, check it more frequently, but ignore dupe entries
		await ns.sleep(1000);
	}
	return 0;
}

export function getTick(ns: NS, sym: string): Tick {
	const askPrice = ns.stock.getAskPrice(sym);
	const bidPrice = ns.stock.getBidPrice(sym);
	return { sym, askPrice, bidPrice };
}
type Tick = { sym: string, askPrice: number, bidPrice: number };


// -------------------


export async function setupDatabase(ns: NS, storeName: string, version: number): Promise<DB> {
	const db = await openDB(dbName, version, {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		upgrade(newdb, oldVersion, newVersion, transaction) {
			newdb.createObjectStore(storeName, { keyPath: ['datetime', 'sym'] } );
			// https://stackoverflow.com/questions/33852508/how-to-create-an-indexeddb-composite-key
		}
	});
	return db;
}

type DB = IDBPDatabase;

export async function recordStockValues(ns: NS, db: DB, storeName: string, limit = 0): Promise<void> {
	for await (const ticksWithDates of realStockValues(ns, limit)) {
		for (const tickWithDate of ticksWithDates) {
			await db.put(storeName, tickWithDate);
		}
	}
}

// Return an array of ticks retrieved from the database
export async function* replayStoredStockValues(ns: NS, db: DB, storeName: string, limit = 100): AsyncGenerator<Tick[], number, undefined> {
	const symbolsCount = ns.stock.getSymbols().length;
	let cursor = await db.transaction(storeName).store.openCursor();

	outerLoop: {
		let count = 0; 
		while (cursor) {
			const ticks = [];
			for (let i = 0; i < symbolsCount; i++) {
				if (cursor==null) break outerLoop;
				const tick = cursor.value;
				ticks.push(tick)
				cursor = await cursor.continue();	
			}
			yield ticks;

			if (limit>0 && count++ > limit) {
				break;
			}
		}
	}
	return 0;
}


// -------------------

abstract class IStockChooser { 
	abstract recordValue(tick: Tick): void;
	abstract getBestStocks(): string[];
	abstract getGoodStocks(): string[];
 } 

export class StockChooser extends IStockChooser {
	ns: NS;
	predictors: IPredictor[];
	constructor(ns: NS, predictors: IPredictor[]) {	
		super();
		this.predictors = predictors;
		this.ns = ns;
	}
	recordValue(tick: Tick): void {
		this.predictors.forEach(p => { if (p.getSym()==tick.sym) { p.recordValue(tick) } });
	}
	getBestStocks(): string[] {
		return this.predictors
						.filter(p => p.confidence() > 0.85)
						.sort((a, b) => a.confidence() - b.confidence() )
						.map(p => p.getSym());
	}
	getGoodStocks(): string[] {
		return this.predictors
						.filter(p => p.confidence() > 0.60)
						.sort((a, b) => a.confidence() - b.confidence() )
						.map(p => p.getSym());
	}
}

export class WixStockChooser extends IStockChooser {
	ns: NS;
	constructor(ns: NS) {
		super();
		this.ns = ns;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	recordValue(tick: Tick): void { 
		// Does nothing
	}
	getBestStocks(): string[] {
		return this.ns.stock.getSymbols().filter(s => this.ns.stock.getForecast(s) > 0.63)
							.sort((a, b) => this.ns.stock.getForecast(a) - this.ns.stock.getForecast(b) )
	}
	getGoodStocks(): string[] {
		return this.ns.stock.getSymbols().filter(s => this.ns.stock.getForecast(s) > 0.60)
							.sort((a, b) => this.ns.stock.getForecast(a) - this.ns.stock.getForecast(b) )
	}
}

// -------------------

interface IPredictor {
	describe(): string;
	getSym(): string;
	recordValue(tick: Tick): void;
	confidence(): number;
}

export class OngoingStockPredictor implements IPredictor {
	#boundedQueue: BoundedQueue<Tick>;
	sym: string;
	historyLengthToKeep: number;
	minimumRequiredHistory: number;
	constructor(sym: string, historyLengthToKeep = 90, minimumRequiredHistory = 45) {
		this.sym = sym;
		this.historyLengthToKeep = historyLengthToKeep;
		this.minimumRequiredHistory = minimumRequiredHistory;
		if (minimumRequiredHistory>historyLengthToKeep) { throw `Minimum required history is less than history length to keep`; }
		this.#boundedQueue = new BoundedQueue<Tick>(historyLengthToKeep);
	}
	describe(): string {  return `OngoingStockPredictor for ${this.sym} with history of ${this.historyLengthToKeep}`; }
	getSym(): string { return this.sym; }
	recordValue(tick: Tick): void { this.#boundedQueue.add(tick); }

	confidence(): number {
		if (this.#boundedQueue.length() < this.minimumRequiredHistory) { return 0.5; }

		let previousPrice = 0;
		let upCount = 3; // Not starting with 0 to avoid ridiculous values and to smooth numbers
		let downCount = 3;
		this.#boundedQueue.map((f: Tick) => {
			const bidPrice = f.bidPrice;
			if (bidPrice > previousPrice) { upCount++; } else { downCount++; }
			previousPrice = bidPrice;			
		});
		return 0.5 * (upCount / downCount);
	}
	
}


export class SmoothingStockPredictor implements IPredictor {
	#boundedQueue: BoundedQueue<number>;
	ns: NS;
	delegateStockPredictor: IPredictor;
	minValues: number;
	recencyWeighting: number;
	constructor(ns: NS, delegateStockPredictor: IPredictor, smoothPeriod = 10, minValues = 1, recencyWeighting = 4) {
		this.ns = ns;
		this.delegateStockPredictor = delegateStockPredictor;
		this.#boundedQueue = new BoundedQueue<number>(smoothPeriod);
		this.minValues = minValues;
		this.recencyWeighting = recencyWeighting;
	}

	describe(): string { return `SmoothingStockPredictor wrapping ${this.delegateStockPredictor.describe()}`; }
	getSym(): string { return this.delegateStockPredictor.getSym(); }
	recordValue(tick: Tick): void { 
		this.delegateStockPredictor.recordValue(tick); 
		const latestValue = this.delegateStockPredictor.confidence();
		this.#boundedQueue.add(latestValue);
	}

	confidence(): number {
		if (this.#boundedQueue.length()<this.minValues) { return 0.5; }

		const allValues = [ ... this.#boundedQueue.allValues() ];

		const weights = this.range(allValues.length).map(i => Math.pow(this.recencyWeighting, i));
		const weightedAverage = this.weightedAverage(allValues, weights);
		return weightedAverage;
	}

	weightedAverage(nums: number[], weights: number[]): number {
		const [sum, weightSum] = weights.reduce( (acc, w, i) => {
			acc[0] = acc[0] + nums[i] * w;
			acc[1] = acc[1] + w;
			return acc;
		}, [0, 0] );
		return sum / weightSum;
	}

	range(size: number, startAt = 0): number[] { return [...Array(size).keys()].map(i => i + startAt); }
} 


// -------------------


class BoundedQueue<T> {
	#queue: T[] = [];
	queueSize: number;
	constructor(queueSize: number) {
		this.queueSize = queueSize;
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	add(value: T): BoundedQueue<T> {
		this.#queue.push(value);
		if (this.#queue.length > this.queueSize) this.#queue.shift();
		return this;
	}
	allValues(): T[] { return [... this.#queue ];  }
	map<A>(fn: (t: T) => A) { return this.#queue.map(v => fn(v)); }
	first(): T { return this.#queue[0]; }
	last(): T { return this.#queue[this.#queue.length - 1]; }
	length(): number { return this.#queue.length; }
}


// -------------------

abstract class IWallet {
	abstract getStartingMoney(): number;
	abstract getMoney(): number;
	abstract increaseMoney(amount: number): void;
	abstract decreaseMoney(amount: number): void;

	abstract recordCommissionPaid(): void;
	abstract getCommissionPaid(): number;
}

export class FakeWallet extends IWallet {
	money: number;
	commissionPaid: number;
	startingMoney: number;
	constructor(startingMoney = 12000000000) { 
		super();
		this.money = startingMoney;
		this.commissionPaid = 0;
		this.startingMoney = startingMoney;
	}
	getStartingMoney(): number { return this.startingMoney; }
	getMoney(): number { return this.money; }
	increaseMoney(amount: number): void { this.money += amount; }
	decreaseMoney(amount: number): void { this.money -= amount; }

	recordCommissionPaid(): void { this.commissionPaid += 100000; }
	getCommissionPaid(): number { return this.commissionPaid; }
}

export class RealWallet extends IWallet {
	ns: NS;
	commissionPaid: number;
	startingMoney: number;
	constructor(ns: NS) {
		super();
		this.ns = ns;
		this.commissionPaid = 0;
		this.startingMoney = ns.getServerMoneyAvailable("home");
	}
	getStartingMoney(): number { return this.startingMoney; }
	getMoney(): number { return this.ns.getServerMoneyAvailable("home"); }
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	increaseMoney(amount: number): void { /**  */ }
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	decreaseMoney(amount: number): void { /**  */}

	recordCommissionPaid(): void { this.commissionPaid += 100000; }
	getCommissionPaid(): number { return this.commissionPaid; }
}


export async function doTrading(ns: NS, valuesSourceFn: () => AsyncGenerator<Tick[], number, undefined>, stockChooser: IStockChooser, stockmarket: IStockmarket, wallet: IWallet): Promise<number> {
	const maxStocks = 3;
	let tickMap = new Map<string, Tick>();
	let count = 0;
	const minimumBid = 20000000;
	
	let pauseBuyingUntil = 0;

	for await (const ticks of valuesSourceFn()) {
		const pauseMessage = ports.popPort(ns, ports.SHARETRADING_CONTROL_PORT)
		if (pauseMessage!=null) {
			pauseBuyingUntil = new Date().getTime()+(1000*60);
		}

		ticks.forEach(tick => stockChooser.recordValue(tick));

		tickMap = new Map<string, Tick>( ticks.map(t => [t.sym, t]) );

		const bestStocks = stockChooser.getBestStocks();
		const goodStocks = stockChooser.getGoodStocks();
		const currentStocks = stockmarket.listOwnedShares();
		const stocksToSell = currentStocks.filter(s => ! goodStocks.includes(s));

		// Would be useful to keep track of profits here, even if not necessary
		stocksToSell.forEach(s => {
			const tick = tickMap.get(s)!;
			const sellGain = stockmarket.sellAllShares(s, tick );
			ns.print(`Selling ${s} for ${tick.bidPrice} - gained ${formatMoney(ns, sellGain)}`);
			wallet.recordCommissionPaid();
			wallet.increaseMoney(sellGain);
			return sellGain;
		});

		const pauseBuying = new Date().getTime() <= pauseBuyingUntil;
		const stocksToBuy = (currentStocks.length >= maxStocks || pauseBuying) ? [] : bestStocks;

		const totalWealth = getOwnedShareValue(ns) + wallet.getMoney();
		const maxInvestmentInStock = totalWealth / maxStocks;
		const stockCostFn = (s: string) => ns.stock.getPosition(s)[0] * ns.stock.getPosition(s)[1];

		// Buying is limited to how much money we've got and minimum bid
		for (const s of stocksToBuy) {
			const currentStockValue: number = (currentStocks.includes(s)) ? stockCostFn(s) : 0;
			const desiredAmountToSpend = Math.max(maxInvestmentInStock - currentStockValue, wallet.getMoney()*0.7);
			const amountToSpend = Math.min(desiredAmountToSpend, (wallet.getMoney()*0.9)-10_000_000);

			if (amountToSpend > minimumBid && amountToSpend <= wallet.getMoney()) {
				const tick = tickMap.get(s) !;
				const buyCost = stockmarket.buyShare(s, amountToSpend, tick);
				ns.print(`Buying ${s} at ${tick.askPrice} - cost was ${formatMoney(ns, buyCost)}`);
				wallet.recordCommissionPaid();
				wallet.decreaseMoney(buyCost);
			} 
		}
		await reportShareStatus(ns);

		count++;
	}

	ns.print("Number of ticks is "+count);
	// Sell all remaining shares
	const saleGains = stockmarket.listOwnedShares().map(s => stockmarket.sellAllShares(s, tickMap.get(s)! ))
							.reduce((sum, x) => sum + x, 0);
	wallet.increaseMoney(saleGains);

	ns.print("Commission paid : "+formatMoney(ns,wallet.getCommissionPaid()));
	ns.print("Starting money : "+formatMoney(ns,wallet.getStartingMoney()));
	ns.print("Final money : "+formatMoney(ns,wallet.getMoney()));
	return wallet.getMoney();
}

abstract class IStockmarket {
	abstract listOwnedShares(): string[];
	abstract buyShare(sym: string, amountToSpend: number, tick: Tick): number;
	abstract sellAllShares(sym: string, tick: Tick): number;
}

export class FakeStockmarket extends IStockmarket {
	#ownedShares = new Map();
	#transactionCost = 100000;
	ns: NS;
	constructor(ns: NS) { super(); this.ns = ns; }
	listOwnedShares(): string[] {  return [ ... this.#ownedShares.keys() ]; }
	buyShare(sym: string, amountToSpend: number, tick: Tick): number { 
		const desiredAmount = Math.floor(amountToSpend / tick.askPrice);
		const amount = Math.min(desiredAmount, this.ns.stock.getMaxShares(sym));
		if (this.#ownedShares.has(sym)) {
			const ownedAmount = this.#ownedShares.get(sym);
			this.ns.print("Buying additional "+amount+" of "+sym+" on top of existing "+ownedAmount);
			// @todo Not sure this is right - this is potentially buying more shares than the max
			this.#ownedShares.set(sym, ownedAmount + amount);
		} else {
			this.#ownedShares.set(sym, amount);
		}
		return (amount * tick.askPrice)+this.#transactionCost;
	}
	sellAllShares(sym: string, tick: Tick): number { 
		if (!this.#ownedShares.has(sym)) {
			return 0;
		} else {
			const amount = this.#ownedShares.get(sym);
			this.#ownedShares.delete(sym);
			return (amount * tick.bidPrice)-this.#transactionCost;
		}
	}
}

export class RealStockmarket extends IStockmarket {
	ns: NS;
	constructor(ns: NS) { super(); this.ns = ns; }
	listOwnedShares(): string[] { return this.ns.stock.getSymbols().filter(s => this.ns.stock.getPosition(s)[0]>0); }
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	buyShare(sym: string, amountToSpend: number, tick: Tick): number { 
		const desiredAmount = Math.floor(amountToSpend / this.ns.stock.getAskPrice(sym));
		const amount = Math.min(desiredAmount, this.ns.stock.getMaxShares(sym));
		const cost = this.ns.stock.getPurchaseCost(sym, amount, "Long");
		this.ns.stock.buy(sym, amount); 
		return cost;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	sellAllShares(sym: string, tick: Tick): number { 
		const amount = this.ns.stock.getPosition(sym)[0];
		const profit = this.ns.stock.getSaleGain(sym, amount, "Long");
		this.ns.stock.sell(sym, amount); 
		return profit;
	}
}


// ---------

export function sellAllShares(ns: NS): void {
	const sharesOwned = ns.stock.getSymbols().filter(s => ns.stock.getPosition(s)[0]>0);
	for (const s of sharesOwned) {
		sellAllOfShare(ns, s);
	}
}

export function getOwnedShareValue(ns: NS): number {
	return ns.stock.getSymbols()
				.filter(s => ns.stock.getPosition(s)[0]>0)
				.map(s => ns.stock.getBidPrice(s) * ns.stock.getPosition(s)[0])
				.reduce((sum, x) => sum + x, 0);
}

function sellAllOfShare(ns: NS, s: string): void {
	const existingShares = ns.stock.getPosition(s)[0];
	const bidPrice = ns.stock.getBidPrice(s);
	const boughtPrice = ns.stock.getPosition(s)[1];
	const profitPerShare = bidPrice - boughtPrice;
	const totalProfit = Math.floor(profitPerShare * existingShares);
	ns.stock.sell(s, existingShares);
	const soldMessage = "Sold "+existingShares+" of "+s+" at "+bidPrice+" (bought at "+boughtPrice+") for a profit of "+totalProfit;
	ns.toast(soldMessage);
	ns.print(soldMessage);
}

export async function reportShareStatus(ns: NS): Promise<void> {
	const value = getOwnedShareValue(ns);
	const longStocks = ns.stock.getSymbols().filter(s => ns.stock.getPosition(s)[0]>0);
	const shortStocks = ns.stock.getSymbols().filter(s => ns.stock.getPosition(s)[2]>0);
	const shareStatus: ShareStatus = { value, longStocks, shortStocks };
	await ports.setPortValue(ns, ports.SHARETRADING_REPORTS_PORT, JSON.stringify(shareStatus));
}

export async function pauseTrading(ns: NS, duration = 60): Promise<void> {
	await ports.setPortValue(ns, ports.SHARETRADING_CONTROL_PORT, duration);	
}
