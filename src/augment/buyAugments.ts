/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { sellAllShares } from "tix/libTix";
import { findPreferredFaction } from "joinFaction";
import {
    getGangFaction,
    getBestInstallableAugmentations,
    evaluateAugmentationPurchase,
    calculateReputation,
    triggerRestart,
    maybeBuyStanekAugmentation,
    reportAugInfo, calculateAllAvailableMoney
} from "augment/libAugmentations";
import { retrieveCompanyStatus } from "corp/libCorporation";


export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const force = (ns.args.includes("force"));
    await buyAugmentations(ns, force);
}

async function buyAugmentations(ns: NS, force: boolean): Promise<void> {
    const gangFaction = getGangFaction(ns);
    const inGang = gangFaction!=null;
    const nonGangFaction = findPreferredFaction(ns, inGang);
    if (gangFaction==null && nonGangFaction==null) {
        await reportAugInfo(ns, []);
        return;
    }

    const requiredAugCount = 8; // How many augs should we aim to install at once? (not counting Neuroflux)

    const gangAugs = inGang ? getBestInstallableAugmentations(ns, gangFaction) : [];
    const nonGangAugs = nonGangFaction!=null ? getBestInstallableAugmentations(ns, nonGangFaction) : [];
    const allAugsAvailableFromGang = nonGangAugs.map(a => a.name).every(a => gangAugs.map(g => g.name).includes(a) );
    const gangAugsBetter = allAugsAvailableFromGang ||
        (gangAugs.length >= nonGangAugs.length && !evaluateAugmentationPurchase(ns, nonGangFaction, nonGangAugs, requiredAugCount));
    const [ bestAugs, faction ] = gangAugsBetter ? [ gangAugs, gangFaction! ] : [ nonGangAugs, nonGangFaction! ];
    ns.print(`Gang has ${gangAugs.length} augs available, vs ${nonGangAugs.length} augs from ${nonGangFaction} - preferred faction is ${faction}`);
    await reportAugInfo(ns, bestAugs);

    const worthBuying = evaluateAugmentationPurchase(ns, faction, bestAugs, requiredAugCount);
    const restartForFavor = ((gangFaction==null && (bestAugs.length>=3)) || faction=="Daedalus") && willGetEnoughFavorForDonations(ns, faction);
    const savingForCorporation = isSavingForCorporation(ns, faction);

    ns.print(`Preferred faction is ${faction} with available augs ${bestAugs.map(a => a.name)}`);

    if ((!savingForCorporation && (worthBuying || restartForFavor)) || isRedPillAvailable(ns) || force ) {
        sellAllShares(ns);
        ns.stopAction(); // Makes the reputation from the current action available

        maybeBuyStanekAugmentation(ns);
        ns.tprint("Buying augmentations for "+faction);

        bestAugs.forEach(a => ns.tprint("INFO Buying augmentation "+a.name));
        bestAugs.forEach(a => ns.toast("Buying augmentation "+a.name));
        bestAugs.forEach(a => ns.purchaseAugmentation(faction, a.name));
        await triggerRestart(ns);
    }
}

function willGetEnoughFavorForDonations(ns: NS, faction: string): boolean {
    const favor = ns.getFactionFavor(faction);
    const favorNeeded = ns.getFavorToDonate();
    const favorGain = ns.getFactionFavorGain(faction);
    return (favor<favorNeeded) && (favor + favorGain >= favorNeeded);
}

/** Restart as soon as the Red Pill is available, because that means the end is nigh */
function isRedPillAvailable(ns: NS): boolean {
    return (ns.getPlayer().factions.includes("Daedalus")) &&
            (ns.getAugmentationRepReq("The Red Pill") <= calculateReputation(ns, "Daedalus"));
}

/** A corp is a much more effective way of raising money, so don't interrupt progress towards it */
function isSavingForCorporation(ns: NS, faction: string): boolean {
    const isInCorporation = retrieveCompanyStatus(ns) != null;
    // Already in a corp, so clearly not saving up for one
    if (isInCorporation) return false;

    // We've had a chance to form a corp, but haven't for some reason
    if (calculateAllAvailableMoney(ns) > 200_000_000_000) return false;

    // Early faction augments should get us to having a corp faster
    const earlyFactions = [ "Netburners", "CyberSec", "NiteSec"];
    if (earlyFactions.includes(faction)) { return false; }

    // Otherwise, save enough money to join a corp
    return true;
}
