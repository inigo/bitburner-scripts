/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'
import { fmt } from "libFormat";
import { getOwnedShareValue, sellAllShares, pauseTrading } from "tix/libTix"; 
import { getCostMultiplier, triggerRestart, getUsefulAugmentations } from "augment/libAugmentations";

export async function main(ns : NS) : Promise<void> {
    const isLive = ns.args.includes("live");

    const availableMoney = ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
    const gangFaction = ns.gang.getGangInformation().faction
    const gangReputation = ns.getFactionRep(gangFaction);
    const costMultiplier = getCostMultiplier(ns);

	const availableAugmentations = getUsefulAugmentations(ns, gangFaction)
        .filter(a => a.reputationNeeded < gangReputation)
        .filter(a => a.cost < availableMoney);
     
	const adjustedPrice = availableAugmentations.map(a => a.cost).reduce((acc, p, i) => acc + (p * (costMultiplier**i)), 0);

    ns.tprint("Available augmentations are : ");
    ns.tprint(availableAugmentations.map(a => a.name) );
    ns.tprint(fmt(ns)`Total cost would be £${adjustedPrice}`);

    if (isLive) {
        await pauseTrading(ns, 120);
        sellAllShares(ns);
        // Should sort out the dependencies properly - but this is a hacky way of making them work
        availableAugmentations.forEach(f => ns.purchaseAugmentation(gangFaction, f.name));
        await triggerRestart(ns);
    }
}
