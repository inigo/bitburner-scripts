import { NS } from '@ns'

export function getUsefulAugmentations(ns: NS, faction: string): string[] {
	const ownedAugmentations = ns.getOwnedAugmentations(true);
	const allAugmentations = getAllAugmentations(ns, faction);
	const usefulAugmentations = allAugmentations
		.filter(a => isHackingAugmentation(ns, a) || isGeneralAugmentation(ns, a))
		.filter(a => ! isNeuroflux(ns, a))
		.filter(a => ! ownedAugmentations.includes(a));
	ns.print("There are "+allAugmentations.length+" augmentations initially available from "+faction+" of which "+usefulAugmentations.length+" are useful");
	return usefulAugmentations;		
}

function getAllAugmentations(ns: NS, faction: string): string[] {
	return ns.getAugmentationsFromFaction(faction);
}

export function isHackingAugmentation(ns: NS, augName: string): boolean {
	const stats = ns.getAugmentationStats(augName);
	return stats.hacking_chance_mult !=null || stats.hacking_exp_mult!=null || stats.hacking_grow_mult!=null || 
			stats.hacking_money_mult !=null || stats.hacking_mult!=null || stats.hacking_speed_mult!=null;
}

export function isGeneralAugmentation(ns: NS, augName: string): boolean {
	const stats = ns.getAugmentationStats(augName);
	return stats.faction_rep_mult!=null || stats.company_rep_mult!=null;
}

function isNeuroflux(ns: NS, augName: string): boolean {
	return augName == "NeuroFlux Governor";
}