import { getUsefulAugmentations } from "augment/libAugmentations";
import { retrieveGangInfo } from "crime/libGangInfo";

export async function main(ns : NS) : Promise<void> {
	await travelForFactions(ns);

	const inGang = retrieveGangInfo(ns) != null;
	joinPreferredFaction(ns, inGang);

	const available = !ns.isBusy() || ns.getPlayer().workType=="Studying or Taking a class at university";
	if (available) {
		const preferredFaction = findPreferredFaction(ns, inGang);
		if (preferredFaction!=null) {
			ns.workForFaction(preferredFaction, "Hacking Contracts");		
		}
	} 

	flight(ns);
}


function listInterestingFactions(): string[] {
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
		, { name: "Tetrads", city: "Chongqing", eligibilityFn: () => ns.getPlayer().agility >= 75 && ns.getPlayer().defense >= 75 && ns.getPlayer().strength >= 75 && ns.getPlayer().dexterity >= 75 && ns.heart.break() <= -18 }
	];
	const factionsToTravelFor = factionsFromTravelling
									.filter(f => ! potentialFactions.includes(f.name) )
									.filter(f => f.eligibilityFn());

	const originalCity = ns.getPlayer().city;
	for (const f of factionsToTravelFor) {
		ns.toast(`Travelling to ${f.city} to join ${f.name}`);
		ns.travelToCity(f.city);
		await ns.asleep(30000);
	}
	if (ns.getPlayer().city != originalCity) { ns.travelToCity(originalCity); }
}

function flight(ns: NS): void {
	if (isPreparedForFlight(ns)) {
		ns.run("fl1ght.exe");
	}
}

function isPreparedForFlight(ns: NS): boolean {
	return (ns.getHackingLevel() >= 2500 
			&& ns.getServerMoneyAvailable("home") > 100_000_000_000 
			&& ns.getOwnedAugmentations(false).length >= 30);
}

function joinPreferredFaction(ns: NS, inGang: boolean): void {
	const preferredFaction = findPreferredFaction(ns, inGang);
	if (preferredFaction!=null && ns.checkFactionInvitations().includes(preferredFaction)) {
		ns.toast("Joining preferred faction "+preferredFaction);
		ns.joinFaction(preferredFaction);
		ns.workForFaction(preferredFaction, "Hacking Contracts");
		// ns.setFocus(true);
	}
}

export function findPreferredFaction(ns: NS, inGang: boolean): string {
	const gangFactions = ["NiteSec", "The Black Hand"];
	const factionsToExclude = inGang ? gangFactions : [];
	const interestingFactions = listInterestingFactions().filter(f => !factionsToExclude.includes(f));
	const allPotentialFactions = listPotentialFactions(ns);
	const potentialInterestingFactions = interestingFactions.filter( f => allPotentialFactions.includes(f));

	// Prefer Daedalus, if available
	if (potentialInterestingFactions.includes("Daedalus")) { return "Daedalus"; }
	
	const preferredFactions = potentialInterestingFactions
		.filter(f => getUsefulAugmentations(ns, f).length > 1);
	ns.print("Preferred factions are "+preferredFactions);
	return preferredFactions[0];
}

function listPotentialFactions(ns: NS): string[] {
	return [...  ns.getPlayer().factions, ... ns.checkFactionInvitations()];
}