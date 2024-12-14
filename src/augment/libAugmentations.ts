/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {NS} from '@ns'
import {retrieveGangInfo} from "/crime/libGangInfo";
import * as ports from "libPorts";
import {getOwnedShareValue} from "/tix/libTix";
import {AugReport, FullAugmentationInfo} from "/augment/libAugmentationInfo";
import {Goal} from "/goal/libGoal";

export function getCostMultiplier(ns: NS): number {
    const sf11Count = ns.singularity.getOwnedSourceFiles().filter(sf => sf.n == 11).length;
    const sf11Modifier = [1, 0.96, 0.94, 0.93].at(sf11Count) !;
    return 1.9 * sf11Modifier;
}

export function getUsefulAugmentations(ns: NS, faction: string, goal: Goal): FullAugmentationInfo[] {
	const ownedAugmentations = ns.singularity.getOwnedAugmentations(true);
	const availableAugmentations = ns.singularity.getAugmentationsFromFaction(faction);

    // We still care about hacking for bitburner, because that's still our primary source of cash for augmentations
    // (but maybe only up to a certain point - once we have enough income, we don't need more?? )
    const relevanceFilter = (goal === "bladeburner")
        ? (a: FullAugmentationInfo) => a.isHackingAugmentation || a.isHacknetAugmentation || a.isReputationAugmentation || a.isBladeburnerAugmentation || a.isPhysicalAugmentation || a.isCharismaAugmentation
        : (a: FullAugmentationInfo) => a.isHackingAugmentation || a.isHacknetAugmentation || a.isReputationAugmentation;

	const augs = availableAugmentations
			.map(a => getAugmentationInfo(ns, a))
			.filter(a => ! ownedAugmentations.includes(a.name))
			.filter(relevanceFilter)
			.filter(a => !a.isNeuroflux);
    ns.print("There are "+augs.length+" useful augmentations available from "+faction);
    // ns.print("They are: "+getOrderedAugmentations(ns, augs)
    //     .map(a => `${a.name} (${a.isHackingAugmentation ? "hack " : ""}${a.isHacknetAugmentation ? "hacknet " : ""}${a.isReputationAugmentation ? "rep " : ""})`).join(", "));

    return getOrderedAugmentations(ns, augs);
}

/** Return the selected augmentations in the best order to buy them in. */
export function getOrderedAugmentations(ns: NS, augs: FullAugmentationInfo[]): FullAugmentationInfo[] {
	const augNames = augs.map(a => a.name);
	const augsWithDependencies = augs.sort((a, b) => a.cost - b.cost).reverse()
									.filter(aug => aug.reqs.some(r => augNames.includes(r)));
	const augsWithoutDependencies = augs.filter(a => ! augsWithDependencies.map(ad => ad.name).includes(a.name));

	// Insert the dependent augments after the augments they depend on
	return augsWithoutDependencies.flatMap(a => {
		const dependentAugs = augsWithDependencies.filter(ad => ad.reqs.includes(a.name));
		return [a, ...dependentAugs];
	});
}


export function getAugmentationInfo(ns: NS, augName: string): FullAugmentationInfo {
    const stats = ns.singularity.getAugmentationStats(augName)
    const cost = ns.singularity.getAugmentationPrice(augName);
    const reputationNeeded = ns.singularity.getAugmentationRepReq(augName);

    const isHackingAugmentation: boolean = (stats.hacking_chance > 1 || stats.hacking_exp > 1 || stats.hacking_grow > 1 || stats.hacking_money > 1 || stats.hacking > 1 || stats.hacking_speed > 1);
    const isReputationAugmentation: boolean = (stats.faction_rep > 1);
    const isHacknetAugmentation: boolean = (stats.hacknet_node_core_cost > 1 || stats.hacknet_node_level_cost > 1 || stats.hacknet_node_money > 1 || stats.hacknet_node_purchase_cost > 1 || stats.hacknet_node_ram_cost > 1);
    const isPhysicalAugmentation: boolean = (stats.agility > 1 || stats.agility_exp > 1 || stats.defense > 1 || stats.defense_exp > 1 || stats.strength > 1 || stats.strength_exp > 1 || stats.dexterity > 1 || stats.dexterity_exp > 1 );
    const isBladeburnerAugmentation: boolean = (stats.bladeburner_analysis > 1 || stats.bladeburner_max_stamina > 1 || stats.bladeburner_stamina_gain > 1 || stats.bladeburner_success_chance > 1);
    const isCharismaAugmentation: boolean = (stats.charisma > 1 || stats.charisma_exp > 1);
    // Not including company rep or work, or crime

    const isNeuroflux: boolean = (augName == "NeuroFlux Governor");
    const reqs = ns.singularity.getAugmentationPrereq(augName);

    return { name: augName, ...stats, reqs, cost, reputationNeeded, isHackingAugmentation, isReputationAugmentation, isHacknetAugmentation, isNeuroflux, isPhysicalAugmentation, isBladeburnerAugmentation, isCharismaAugmentation }
}



export async function triggerRestart(ns: NS): Promise<void> {
	await ports.setPortValue(ns, ports.AUGMENT_AND_RESTART, "true");
}

