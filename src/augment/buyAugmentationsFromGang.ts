/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS } from '@ns'
import { fmt } from "libFormat";
import { getOwnedShareValue, sellAllShares, pauseTrading } from "tix/libTix"; 
import { getCostMultiplier, triggerRestart, getUsefulAugmentations, FullAugmentationInfo } from "augment/libAugmentations";
import { retrieveCompanyStatus } from "corp/libCorporation";

export async function main(ns : NS) : Promise<void> {
    const force = ns.args.includes("force");

    if (!ns.gang.inGang()) {
        ns.print("Not in a gang - no augmentations to buy");
        return;
    }
    const isInCorporation = retrieveCompanyStatus(ns) != null;
    if (!isInCorporation && ns.getServerMoneyAvailable("home") < 200_000_000_000) {
        ns.print("Save money for corporation startup instead");
        return;
    }

    const gangFaction = ns.gang.getGangInformation().faction;

	const availableAugmentations = getAvailableAugmentations(ns, gangFaction);     
    ns.print("Available augmentations are : "+availableAugmentations.map(a => a.name) );
    const bestAugmentations = findMostAffordableAugmentations(ns, gangFaction);
    ns.print("Best augmentations are : "+bestAugmentations.map(a => a.name) );

    if ((bestAugmentations.length > 0) || force) {
        await pauseTrading(ns, 180);
        sellAllShares(ns);
        // Wait for a little while, to see if we acquire some more money or reputation
        ns.tprint("Will shortly augment - brief pause to acquire more money and reputation")
        // await ns.sleep(120_000);
        const updatedBestAugmentations = findMostAffordableAugmentations(ns, gangFaction);
        if (updatedBestAugmentations.length > 0) {
            for (const aug of updatedBestAugmentations) {
                const success = ns.purchaseAugmentation(gangFaction, aug.name);
                if (success) {
                    ns.tprint("INFO Successfully bought "+aug.name);
                } else {
                    ns.print("WARN Failed to buy "+aug.name);
                }
            }
            for (const aug of getAvailableAugmentations(ns, gangFaction)) {
                const success = ns.purchaseAugmentation(gangFaction, aug.name);
                if (success) {
                    ns.tprint("WARN Also bought "+aug.name+" that should have been bought by the previous step");
                } 
            }
            await triggerRestart(ns);
        }
    }
}

function findMostAffordableAugmentations(ns: NS, faction: string,): FullAugmentationInfo[] {
	const availableAugmentations = getAvailableAugmentations(ns, faction);         

    let candidateAugmentations = findAffordableAugmentations(ns, availableAugmentations);
    while (candidateAugmentations.length > 0) {
        if (isWorthInstalling(ns, faction, candidateAugmentations)) {
            ns.print("Worthwhile set to install "+candidateAugmentations.map(a => a.name));
            return candidateAugmentations;
        }

        if (candidateAugmentations.length >= 6) {
            ns.print("Shortened worthwhile set to install "+candidateAugmentations.map(a => a.name));
            return candidateAugmentations;
        }

        availableAugmentations.shift();
        candidateAugmentations = findAffordableAugmentations(ns, availableAugmentations);
    }

    return [];
}

function isWorthInstalling(ns: NS, faction: string, candidateAugmentations: FullAugmentationInfo[]) {
    const usefulAugmentations = getUsefulAugmentations(ns, faction);
    return (candidateAugmentations.length >= 8) || ((usefulAugmentations.length - candidateAugmentations.length) <= 2 )
}

function findAffordableAugmentations(ns: NS, availableAugmentations: FullAugmentationInfo[]): FullAugmentationInfo[] {
    const availableMoney = getAvailableMoney(ns);
    const costMultiplier = getCostMultiplier(ns);
	const affordableAugmentations = [];
	let costSoFar = 0;
	for (const aug of availableAugmentations) {
		const modifiedCost = aug.cost * (costMultiplier**affordableAugmentations.length);
		if (costSoFar+modifiedCost < availableMoney) {
			affordableAugmentations.push(aug);
			costSoFar += modifiedCost;
		}
	}  
    ns.print(fmt(ns)`Total cost would be £${costSoFar} to install : ${affordableAugmentations.map(a => a.name)}`); 
    return affordableAugmentations;
}

function getAvailableMoney(ns: NS): number {
    return ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
}

function getAvailableAugmentations(ns: NS, faction: string): FullAugmentationInfo[] {
    const availableMoney = getAvailableMoney(ns);
    const rep = ns.getFactionRep(faction);
    const usefulAugmentations = getUsefulAugmentations(ns, faction);
	return usefulAugmentations
        .filter(a => a.reputationNeeded < rep)
        .filter(a => a.cost < availableMoney);
}