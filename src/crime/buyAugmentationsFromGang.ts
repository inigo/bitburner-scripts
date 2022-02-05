import { AugmentationStats, NS } from '@ns'
import { fmt } from "libFormat";
import { getOwnedShareValue } from "tix/libTix"; 

export async function main(ns : NS) : Promise<void> {
    const availableMoney = ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
    const gangFaction = ns.gang.getGangInformation().faction
    const ownedAugmentations = ns.getOwnedAugmentations(true);
    const gangReputation = ns.getFactionRep(gangFaction);
    const costMultiplier = getCostMultiplier(ns);

	const hackingAugmentations = ns.getAugmentationsFromFaction(gangFaction)
        .map(a => getAugmentationInfo(ns, a))
        .filter(a => ! ownedAugmentations.includes(a.name))
        .filter(a => a.isHackingAugmentation)
        .filter(a => a.reputationNeeded < gangReputation)
        .filter(a => a.cost < availableMoney)
        .sort((a, b) => a.cost - b.cost).reverse()
     
	const adjustedPrice = hackingAugmentations.map(a => a.cost).reduce((acc, p, i) => acc + (p * (costMultiplier**i)), 0);


    ns.tprint("Hacking augmentations are : ");
    ns.tprint(hackingAugmentations.map(a => a.name) );
    ns.tprint(fmt(ns)`Cost is £${adjustedPrice}`);

}

function getCostMultiplier(ns: NS): number {
    const sf11Count = ns.getOwnedSourceFiles().filter(sf => sf.n == 11).length;
    const sf11Modifier = [1, 0.96, 0.94, 0.93].at(sf11Count);
    return 1.9 * sf11Modifier;
}

function getAugmentationInfo(ns: NS, augName: string): FullAugmentationInfo {
    const stats = ns.getAugmentationStats(augName)
    const cost = ns.getAugmentationPrice(augName);
    const reputationNeeded = ns.getAugmentationRepReq(augName);

    const isHackingAugmentation = stats.hacking_chance_mult || stats.hacking_exp_mult || stats.hacking_grow_mult || stats.hacking_money_mult || stats.hacking_mult || stats.hacking_speed_mult;
    const isReputationAugmentation = stats.faction_rep_mult;
    return { name: augName, ...stats, cost, reputationNeeded, isHackingAugmentation, isReputationAugmentation }
}

interface FullAugmentationInfo extends AugmentationStats {
    name: string;
    cost: number;
    reputationNeeded: number;
    isHackingAugmentation: boolean;
    isReputationAugmentation: boolean;
}