export function maybeBuyStanekAugmentation(ns: NS): boolean {
    try {
        const stanekWidth = ns.stanek.giftWidth();
        const requiredWidth = 5; // Don't bother if not enough gain from the gift
        if (stanekWidth >= requiredWidth) {
            return ns.singularity.purchaseAugmentation("Church of the Machine God", "Stanek's Gift - Genesis");
        } else {
            return false;
        }
    } catch (e) {
        ns.toast("Cannot get Stanek's Gift - maybe have already installed augmentations manually?")
        return false;
    }
}

export function countAvailableNeuroflux(ns: NS, availableToSpend: number = ns.getServerMoneyAvailable("home")): number {
    const neurofluxFaction = getNeurofluxFaction(ns);
    if (neurofluxFaction==null) return 0;

    const reputation = ns.singularity.getFactionRep(neurofluxFaction);
    const startingPrice = ns.singularity.getAugmentationPrice("NeuroFlux Governor");
    const startingReputationRequired = ns.singularity.getAugmentationRepReq("NeuroFlux Governor");

    const costMultiplier = getCostMultiplier(ns);
    const neurofluxMultiplier = 1.14;
    const repGain = neurofluxMultiplier;
    const priceGain = neurofluxMultiplier * costMultiplier;

    let remainingMoney = availableToSpend;
    let nextCost = startingPrice;
    let nextReputationRequired = startingReputationRequired;
    let purchaseCount = 0;
    while (reputation >= nextReputationRequired && remainingMoney >= nextCost) {
        remainingMoney -= nextCost;
        purchaseCount++;
        nextReputationRequired *= repGain;
        nextCost *= priceGain;
    }

    return purchaseCount;
}

function getNeurofluxFaction(ns: NS): (string | null) {
    const gangFaction = getGangFaction(ns);
    const factions = ns.getPlayer().factions
        .filter(f => f!=gangFaction)
        .sort((a, b) => ns.singularity.getFactionRep(a) - ns.singularity.getFactionRep(b))
        .reverse();
    return factions.at(0)  ?? null;
}

export async function reportAugInfo(ns: NS, augs: FullAugmentationInfo[]): Promise<void> {
    const cost = calculateCost(ns, augs);
    const moneyAfterCost = calculateAllAvailableMoney(ns) - cost;
    const neurofluxCount = countAvailableNeuroflux(ns, moneyAfterCost);

    const info: AugReport = { augCount: augs.length, installableAugs: augs, neurofluxCount };
    await ports.setPortValue(ns, ports.AUG_REPORTS_PORT, JSON.stringify(info));
}


// ----------

export function evaluateAugmentationPurchase(ns: NS, goal: Goal, faction: string, augsToBuy: FullAugmentationInfo[], requiredCount: number): boolean {
    if (augsToBuy.length==0) return false;

    const usefulAugmentations = getUsefulAugmentations(ns, faction, goal);

    const isGangFaction = (faction == getGangFaction(ns));
    if (!isGangFaction) {
        return augsToBuy.length == usefulAugmentations.length;
    } else {
        return (augsToBuy.length>=requiredCount) || ((usefulAugmentations.length - augsToBuy.length) <= 2);
    }
}

export function getBestInstallableAugmentations(ns: NS, goal: Goal, faction: string): FullAugmentationInfo[] {
    const money = calculateAllAvailableMoney(ns);
    const reputation = calculateReputation(ns, faction);

    const availableAugmentations = getAvailableAugmentations(ns, goal, faction, money, reputation);

    for (const i of doCount(availableAugmentations.length)) {
        const candidates = availableAugmentations.slice(i);
        const cost = calculateCost(ns, candidates);
        if (cost <= money) return candidates;
    }
    return [];
}

export function calculateCost(ns: NS, augmentations: FullAugmentationInfo[]): number {
    const costMultiplier = getCostMultiplier(ns);
    return augmentations.map((aug, i) => aug.cost * (costMultiplier ** i))
        .reduce((a, b) => a+b, 0);
}

export function getGangFaction(ns: NS): (string | null) {
    return retrieveGangInfo(ns)?.gangInfo?.faction ?? null;
}


// -----------


export function calculateReputation(ns: NS, faction: string): number {
    const savedReputation = ns.singularity.getFactionRep(faction);
    // @todo update - no need to calculate inProgressReputation separately, since it's applied immediately
    // const inProgressReputation = (ns.singularity.isBusy() && ns.getPlayer().currentWorkFactionName==faction) ? ns.s getPlayer().workRepGained : 0;
    return savedReputation;
}

export function calculateAvailableMoney(ns: NS): number {
    return ns.getServerMoneyAvailable("home");
}

export function calculateAllAvailableMoney(ns: NS): number {
    const shareValue = (ns.stock.hasTIXAPIAccess()) ? getOwnedShareValue(ns) : 0;
    return calculateAvailableMoney(ns) + shareValue;
}

// -----------

function getAvailableAugmentations(ns: NS, goal: Goal, faction: string, availableMoney: number, rep: number): FullAugmentationInfo[] {
    return getUsefulAugmentations(ns, faction, goal)
        .filter(a => a.reputationNeeded < rep)
        .filter(a => a.cost < availableMoney);
}

function doCount(i: number): number[] {
    return [...Array(i).keys()];
}