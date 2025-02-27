import {CityName, NS} from '@ns'
import { listSleeves, installSleeveAugments } from "@/sleeve/libSleeve";
import { buyAugmentations } from "@/crime/libGang";
import {sellAllShares} from "@/tix/libTix";
import {getOrderedAugmentations, getUsefulAugmentations} from "@/augment/libAugmentations";

export async function main(ns: NS) : Promise<void>{
	await buyLastingPurchases(ns);
}

export async function buyLastingPurchases(ns: NS): Promise<void> {
	sellAllShares(ns);
	buyStockmarketAccess(ns);
	buyRam(ns);
	buyNeurofluxGovernors(ns);
	buyCores(ns);
	await buyGangAugments(ns);
	buySleeveAugments(ns);
	buyIrrelevantAugments(ns); // Augments that aren't needed for the current goal, but might still be useful e.g. to qualify for factions
	acquireFreeAugments(ns);
	await travelAroundWorld(ns);
}

function buyStockmarketAccess(ns: NS): void {
	if (ns.stock.has4SDataTIXAPI()) {
		ns.print("Already have access to stock market");
	} else {
		const purchased = ns.stock.purchase4SMarketDataTixApi();
		if (purchased) { ns.toast("Buying stockmarket access"); }
	}
}

function buyRam(ns: NS): void {
	while (ns.singularity.upgradeHomeRam()) {
		ns.toast("Upgrading RAM");
	}
}

function buyNeurofluxGovernors(ns: NS): void {
	const favouriteFaction = getFavouriteFaction(ns);
	if (favouriteFaction==null) return;
	while (ns.singularity.purchaseAugmentation(favouriteFaction, "NeuroFlux Governor")) {
		ns.toast("Buying NeuroFlux Governor");
	}
}

function getFavouriteFaction(ns: NS): (string | null) {
	const gangFaction = ns.gang.inGang() ? ns.gang.getGangInformation().faction : null;
	const factions = ns.getPlayer().factions
						.filter(f => f!="Church of the Machine God")
						.filter(f => f!=gangFaction)
						.sort((a, b) => ns.singularity.getFactionRep(a) - ns.singularity.getFactionRep(b)).reverse();
	const favouriteFaction = (factions.length > 0) ? factions[0] : null;
	return favouriteFaction;
}

function buyCores(ns: NS): void {
	while (ns.singularity.upgradeHomeCores()) {
		ns.toast("Upgrading cores");
	}
}

async function buyGangAugments(ns: NS): Promise<void> {
	if (ns.gang.inGang()) {
		while (await buyAugmentations(ns, 0)) {
			ns.toast("Buying gang augmentations");
		}
	}
}

function buySleeveAugments(ns: NS): void {
	const unshockedSleeves = listSleeves(ns).filter(s => ns.sleeve.getSleeve(s).shock == 0);
	unshockedSleeves.forEach(s => installSleeveAugments(ns, s, 0));
}

function buyIrrelevantAugments(ns: NS): void {
	const money = ns.getServerMoneyAvailable("home");
	const allFactions = ns.getPlayer().factions;
	const allPurchasableAugmentations = allFactions.flatMap(f => getUsefulAugmentations(ns, f, "augmentations")
		.filter(a => a.cost <= money && a.reputationNeeded <= ns.singularity.getFactionRep(f)));
	const orderedAugmentations = getOrderedAugmentations(ns, allPurchasableAugmentations);
	// Start buying the most expensive first
	orderedAugmentations.reverse().forEach(aug => {
		// We could keep the faction name associated with each aug, and buy from the correct one, but there's no reason not to simply buy all augs from all factions
		// Likewise, the cost will increase as we buy - we could check the cost after each purchase and filter out unavailable ones, but there's no point
		allFactions.forEach(f => {
			const wasSuccessful = ns.singularity.purchaseAugmentation(f, aug.name);
			if (wasSuccessful) {
				ns.print(`Successfully bought ${aug.name} from ${f}`);
			}
		})
	})

}

function acquireFreeAugments(ns: NS): void {
	tryToBuyAugmentations(ns, "Daedalus", ["The Red Pill"]);
	tryToBuyAugmentations(ns, "Church of the Machine God");
}

function tryToBuyAugmentations(ns: NS, faction: string, augments?: string[]): void {
	const inFaction = ns.getPlayer().factions.includes(faction);
	if (!inFaction) { return; }

	ns.singularity.getAugmentationsFromFaction(faction)
		.filter(f => augments==null ? true : augments.includes(f) )
		.forEach(f => ns.singularity.purchaseAugmentation(faction, f) );
}

/** This provides Intelligence experience - although not very much */
async function travelAroundWorld(ns: NS): Promise<void> {
	ns.singularity.travelToCity("Chongqing"); // Make sure we're not in Sector-12 to begin with
	outerloop:
	for (let i = 0 ; i < 100000; i++) {
		for (const c of listCities()) {
			if (ns.getServerMoneyAvailable("home")<200_000) break;
			try {
				const travelledSuccessfully = ns.singularity.travelToCity(c as CityName);
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