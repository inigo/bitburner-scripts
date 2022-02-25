/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {NS, AugmentationStats} from '@ns'
import { retrieveGangInfo } from "/crime/libGangInfo";
import * as ports from "libPorts";
import {getOwnedShareValue} from "/tix/libTix";

export function getCostMultiplier(ns: NS): number {
    const sf11Count = ns.getOwnedSourceFiles().filter(sf => sf.n == 11).length;
    const sf11Modifier = [1, 0.96, 0.94, 0.93].at(sf11Count) !;
    return 1.9 * sf11Modifier;
}

export function getUsefulAugmentations(ns: NS, faction: string): FullAugmentationInfo[] {
	const ownedAugmentations = ns.getOwnedAugmentations(true);
	const availableAugmentations = ns.getAugmentationsFromFaction(faction);
	const augs = availableAugmentations
			.map(a => getAugmentationInfo(ns, a))
			.filter(a => ! ownedAugmentations.includes(a.name))
			.filter(a => a.isHackingAugmentation || a.isHacknetAugmentation || a.isReputationAugmentation)
			.filter(a => !a.isNeuroflux);
    ns.print("There are "+augs.length+" useful augmentations available from "+faction);
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

export function countAvailableNeuroflux(ns: NS, availableToSpend: number = ns.getServerMoneyAvailable("home")): number {
    const neurofluxFaction = getNeurofluxFaction(ns);
    if (neurofluxFaction==null) return 0;

    const reputation = ns.getFactionRep(neurofluxFaction);
    const startingPrice = ns.getAugmentationPrice("NeuroFlux Governor");
    const startingReputationRequired = ns.getAugmentationRepReq("NeuroFlux Governor");

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
        .sort((a, b) => ns.getFactionRep(a) - ns.getFactionRep(b))
        .reverse();
    return factions.at(0)  ?? null;
}

export async function reportAugInfo(ns: NS, augs: FullAugmentationInfo[]): Promise<void> {
    const cost = calculateCost(ns, augs);
    const moneyAfterCost = calculateAllAvailableMoney(ns) - cost;
    const neurofluxCount = countAvailableNeuroflux(ns, moneyAfterCost);

    const info = { augCount: augs.length, installableAugs: augs, neurofluxCount };
    await ports.setPortValue(ns, ports.AUG_REPORTS_PORT, JSON.stringify(info));
}

export function retrieveAugInfo(ns: NS): (AugReport | null) {
    return ports.checkPort(ns, ports.AUG_REPORTS_PORT, JSON.parse) as (AugReport | null);
}

export type AugReport = { augCount: number, installableAugs: FullAugmentationInfo[], neurofluxCount: number  }


// ----------

export function evaluateAugmentationPurchase(ns: NS, faction: string, augsToBuy: FullAugmentationInfo[], requiredCount: number): boolean {
    if (augsToBuy.length==0) return false;

    const usefulAugmentations = getUsefulAugmentations(ns, faction);

    const isGangFaction = (faction == getGangFaction(ns));
    if (!isGangFaction) {
        return augsToBuy.length == usefulAugmentations.length;
    } else {
        return (augsToBuy.length>=requiredCount) || ((usefulAugmentations.length - augsToBuy.length) <= 2);
    }
}

export function getBestInstallableAugmentations(ns: NS, faction: string): FullAugmentationInfo[] {
    const money = calculateAllAvailableMoney(ns);
    const reputation = calculateReputation(ns, faction);

    const availableAugmentations = getAvailableAugmentations(ns, faction, money, reputation);

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
    const savedReputation = ns.getFactionRep(faction);
    const inProgressReputation = (ns.isBusy() && ns.getPlayer().currentWorkFactionName==faction) ? ns.getPlayer().workRepGained : 0;
    return savedReputation + inProgressReputation;
}

export function calculateAvailableMoney(ns: NS): number {
    return ns.getServerMoneyAvailable("home");
}

export function calculateAllAvailableMoney(ns: NS): number {
    const shareValue = (ns.getPlayer().hasTixApiAccess) ? getOwnedShareValue(ns) : 0;
    return calculateAvailableMoney(ns) + shareValue;
}

// -----------

function getAvailableAugmentations(ns: NS, faction: string, availableMoney: number, rep: number): FullAugmentationInfo[] {
    return getUsefulAugmentations(ns, faction)
        .filter(a => a.reputationNeeded < rep)
        .filter(a => a.cost < availableMoney);
}

function doCount(i: number): number[] {
    return [...Array(i).keys()];
}