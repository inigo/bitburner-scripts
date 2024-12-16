/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { sellAllShares } from "/tix/libTix";
import { findPreferredFaction } from "/joinFaction";
import {
    getGangFaction,
    getBestInstallableAugmentations,
    evaluateAugmentationPurchase,
    calculateReputation,
    triggerRestart,
    maybeBuyStanekAugmentation,
    reportAugInfo, calculateAllAvailableMoney, calculateCost
} from "/augment/libAugmentations";
import { retrieveCompanyStatus } from "/corp/libCorporation";
import { fmt } from "/libFormat";
import { say } from "/speech/libSpeech"
import {getGoal, Goal} from "/goal/libGoal";

//! Buy available augmentations, as efficiently as possible, and then trigger a restart

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const force = (ns.args.includes("force"));
    const goal = getGoal(ns);
    await buyAugmentations(ns, goal, force);
}

async function buyAugmentations(ns: NS, goal: Goal, force: boolean): Promise<void> {
    const gangFaction = getGangFaction(ns);
    const inGang = gangFaction!=null;
    const nonGangFaction = findPreferredFaction(ns, goal, inGang, gangFaction);
    if (gangFaction==null && nonGangFaction==null) {
        await reportAugInfo(ns, []);
        return;
    }

    const requiredAugCount = 8; // How many augs should we aim to install at once? (not counting Neuroflux)

    const gangAugs = inGang ? getBestInstallableAugmentations(ns, goal, gangFaction) : [];
    const nonGangAugs = nonGangFaction!=null ? getBestInstallableAugmentations(ns, goal, nonGangFaction) : [];
    const allAugsAvailableFromGang = nonGangAugs.map(a => a.name).every(a => gangAugs.map(g => g.name).includes(a) );
    const gangAugsBetter = allAugsAvailableFromGang ||
        (gangAugs.length >= nonGangAugs.length && !evaluateAugmentationPurchase(ns, goal, nonGangFaction, nonGangAugs, requiredAugCount));
    const [ bestAugs, faction ] = gangAugsBetter ? [ gangAugs, gangFaction! ] : [ nonGangAugs, nonGangFaction! ];
    ns.print(`Gang has ${gangAugs.length} augs available, vs ${nonGangAugs.length} augs from ${nonGangFaction} - preferred faction is ${faction}`);
    await reportAugInfo(ns, bestAugs);

    const worthBuying = evaluateAugmentationPurchase(ns, goal, faction, bestAugs, requiredAugCount);
    const restartForFavor = ((gangFaction==null && (bestAugs.length>=3)) || faction=="Daedalus") && willGetEnoughFavorForDonations(ns, faction);
    const savingForCorporation = isSavingForCorporation(ns, faction);

    const cost = calculateCost(ns, bestAugs);
    ns.print(fmt(ns)`Preferred faction is ${faction} with available augs ${bestAugs.map(a => a.name)} costing £${cost}`);

    if ((!savingForCorporation && (worthBuying || restartForFavor)) || isRedPillAvailable(ns) || force ) {
        sellAllShares(ns);
        ns.singularity.stopAction(); // Makes the reputation from the current action available // @todo update - No longer needed

        maybeBuyStanekAugmentation(ns);
        ns.tprint("Buying augmentations for "+faction);
        say("Buying "+bestAugs.length+" augmentations from "/+faction);

        bestAugs.forEach(a => ns.tprint("INFO Buying augmentation "+a.name));
        bestAugs.forEach(a => ns.toast("Buying augmentation "+a.name));
        bestAugs.forEach(a => ns.singularity.purchaseAugmentation(faction, a.name));
        await triggerRestart(ns);
    }
}

function willGetEnoughFavorForDonations(ns: NS, faction: string): boolean {
    const favor = ns.singularity.getFactionFavor(faction);
    const favorNeeded = ns.getFavorToDonate();
    const favorGain = ns.singularity.getFactionFavorGain(faction);
    return (favor<favorNeeded) && (favor + favorGain >= favorNeeded);
}

/** Restart as soon as the Red Pill is available, because that means the end is nigh */
function isRedPillAvailable(ns: NS): boolean {
    return (ns.getPlayer().factions.includes("Daedalus")) &&
            (ns.singularity.getAugmentationRepReq("The Red Pill") <= calculateReputation(ns, "Daedalus"));
}

/** A corp is a much more effective way of raising money, so don't interrupt progress towards it */
function isSavingForCorporation(ns: NS, faction: string): boolean {
    // @todo update - not saving for corps until they work better
    return false;

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
