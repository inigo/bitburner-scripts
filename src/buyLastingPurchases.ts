import { NS } from '@ns'
import { listSleeves, installSleeveAugments } from "sleeve/libSleeve";
import { buyAugmentations } from "crime/libGang";

export async function main(ns: NS) : Promise<void>{
	await buyLastingPurchases(ns);
}

export async function buyLastingPurchases(ns: NS): Promise<void> {
	buyStockmarketAccess(ns);
	buyRam(ns);
	buyNeurofluxGovernors(ns);
	buyCores(ns);
	buyGangAugments(ns);
	buySleeveAugments(ns);
	acquireFreeAugments(ns);
	await travelAroundWorld(ns);
}

function buyStockmarketAccess(ns: NS): void {
	if (ns.getPlayer().has4SDataTixApi) {
		ns.print("Already have access to stock market");
	} else {
		const purchased = ns.stock.purchase4SMarketDataTixApi();
		if (purchased) { ns.toast("Buying stockmarket access"); }
	}
}

function buyRam(ns: NS): void {
	while (ns.upgradeHomeRam()) {
		ns.toast("Upgrading RAM");
	}
}

function buyNeurofluxGovernors(ns: NS): void {
	const favouriteFaction = getFavouriteFaction(ns);
	if (favouriteFaction==null) return;
	while (ns.purchaseAugmentation(favouriteFaction, "NeuroFlux Governor")) {
		ns.toast("Buying NeuroFlux Governor");
	}
}

function getFavouriteFaction(ns: NS): (string | null) {
	const gangFaction = ns.gang.inGang() ? ns.gang.getGangInformation().faction : null;
	const factions = ns.getPlayer().factions
						.filter(f => f!=gangFaction)
						.sort((a, b) => ns.getFactionRep(a) - ns.getFactionRep(b)).reverse();
	const favouriteFaction = (factions.length > 0) ? factions[0] : null;
	return favouriteFaction;
}

function buyCores(ns: NS): void {
	while (ns.upgradeHomeCores()) {
		ns.toast("Upgrading cores");
	}
}

function buyGangAugments(ns: NS): void {
	if (ns.gang.inGang()) {
		while (buyAugmentations(ns, 0)) {
			ns.toast("Buying gang augmentations");
		}
	}
}

function buySleeveAugments(ns: NS): void {
	const unshockedSleeves = listSleeves(ns).filter(s => ns.sleeve.getSleeveStats(s).shock == 0);
	unshockedSleeves.forEach(s => installSleeveAugments(ns, s, 0));
}

function acquireFreeAugments(ns: NS): void {
	tryToBuyAugmentations(ns, "Daedalus", ["The Red Pill"]);
	tryToBuyAugmentations(ns, "Church of the Machine God");
}

function tryToBuyAugmentations(ns: NS, faction: string, augments?: string[]): void {
	const inFaction = ns.getPlayer().factions.includes(faction);
	if (!inFaction) { return; }

	ns.getAugmentationsFromFaction(faction)
		.filter(f => augments==null ? true : augments.includes(f) )
		.forEach(f => ns.purchaseAugmentation(faction, f) );
}

/** This provides Intelligence experience - although not very much */
async function travelAroundWorld(ns: NS): Promise<void> {
	ns.travelToCity("Chongqing"); // Make sure we're not in Sector-12 to begin with
	outerloop:
	for (let i = 0 ; i < 100000; i++) {
		for (const c of listCities()) {
			if (ns.getServerMoneyAvailable("home")<200_000) break;
			try {
				const travelledSuccessfully = ns.travelToCity(c);
				if (!travelledSuccessfully) {
					break outerloop;
				}
			} catch(error) {
				break outerloop;
			}
			if (i % 1000 == 0) { 
				await ns.sleep(2);
			}
		}
	}
}

function listCities() {
	return [ "Sector-12", "Volhaven", "Chongqing", "New Tokyo", "Ishima", "Aevum" ];
}