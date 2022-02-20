import { sellAllShares, getOwnedShareValue } from "tix/libTix"; 
import { findPreferredFaction } from "joinFaction"; 
import { fmt } from "libFormat"; 
import { triggerRestart, getUsefulAugmentations, FullAugmentationInfo, getCostMultiplier, getOrderedAugmentations } from "augment/libAugmentations";

export async function main(ns: NS): Promise<void> {
	const force = (ns.args.includes("force"));
	if (ns.gang.inGang() && !inDaedalus(ns)) {
		return;
	} else {
		await buyAllPreferredAugmentations(ns, force);
	}
}

function inDaedalus(ns: NS): boolean {
	return (ns.getPlayer().factions.includes("Daedalus") && ns.getFactionRep("Daedalus") > 20_000_000);
}

export async function buyAllPreferredAugmentations(ns: NS, force: boolean): Promise<boolean> {
	const targetFaction = findPreferredFaction(ns, false);
	if (targetFaction==null) {
		ns.print("No target faction available");
		return false;
	}
	return await buyAllAugmentations(ns, targetFaction, force);
}


async function buyAllAugmentations(ns: NS, faction: string, force: boolean): Promise<boolean> {
	const desiredAugs = getUsefulAugmentations(ns, faction);
	const shouldRestart = hasSufficientReputation(ns, faction, desiredAugs) || force;
	if (!shouldRestart) {
		return false;
	}

	const costMultiplier = getCostMultiplier(ns);
	const reputation = calculateReputation(ns, faction);
	const augsWithSufficientRep = desiredAugs.filter(a => a.reputationNeeded <= reputation);

	// Need to reorder here, since we might have removed an aug with a dependency
	const orderedAugs = getOrderedAugmentations(ns, augsWithSufficientRep);
	const totalPrice = orderedAugs.map(a => a.cost).reduce((acc, p, i) => acc + (p * (costMultiplier**i)), 0);

	if (calculateAvailableMoney(ns) < totalPrice && calculateAllAvailableMoney(ns) >= totalPrice) {
		ns.print("Selling things to make more money available");
		sellAllShares(ns);
	} 
	
	const availableMoney = calculateAvailableMoney(ns);
	if (availableMoney >= totalPrice) {
		ns.tprint("Buying augmentations for "+faction);

		// Makes the reputation from the current action available
		if (ns.isBusy() && ns.getPlayer().currentWorkFactionName==faction) {
			ns.stopAction();
		}

		orderedAugs.forEach(a => ns.purchaseAugmentation(faction, a.name));		
		orderedAugs.forEach(a => ns.tprint("INFO Buying augmentation"+a.name));
		orderedAugs.forEach(a => ns.toast("Buying augmentation "+a.name));
		await triggerRestart(ns);
		return true;
	} else {
		ns.print(fmt(ns)`Not sufficient money available to buy all augmentations for ${faction} - got £${availableMoney} but need £${totalPrice}`);
		return false;
	}
}

function hasSufficientReputation(ns: NS, faction: string, augs: FullAugmentationInfo[]): boolean {
	const reputationNeeded = Math.max(... augs.map(a => a.reputationNeeded))
	const reputation = calculateReputation(ns, faction);
	ns.print(fmt(ns)`Reputation needed is ${reputationNeeded} and reputation available is ${reputation}`);

	if ((ns.getFactionFavor(faction)<150) && ((ns.getFactionFavor(faction) + ns.getFactionFavorGain(faction)) >= 150 )) {
		ns.tprint("Not enough reputation to buy everything - but restarting anyway to improve favour");
		return true;
	} else if (reputation >= reputationNeeded) {
		ns.tprint("Sufficient reputation available - restarting");
		return true;
	} else {
		ns.print(fmt(ns)`Not sufficient reputation to buy all augmentations for ${faction} - got ${reputation} but need ${reputationNeeded}`);
		return false;
	}
}

function calculateReputation(ns: NS, faction: string): number {
	const savedReputation = ns.getFactionRep(faction);
	const inProgressReputation = (ns.isBusy() && ns.getPlayer().currentWorkFactionName==faction) ? ns.getPlayer().workRepGained : 0;
	return savedReputation + inProgressReputation;
}

function calculateAvailableMoney(ns: NS): number {
	return ns.getServerMoneyAvailable("home");
}

function calculateAllAvailableMoney(ns: NS): number {
	const shareValue = (ns.getPlayer().hasTixApiAccess) ? getOwnedShareValue(ns) : 0;
	return calculateAvailableMoney(ns) + shareValue;
}

