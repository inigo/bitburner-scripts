/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { fmt } from "@/libFormat";
import { NS } from '@ns'

const millisecondsPerHour = 60 * 60 * 1000;

export function paybackTimeInMilliseconds(ns: NS): number {
	const purchase = findBestPurchase(ns, ns.getServerMoneyAvailable("home"), 24 * millisecondsPerHour);

	ns.print(fmt(ns)`Seconds until payback are ${purchase.millisecondsUntilPayback}s`);	
	return purchase.millisecondsUntilPayback;
}

export function buyUpgrades(ns: NS, budget: number, requiredPaybackMilliseconds = 2 * millisecondsPerHour): number {
	const bestPurchase = findBestPurchase(ns, budget, requiredPaybackMilliseconds);
	if (bestPurchase==null) return 0;

	ns.print(fmt(ns)`Purchasing ${bestPurchase.name} for server ${bestPurchase.server} - payback in ${bestPurchase.millisecondsUntilPayback}s`);
	bestPurchase.upgradeFn();
	return bestPurchase.cost;
}

export function buyCache(ns: NS): boolean {
	const totalHashCapacity = ns.hacknet.hashCapacity();
	const availableMoney = ns.getServerMoneyAvailable("home");
	const nodeCount = ns.hacknet.numNodes();


	if (totalHashCapacity < 600 && availableMoney > 100_000_000 && nodeCount > 0) {
		ns.hacknet.upgradeCache(0, 3);
		return true;
	} else if (totalHashCapacity < 1000 && availableMoney > 200_000_000 && nodeCount > 0) {
		ns.hacknet.upgradeCache(0, 2);
		return true;
	} else if (totalHashCapacity < 2000 && availableMoney > 500_000_000 && nodeCount > 0) {
		ns.hacknet.upgradeCache(0, 3);
		return true;
	} else if (totalHashCapacity < 17000 && availableMoney > 20_000_000_000 && nodeCount > 0) {
		ns.hacknet.upgradeCache(0, 3);
		return true;
	} else if (totalHashCapacity < 33000 && availableMoney > 100_000_000_000 && nodeCount > 0) {
		ns.hacknet.upgradeCache(0, 2);
		return true;
	} else {
		return false;
	}
}

function findBestPurchase(ns: NS, budget: number, requiredPaybackMilliseconds: number): RichHacknetPurchase {
	const bestPurchases = getAllPurchases(ns)
				.filter(u => u.cost <= budget)
				.filter(u => u.millisecondsUntilPayback < requiredPaybackMilliseconds)
				.sort((a, b) => a.hashOutputPerDollar - b.hashOutputPerDollar).reverse();
	return bestPurchases.at(0) !;
}

function getAllPurchases(ns: NS): RichHacknetPurchase[] {
	const upgrades = listHacknetNodes(ns).flatMap(i => getUpgradeBenefits(ns, i));
	const purchases = [...upgrades, getPurchaseBenefit(ns) ]

	const calculateMillisecondsUntilPayback = (p: HacknetPurchase) => {
		const dollarsPerHash = 250000; // 4 hash sell for $1m in a simple sale
		const incomePerSecond = p.benefit * dollarsPerHash;
		return (p.cost / incomePerSecond) * 1000;
	};

	return purchases.map(p => {
		const millisecondsUntilPayback = calculateMillisecondsUntilPayback(p);
		const hashOutputPerDollar = p.benefit / p.cost;
		return { ... p, millisecondsUntilPayback, hashOutputPerDollar };
	})
}

interface HacknetPurchase { name: string, server: number, cost: number, benefit: number, upgradeFn: (() => void) }
interface RichHacknetPurchase extends HacknetPurchase { millisecondsUntilPayback: number, hashOutputPerDollar: number }

/** What's the cost/benefit of upgrading the ram, level or cores on an existing Hacknet server? */
function getUpgradeBenefits(ns: NS, serverIndex: number): HacknetPurchase[] {
	const hn = ns.hacknet;
	const fm = ns.formulas.hacknetServers;
	const p =  ns.getPlayer();
	
	const calcImprovement = (incRam: number, incLevel: number, incCores: number) => {
		const s = hn.getNodeStats(serverIndex);
		const existingRate = fm.hashGainRate(s.level, 0, s.ram, s.cores, p.mults.hacknet_node_money);
		const improvedRate = fm.hashGainRate(s.level+incLevel, 0, s.ram+incRam, s.cores+incCores, p.mults.hacknet_node_money);
		return improvedRate - existingRate;
	}
	return [
		{ name: "ram", server: serverIndex, cost: hn.getRamUpgradeCost(serverIndex, 1), upgradeFn: () => hn.upgradeRam(serverIndex, 1), benefit: calcImprovement(1,0,0) }
		, { name: "level", server: serverIndex, cost: hn.getLevelUpgradeCost(serverIndex, 1), upgradeFn: () => hn.upgradeLevel(serverIndex, 1), benefit: calcImprovement(0,1,0) }
		, { name: "core", server: serverIndex, cost: hn.getCoreUpgradeCost(serverIndex, 1), upgradeFn: () => hn.upgradeCore(serverIndex, 1), benefit: calcImprovement(0,0,1) }
	];
}

/** What's the cost/benefit of buying a new Hacknet server, upgraded to match the existing servers? */
function getPurchaseBenefit(ns: NS): HacknetPurchase {
	const hn = ns.hacknet;
	const fm = ns.formulas.hacknetServers;
	const p =  ns.getPlayer();

	// Using second node, because first node may be the "startup" node that's artificially good
	const secondNode =  (hn.numNodes()>1) ? hn.getNodeStats(1) : null;
	const existingCores = secondNode?.cores ?? 1;
	const existingLevel = secondNode?.level ?? 1;
	const existingRam = secondNode?.ram ?? 1;

	const upgradeCost = fm.coreUpgradeCost(1, existingCores - 1, p.mults.hacknet_node_core_cost)
						+ fm.ramUpgradeCost(1, existingRam - 1, p.mults.hacknet_node_ram_cost)
						+ fm.levelUpgradeCost(1, existingLevel - 1, p.mults.hacknet_node_level_cost);

	return { name: "newServer", 
			server: 0, 
			cost: hn.getPurchaseNodeCost() + upgradeCost, 
			upgradeFn: () => hn.purchaseNode(), 
			benefit: fm.hashGainRate(existingLevel, 0, existingRam, existingCores, p.mults.hacknet_node_money)
			};
}

export function listHacknetNodes(ns: NS): HacknetNodeNo[] {
	const nodeCount = ns.hacknet.numNodes();
	return [...Array(nodeCount).keys()];
}
type HacknetNodeNo = number
