/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { AugmentationStats, NS } from '@ns'
import { fmt } from "libFormat";
import { getOwnedShareValue, sellAllShares, pauseTrading } from "tix/libTix"; 
import * as ports from "libPorts";

export async function main(ns : NS) : Promise<void> {
    const isLive = ns.args.includes("live");

    const availableMoney = ns.getServerMoneyAvailable("home") + getOwnedShareValue(ns);
    const gangFaction = ns.gang.getGangInformation().faction
    const ownedAugmentations = ns.getOwnedAugmentations(true);
    const gangReputation = ns.getFactionRep(gangFaction);
    const costMultiplier = getCostMultiplier(ns);

	const availableAugmentations = ns.getAugmentationsFromFaction(gangFaction)
        .map(a => getAugmentationInfo(ns, a))
        .filter(a => ! ownedAugmentations.includes(a.name))
        .filter(a => a.isHackingAugmentation || a.isHacknetAugmentation || a.isReputationAugmentation)
        .filter(a => a.reputationNeeded < gangReputation)
        .filter(a => a.cost < availableMoney)
        .sort((a, b) => a.cost - b.cost).reverse()
     
	const adjustedPrice = availableAugmentations.map(a => a.cost).reduce((acc, p, i) => acc + (p * (costMultiplier**i)), 0);

    ns.tprint("Available augmentations are : ");
    ns.tprint(availableAugmentations.map(a => a.name) );
    ns.tprint(fmt(ns)`Total cost would be £${adjustedPrice}`);

    if (isLive) {
        await pauseTrading(ns, 120);
        sellAllShares(ns);
        // Should sort out the dependencies properly - but this is a hacky way of making them work
        availableAugmentations.forEach(f => ns.purchaseAugmentation(gangFaction, f.name));
        availableAugmentations.forEach(f => ns.purchaseAugmentation(gangFaction, f.name));
        availableAugmentations.forEach(f => ns.purchaseAugmentation(gangFaction, f.name));
        availableAugmentations.forEach(f => ns.purchaseAugmentation(gangFaction, f.name));
        availableAugmentations.forEach(f => ns.purchaseAugmentation(gangFaction, f.name));
        await triggerRestart(ns);
    }
}

function getCostMultiplier(ns: NS): number {
    const sf11Count = ns.getOwnedSourceFiles().filter(sf => sf.n == 11).length;
    const sf11Modifier = [1, 0.96, 0.94, 0.93].at(sf11Count) !;
    return 1.9 * sf11Modifier;
}

function getAugmentationInfo(ns: NS, augName: string): FullAugmentationInfo {
    const stats = ns.getAugmentationStats(augName)
    const cost = ns.getAugmentationPrice(augName);
    const reputationNeeded = ns.getAugmentationRepReq(augName);

    const isHackingAugmentation: boolean = (stats.hacking_chance_mult || stats.hacking_exp_mult || stats.hacking_grow_mult || stats.hacking_money_mult || stats.hacking_mult || stats.hacking_speed_mult) != null;
    const isReputationAugmentation: boolean = (stats.faction_rep_mult != null);
    const isHacknetAugmentation: boolean = (stats.hacknet_node_core_cost_mult || stats.hacknet_node_level_cost_mult || stats.hacknet_node_money_mult || stats.hacknet_node_purchase_cost_mult || stats.hacknet_node_ram_cost_mult) != null;
    return { name: augName, ...stats, cost, reputationNeeded, isHackingAugmentation, isReputationAugmentation, isHacknetAugmentation }
}

interface FullAugmentationInfo extends AugmentationStats {
    name: string;
    cost: number;
    reputationNeeded: number;
    isHackingAugmentation: boolean;
    isReputationAugmentation: boolean;
    isHacknetAugmentation: boolean;
}


async function triggerRestart(ns: NS): Promise<void> {
	await ports.setPortValue(ns, ports.AUGMENT_AND_RESTART, "true");
}
