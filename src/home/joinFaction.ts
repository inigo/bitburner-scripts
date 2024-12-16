import {getUsefulAugmentations} from "/augment/libAugmentations";
import {retrieveGangInfo} from "/crime/libGangInfo";
import {CityName} from "@ns";
import {getGoal, Goal} from "/goal/libGoal";

export async function main(ns : NS) : Promise<void> {
	await travelForFactions(ns);

	const goal = getGoal(ns);
	const inGang = retrieveGangInfo(ns) != null;
	joinPreferredFaction(ns, goal, inGang);

	if (isAvailable(ns)) {
		const preferredFaction = findPreferredFaction(ns, goal, inGang, null);
		if (preferredFaction!=null) {
			ns.singularity.workForFaction(preferredFaction, "hacking", false);
		}
	} 
}


export function listInterestingFactions(): string[] {
	return [ 
			"Netburners"
			, "CyberSec" 				
			, "NiteSec"	
			, "Tian Di Hui"							
			, "The Black Hand"
			, "BitRunners"
			, "Daedalus" 
	];
}

async function travelForFactions(ns: NS): Promise<void> {
	const potentialFactions = listPotentialFactions(ns);
	const factionsFromTravelling = [ 
		{ name: "Tian Di Hui", city: "Chongqing", eligibilityFn: () => ns.getHackingLevel() >= 50 && ns.getServerMoneyAvailable("home") >= 1400000 }
		, { name: "Tetrads", city: "Chongqing", eligibilityFn: () => ns.getPlayer().skills.agility >= 75 && ns.getPlayer().skills.defense >= 75 && ns.getPlayer().skills.strength >= 75 && ns.getPlayer().skills.dexterity >= 75 && ns.heart.break() <= -18 }
	];
	const factionsToTravelFor = factionsFromTravelling
									.filter(f => ! potentialFactions.includes(f.name) )
									.filter(f => f.eligibilityFn());

	const originalCity = ns.getPlayer().city;
	for (const f of factionsToTravelFor) {
		ns.toast(`Travelling to ${f.city} to join ${f.name}`);
		ns.singularity.travelToCity(f.city as CityName);
		await ns.asleep(30000);
	}
	if (ns.getPlayer().city != originalCity) { ns.singularity.travelToCity(originalCity); }
}

function isAvailable(ns: NS) {
	const currentWork = ns.singularity.getCurrentWork();
	const isStudying = currentWork?.type == "CLASS";
	let isBladeburning = false;
	try {
		if (ns.bladeburner.inBladeburner() && ns.bladeburner.getCurrentAction() != null) {
			isBladeburning = true;
		}
	} catch (e) {
		ns.print("Cannot check whether there is a bladeburner action because not a bladeburner")
	}

	return !(ns.singularity.isBusy() || isBladeburning) || isStudying;
}

function joinPreferredFaction(ns: NS, goal: Goal, inGang: boolean): void {
	const preferredFaction = findPreferredFaction(ns, goal, inGang, null);
	if (preferredFaction!=null && ns.singularity.checkFactionInvitations().includes(preferredFaction)) {
		ns.toast("Joining preferred faction "+preferredFaction);
		ns.singularity.joinFaction(preferredFaction);
		const available = isAvailable(ns);
		if (available) {
			ns.singularity.workForFaction(preferredFaction, "hacking", false);
		}
	}
}

export function findPreferredFaction(ns: NS, goal: Goal, inGang: boolean, currentGangFaction: string | null): string {
	const factionsToExclude = currentGangFaction ? [ currentGangFaction ] : [];
	const interestingFactions = listInterestingFactions().filter(f => !factionsToExclude.includes(f));
	const allPotentialFactions = listPotentialFactions(ns);
	const potentialInterestingFactions = interestingFactions.filter( f => allPotentialFactions.includes(f));

	// Prefer Daedalus, if available
	if (potentialInterestingFactions.includes("Daedalus")) { return "Daedalus"; }
	
	const preferredFactions = potentialInterestingFactions
		.filter(f => getUsefulAugmentations(ns, f, goal).length > 1);
	ns.print("Preferred factions are "+preferredFactions);
	return preferredFactions[0];
}

function listPotentialFactions(ns: NS): string[] {
	return [...  ns.getPlayer().factions, ... ns.singularity.checkFactionInvitations()];
}