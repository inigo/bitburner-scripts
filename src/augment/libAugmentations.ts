/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { NS, AugmentationStats } from '@ns'
import * as ports from "libPorts";

export function getCostMultiplier(ns: NS): number {
    const sf11Count = ns.getOwnedSourceFiles().filter(sf => sf.n == 11).length;
    const sf11Modifier = [1, 0.96, 0.94, 0.93].at(sf11Count) !;
    return 1.9 * sf11Modifier;
}

export function getUsefulAugmentations(ns: NS, faction: string): FullAugmentationInfo[] {
	const ownedAugmentations = ns.getOwnedAugmentations(true);
	const availableAugmentations = ns.getAugmentationsFromFaction(faction);
	ns.print("There are "+availableAugmentations.length+" augmentations available from "+faction);
	const augs = availableAugmentations
			.map(a => getAugmentationInfo(ns, a))
			.filter(a => ! ownedAugmentations.includes(a.name))
			.filter(a => a.isHackingAugmentation || a.isHacknetAugmentation || a.isReputationAugmentation)
			.filter(a => !a.isNeuroflux);
    return getOrderedAugmentations(ns, augs);
}

/** Return the selected augmentations in the best order to buy them in. */
export function getOrderedAugmentations(ns: NS, augs: FullAugmentationInfo[]): FullAugmentationInfo[] {
	const augNames = augs.map(a => a.name);
	const augsWithDependencies = augs.sort((a, b) => a.cost - b.cost).reverse()
									.filter(aug => aug.reqs.some(r => augNames.includes(r)));
	const augsWithoutDependencies = augs.filter(a => ! augsWithDependencies.map(ad => ad.name).includes(a.name));

	// Insert the dependent augments after the augments they depend on
	const orderedAugs = augsWithoutDependencies.flatMap(a => {
		const dependentAugs = augsWithDependencies.filter(ad => ad.reqs.includes(a.name));
		return [a, ...dependentAugs];
	});
	return orderedAugs;
}


export function getAugmentationInfo(ns: NS, augName: string): FullAugmentationInfo {
    const stats = ns.getAugmentationStats(augName)
    const cost = ns.getAugmentationPrice(augName);
    const reputationNeeded = ns.getAugmentationRepReq(augName);

    const isHackingAugmentation: boolean = (stats.hacking_chance_mult || stats.hacking_exp_mult || stats.hacking_grow_mult || stats.hacking_money_mult || stats.hacking_mult || stats.hacking_speed_mult) != null;
    const isReputationAugmentation: boolean = (stats.faction_rep_mult != null);
    const isHacknetAugmentation: boolean = (stats.hacknet_node_core_cost_mult || stats.hacknet_node_level_cost_mult || stats.hacknet_node_money_mult || stats.hacknet_node_purchase_cost_mult || stats.hacknet_node_ram_cost_mult) != null;
    const isNeuroflux: boolean = (augName == "NeuroFlux Governor");
    const reqs = ns.getAugmentationPrereq(augName);

    return { name: augName, ...stats, reqs, cost, reputationNeeded, isHackingAugmentation, isReputationAugmentation, isHacknetAugmentation, isNeuroflux }
}

export interface FullAugmentationInfo extends AugmentationStats {
    name: string;
    reqs: string[];
    cost: number;
    reputationNeeded: number;
    isHackingAugmentation: boolean;
    isReputationAugmentation: boolean;
    isHacknetAugmentation: boolean;
    isNeuroflux: boolean;
}


export async function triggerRestart(ns: NS): Promise<void> {
	await ports.setPortValue(ns, ports.AUGMENT_AND_RESTART, "true");
}

export function maybeBuyStanekAugmentation(ns: NS): boolean {
    const stanekWidth = ns.stanek.width();
    const requiredWidth = 5; // Don't bother if not enough gain from the gift
    if (stanekWidth >= requiredWidth) {
        return ns.purchaseAugmentation("Church of the Machine God", "Stanek's Gift - Genesis");
    } else {
        return false;
    }
}