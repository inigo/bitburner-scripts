/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'
import { fmt } from "libFormat";
import { getOwnedShareValue, sellAllShares, pauseTrading } from "tix/libTix"; 
import { getCostMultiplier, triggerRestart, getUsefulAugmentations } from "augment/libAugmentations";

export async function main(ns : NS) : Promise<void> {
    const force = ns.args.includes("force");

    if (ns.gang.inGang()==false) {
        ns.print("Not in a gang - no augmentations to buy");
        return;
    }

    const availableMoney = ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
    const gangFaction = ns.gang.getGangInformation().faction
    const gangReputation = ns.getFactionRep(gangFaction);
    const costMultiplier = getCostMultiplier(ns);

    const usefulAugmentations = getUsefulAugmentations(ns, gangFaction);
	const availableAugmentations = usefulAugmentations
        .filter(a => a.reputationNeeded < gangReputation)
        .filter(a => a.cost < availableMoney);
     
	const adjustedPrice = availableAugmentations.map(a => a.cost).reduce((acc, p, i) => acc + (p * (costMultiplier**i)), 0);
    ns.print("Available augmentations are : "+availableAugmentations.map(a => a.name) );
    ns.print(fmt(ns)`Total cost would be £${adjustedPrice}`);

	const affordableAugmentations = [];
	let costSoFar = 0;
	for (const aug of availableAugmentations) {
		const modifiedCost = aug.cost * (costMultiplier**affordableAugmentations.length);
		if (costSoFar+modifiedCost < availableMoney) {
			affordableAugmentations.push(aug);
			costSoFar += modifiedCost;
		}
	}  
    ns.print("Affordable augmentations are : "+affordableAugmentations.map(a => a.name) );
    ns.print(fmt(ns)`Total cost would be £${costSoFar}`);

    const shouldInstall = (affordableAugmentations.length >= 8) || ((usefulAugmentations.length - affordableAugmentations.length) <= 2 )

    if (shouldInstall || force) {
        await pauseTrading(ns, 180);
        sellAllShares(ns);
        // Wait for a little while, to see if we acquire some more money or reputation
        await ns.sleep(120_000);
        usefulAugmentations.forEach(f => ns.purchaseAugmentation(gangFaction, f.name));
        await triggerRestart(ns);
    }
}
