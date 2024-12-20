import { fmt, formatMoney } from "libFormat.js";
import * as ports from "libPorts.js";
import { GangGenInfo, GangMemberInfo, GangOtherInfoObject, NS } from '@ns';
import { retrieveCompanyStatus } from "corp/libCorporation";
import { getTotalMoney, buyWithShares } from "tix/libShareSelling";
import { GangReport } from "crime/libGangInfo";
import {max} from "lodash";

export async function manageGang(ns: NS, goal = "general", stage="early"): Promise<void> {
	const notEnoughMoney = !hasEnoughMoneyToRecruit(ns);
	const isInCorporation = retrieveCompanyStatus(ns) != null;

	recruit(ns);
	buyBasicEquipment(ns);
	buyAffordableEquipment(ns);
	// Once in a corporation, put money into gang equipment faster, but reduce as we grow to give more scope to augments
	const territorySizeMultiplier = ns.gang.getGangInformation().territory / 0.143;
	const bitNodeMultiplier = (ns.getResetInfo().currentNode==13) ? 10 : 1;
	await buyAugmentations(ns, isInCorporation ? (30_000_000_000*territorySizeMultiplier*bitNodeMultiplier) : 200_000_000_000*bitNodeMultiplier);
	startWarfare(ns);
	endWarfare(ns);
	
	const gangMembers = ns.gang.getMemberNames();

	const untrainedMembers = gangMembers.filter(m => isUntrainedForCombat(ns, m));
	untrainedMembers.forEach(name => ns.gang.setMemberTask(name, "Train Combat"));
	const unlikeableMembers = gangMembers.filter(m => isUnlikeable(ns, m) && ! untrainedMembers.includes(m));
	unlikeableMembers.forEach(name => ns.gang.setMemberTask(name, "Train Charisma"));

	
	const trainedMembers = gangMembers.filter(m => ! untrainedMembers.includes(m) && ! unlikeableMembers.includes(m));

	ascend(ns, trainedMembers);

	const isWantedTooHigh = wantedTooHigh(ns, stage);
	const reputationGoal = (stage=="early") ? 100000 : 750000;
	const hasEnoughRespect = getReputation(ns) > reputationGoal;
	const hasEnoughMoney = ns.getServerMoneyAvailable("home") > 1_000_000_000_000
	const hasEnoughIncome = ns.getTotalScriptIncome()[0] > 20_000_000;

	const currentGang = ns.gang.getGangInformation();

	const gangAugmentations = ns.singularity.getAugmentationsFromFaction(currentGang.faction);
	const maxReputationRequired = max(gangAugmentations.map(a => ns.singularity.getAugmentationRepReq(a))) ?? 0;
	const hasMaxReputation = getReputation(ns) > maxReputationRequired;

	for (const name of trainedMembers) {
		const member = ns.gang.getMemberInformation(name);
		const tasks = [...evaluateTasks(ns, currentGang, member)];
		const bestTaskForMoney = tasks.sort((a, b) => a.moneyGain - b.moneyGain).reverse()[0].task;
		const bestTaskForRespect = tasks.sort((a, b) => a.respectGain - b.respectGain).reverse()[0].task;
		const safestTaskForRespect = tasks.sort((a, b) => a.respectToCleanupRatio - b.respectToCleanupRatio).reverse()[0].task;

		const meanRespect = currentGang.respect / gangMembers.length;
		const notRespected = member.earnedRespect < (meanRespect / 2);

		let preferredTask = null;
		let reason = "";
		if (isWantedTooHigh) {
			preferredTask = safestTaskForRespect;
			reason = "the wanted level is high";
		} else if (notEnoughMoney) {
			preferredTask = bestTaskForMoney;
			reason = "not enough money";
		} else if (notRespected) {
			preferredTask = bestTaskForRespect;
			reason = "this individual is not respected";
		} else if (goal=="training") {
			preferredTask = (Math.random() <= (1/5)) ? "Train Charisma" : "Train Combat";
			reason = "the goal is training";
		} else if (Math.random() <= (1/7)) {
			// This helps even out tasks that just train specific stats
			preferredTask = (Math.random() <= (1/5)) ? "Train Charisma" : "Train Combat";
			reason = "one day of the week is for professional development";
		// If territoryClashChance is higher, then the gang member might be killed if doing warfare (although unlikely)
		} else if ((goal=="territory") && currentGang.territoryClashChance<0.01) {
			preferredTask = "Territory Warfare";
			reason = "the goal is territory and not currently fighting";
		} else if (goal == "respect" ) {
			preferredTask = bestTaskForRespect;
			reason = "the goal is respect"
		} else if (goal == "money" ) {
			preferredTask = bestTaskForMoney;
			reason = "the goal is money"
		} else if (hasMaxReputation) {
			preferredTask = bestTaskForMoney;
			reason = "reputation is at maximum - very little to gain now except money"
		} else if (hasEnoughMoney || hasEnoughIncome) {
			preferredTask = bestTaskForRespect;
			reason = "has enough money"
		} else if (hasEnoughRespect) {
			preferredTask = bestTaskForMoney;
			reason = "respect level is high enough already"
		} else {
			preferredTask = bestTaskForRespect;
			reason = "respect level is not yet high enough"
		}
		
		if (member.task != preferredTask) {
			ns.print("Setting task of "+preferredTask+" for "+name+" because "+reason);
			ns.gang.setMemberTask(name, preferredTask);
		}
	}
}

export function mostLucrativeTask(ns: NS, name: string): string {
	const currentGang = ns.gang.getGangInformation();
	const member = ns.gang.getMemberInformation(name);
	const tasks = [...evaluateTasks(ns, currentGang, member)];
	const bestTaskForMoney = tasks.sort((a, b) => a.moneyGain - b.moneyGain).reverse()[0].task;
	return bestTaskForMoney;
}

function getReputation(ns: NS): number {
	const currentGang = ns.gang.getGangInformation();
	const factionName = currentGang.faction;
	return ns.singularity.getFactionRep(factionName);
}

function buyBasicEquipment(ns: NS): void {
	const gangMembers = ns.gang.getMemberNames();
	for (const name of gangMembers) {
		listBaseEquipment().forEach(e => ns.gang.purchaseEquipment(name, e));
	}
}

function buyAffordableEquipment(ns: NS): void {
	const gangMembers = ns.gang.getMemberNames();
	for (const name of gangMembers) {
		buyAffordableEquipmentForIndividual(ns, name);
	}
}

export function buyAffordableEquipmentForIndividual(ns: NS, name: string): void {
	const existingEquipment = ns.gang.getMemberInformation(name).upgrades;
	getAffordableEquipment(ns)
		.filter(e => ! existingEquipment.includes(e))
		.forEach(e => ns.gang.purchaseEquipment(name, e));
}

export async function buyAugmentations(ns: NS, minimumMoney = 120_000_000_000): Promise<boolean> {
	const hasMoney = () => getTotalMoney(ns) > minimumMoney;
	if (!hasMoney()) return false;

	const gangMembers = ns.gang.getMemberNames();
	const augmentations = ns.gang.getEquipmentNames()
					.filter(eq => ns.gang.getEquipmentType(eq)=="Augmentation" ) 
					.filter(eq => isRelevantEquipment(ns, eq))
					.sort((a,b) => ns.gang.getEquipmentCost(a) - ns.gang.getEquipmentCost(b));
	let madePurchase = false;					
	for (const aug of augmentations) {
		for (const name of gangMembers) {
			ns.print("Buying augmentation for "+name+" - "+aug);
			madePurchase = madePurchase || await buyWithShares(ns, ns.gang.getEquipmentCost(aug), () => ns.gang.purchaseEquipment(name, aug));
			if (!hasMoney()) break;
		}
	}
	return madePurchase;
}

function startWarfare(ns: NS): void {
	const requiredRatio = 3;

	const gangInfo = ns.gang.getGangInformation();
	if (gangInfo.territory>0.999) {
		ns.gang.setTerritoryWarfare(false);
		return;
	} 

	const currentPower = gangInfo.power;
	const gangs = [ ... getOtherGangInfo(ns)];
	const rivals = gangs.filter(g => g.territory > 0).filter(g => (g.power * requiredRatio) >= currentPower)
	if (rivals.length == 0 && gangInfo.territoryClashChance <= 0.01) {
		if (! gangInfo.territoryWarfareEngaged) {
			ns.gang.setTerritoryWarfare(true);
			ns.print("Starting warfare");
		}
	}
}

function endWarfare(ns: NS) {
	const gangInfo = ns.gang.getGangInformation();
	if (! gangInfo.territoryWarfareEngaged) {
		return; 
	}
	const currentPower = gangInfo.power;
	const gangs = [ ... getOtherGangInfo(ns)];
	const rivals = gangs.filter(g => g.territory > 0).filter(g => (g.power * 1.8) >= currentPower);
	if (rivals.length > 0) {
		ns.print("Other gangs too close in power - ending warfare");
		ns.gang.setTerritoryWarfare(false);
	}
}

function* getOtherGangInfo(ns: NS): IterableIterator<SimpleGangInfo> {
	const currentGang = ns.gang.getGangInformation().faction;
	const gangNames = Object.entries(ns.gang.getOtherGangInformation())
						.filter(n => n[0] != currentGang);
	for (const v of gangNames) {
		const name = v[0];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const otherGangInfo: any = ns.gang.getOtherGangInformation();
		const info = (otherGangInfo[name] as GangOtherInfoObject);
		yield { name: name, power: info.power, territory: info.territory };
	}
}
type SimpleGangInfo = { name: string, power: number, territory: number };

function getAffordableEquipment(ns: NS): string[] {
	const income = (ns.getTotalScriptIncome()[0] + ns.gang.getGangInformation().moneyGainRate) * 10;
	const relevantEquipment = ns.gang.getEquipmentNames()
								.filter(e => isRelevantEquipment(ns, e));
	return relevantEquipment.filter(e => ns.gang.getEquipmentCost(e) <= income);
}

export function isRelevantEquipment(ns: NS, equipment: string): boolean {
	const stats = ns.gang.getEquipmentStats(equipment);
	const relevantImprovement = [ stats?.agi ?? 1, stats?.def ?? 1, stats?.dex ?? 1, stats?.str ?? 1, stats?.cha ?? 1 ];
	return relevantImprovement.some(e => e > 1);
}

export function ascend(ns: NS, members: string[]): void {
	const baseEquipment = listBaseEquipment();
	const allEquipment = ns.gang.getEquipmentNames()
								.filter(e => ns.gang.getEquipmentType(e) != "Augmentation" )
								.filter(e => isRelevantEquipment(ns, e));

	for (const member of members) {
		const currentMoney = ns.getServerMoneyAvailable("home");
		const relevantEquipment = getMeanAscensionMultiplier(ns, member) > 3 ? allEquipment : baseEquipment;
		const equipmentCost = totalCost(ns, relevantEquipment);

		if (shouldAscend(ns, member)) {
			if (currentMoney > equipmentCost ) {
				const message = "Ascending "+member+" at "+new Date()+" - spending "+formatMoney(ns, equipmentCost);
				ns.print(message);	
				ns.toast("Ascending "+member);
				ns.gang.ascendMember(member);
				relevantEquipment.forEach(e => ns.gang.purchaseEquipment(member, e));
			} else {
				ns.print(fmt(ns)`Want to ascend ${member} but can't afford to re-equip (cost would be £${equipmentCost})`);
			}
		}
	}
}

function getMeanAscensionMultiplier(ns: NS, member: string): number {
	const stats = ns.gang.getMemberInformation(member);
	const allAscMults = [stats.str_asc_mult, stats.def_asc_mult, stats.agi_asc_mult, stats.dex_asc_mult, stats.cha_asc_mult];
	const meanAscMult = (allAscMults.reduce((a,b) => a + b )) / allAscMults.length; 
	return meanAscMult;
}

export function shouldAscend(ns: NS, member: string): boolean {
	const result = ns.gang.getAscensionResult(member);
	const statsImprovement = [  
		result?.str ?? 0, result?.def ?? 0, result?.dex ?? 0, result?.agi ?? 0
	];

	const meanAscMult = getMeanAscensionMultiplier(ns, member);
	const requiredImprovement = meanAscMult > 20 ? 1.08 :
								meanAscMult > 15 ? 1.10 :
								meanAscMult > 10 ? 1.13 :
								meanAscMult > 9 ? 1.3 :
								meanAscMult > 5 ? 1.4 :
								meanAscMult > 1 ? 1.5 : 
								1.6;
	const bitNodeModifier = (ns.getResetInfo().currentNode==13) ? 0.6 : 0;
	const shouldAscend = statsImprovement.filter(s => s > (requiredImprovement+bitNodeModifier)).length >= 3;

	const lostRespect = result?.respect ?? 0;
	const totalRespect = ns.gang.getGangInformation().respect;
	const respectLossRatio = lostRespect / totalRespect;
	const blockedByRespectLoss = respectLossRatio > 0.3;

	const finalResult = shouldAscend && !blockedByRespectLoss;

	if (shouldAscend && blockedByRespectLoss) {
		ns.print("Would like to ascend "+member+" but would lose too much respect");
	}
	return finalResult;
}

function* evaluateTasks(ns: NS, currentGang: GangGenInfo, member: GangMemberInfo): IterableIterator<TaskInfo> {
	const allTasks = ns.gang.getTaskNames();
	const vigilanteJustice = ns.gang.getTaskStats("Vigilante Justice");
	const vigilanteWantedLoss = -1 * ns.formulas.gang.wantedLevelGain(currentGang, member, vigilanteJustice);

	for (const task of allTasks) {
		const taskStats = ns.gang.getTaskStats(task);
		const respectGain = ns.formulas.gang.respectGain(currentGang, member, taskStats);
		const moneyGain = ns.formulas.gang.moneyGain(currentGang, member, taskStats);
		const wantedGain = ns.formulas.gang.wantedLevelGain(currentGang, member, taskStats) / 2;
		const moneyToWantedRatio = (wantedGain>0) ? moneyGain / wantedGain : 0;
		const moneyToCleanupRatio = (wantedGain>0) ? moneyGain / (1 + (wantedGain / vigilanteWantedLoss)) : 0;
		const respectToCleanupRatio = (wantedGain>0) ? respectGain / (1 + (wantedGain / vigilanteWantedLoss)) : 0;
		
		yield {task, moneyGain, wantedGain, respectGain, moneyToWantedRatio, moneyToCleanupRatio, respectToCleanupRatio};
	}
}
type TaskInfo = { task: string, moneyGain: number, wantedGain: number, respectGain: number, moneyToWantedRatio: number, moneyToCleanupRatio: number, respectToCleanupRatio: number };

function isUntrainedForCombat(ns: NS, name: string): boolean {
	const stats = ns.gang.getMemberInformation(name);
	const combatStats = [stats.agi, stats.def, stats.dex, stats.str];

	const ascMults = [stats.str_asc_mult, stats.def_asc_mult, stats.agi_asc_mult, stats.dex_asc_mult];
	const minAscMult = Math.min(... ascMults);
	const meanAscMult = (ascMults.reduce((a,b) => a + b )) / ascMults.length;

	const minCombatStat = 90 * minAscMult;
	const minMeanStats = 120 * meanAscMult;
	const lowStats = combatStats.filter(s => s < minCombatStat);
	const meanStats = combatStats.reduce((a, b) => a+b) / combatStats.length;
	return lowStats.length > 0 || meanStats < minMeanStats;
}


function isUnlikeable(ns: NS, name: string): boolean {
	const stats = ns.gang.getMemberInformation(name);
	const charismaStat = stats.cha;
	const minCharismaStat = stats.cha_asc_mult==1 ? 95 : 95;
	return charismaStat < minCharismaStat;
}

function recruit(ns: NS): (string | null) {
	if (!ns.gang.canRecruitMember()) { return null; }

	if (! hasEnoughMoneyToRecruit(ns)) {
		ns.print("Would like to recruit, but not enough money");
		return null;
	}
	
	const name = getNewName(ns);
	ns.gang.recruitMember(name);
	listBaseEquipment().forEach(e => ns.gang.purchaseEquipment(name, e));
	ns.gang.setMemberTask(name, "Train Combat");
	ns.toast("Recruited "+name);
	return name;
}

function hasEnoughMoneyToRecruit(ns: NS): boolean {
	const baseEquipmentCost = totalCost(ns, listBaseEquipment());
	const availableMoney = ns.getServerMoneyAvailable("home");
	return availableMoney >= baseEquipmentCost;
}

function totalCost(ns: NS, equipment: string[]): number {
	return equipment.map(e => ns.gang.getEquipmentCost(e)).reduce((a, b) => a + b );
}

/* Cheap equipment that every gang member should start with */
function listBaseEquipment(): string[] {
	return [ "Baseball Bat", "Bulletproof Vest", "Ford Flex V20", "Katana"
			, "ATX1070 Superbike", "Full Body Armor", "Glock 18C"
			, "Mercedes-Benz S9001", "White Ferrari"
	];
}

function wantedTooHigh(ns: NS, stage: string) {
	// This is a number between 0 and 1 - e.g. 0.95 for a 5% penalty
	const wantedGoal = (stage=="early") ? 0.97 : 0.99;
	return ns.gang.getGangInformation().wantedPenalty <= wantedGoal;
}

/** Should be passed an argument like { goal: "money" } */
export async function setGangInstructions(ns: NS, instructions: GangInstructions): Promise<void> {
	if (instructions==null) { 
		ns.toast("Clearing gang instructions"); 
	} else {
		ns.toast("Setting gang goal to "+instructions.goal);
	}
	await ports.setPortValue(ns, ports.GANG_CONTROL_PORT, JSON.stringify(instructions));
}
type GangInstructions = { goal: string, stage? : string };

export function getGangInstructions(ns: NS): GangInstructions {
	return ports.checkPort(ns, ports.GANG_CONTROL_PORT, JSON.parse);
}

function getNewName(ns: NS): string {
	const fixCase = (s: string) => s.substring(0,1)+s.substring(1).toLowerCase();
	const existingMembers = ns.gang.getMemberNames();
	const possibleNames = listNames().map(m => fixCase(m));
	const availableNames = possibleNames.filter(m => ! existingMembers.includes(m));
	const names = (availableNames.length==0) ? possibleNames : availableNames;
	const prefix = (availableNames.length>0 && Math.random() < 0.7) ? namePrefixes()[ randomInt(namePrefixes().length) ]+" " : "";
	const randomName = names[ randomInt(names.length) ];

	return prefix + randomName;
}

function randomInt(outOf: number): number {
	return Math.floor(Math.random() * outOf);
}

function namePrefixes(): string[] {
	return [ "Big", "L'il", "Scary", "Nice", "Stabby", "Monkey", "One-eyed", "Pegleg", "Fierce", "Bloody", "Cap'n", "Scurvy", "Shifty", "Diamond", "Jolly"];
}

function listNames(): string[] {
	return [
		"OLIVER", "CHARLOTTE", "WILLOW", "DECLAN", "AURORA", "EZRA", "THEODORE",
		"VIOLET", "ROWAN", "JASPER", "HAZEL", "JAMES", "SILAS", "LUNA", "QUINN",
		"LIAM", "AMELIA", "LOGAN", "ASHER", "ARIA", "KAI", "FINN", "AVA", "RIVER",
		"OWEN", "SCARLETT", "AVERY", "ETHAN", "ISLA", "LUCA", "ALEXANDER", "IVY",
		"SAGE", "FELIX", "FREYA", "HARPER", "HENRY", "NORA", "EDEN", "GABRIEL", "WREN",
		"RILEY", "ELIJAH", "EVELYN", "ARTEMIS", "LEO", "OLIVIA", "JADE", "NOAH",
		"AUDREY", "JULIAN", "AUGUST", "IRIS", "FINLEY", "LEVI", "ELEANOR", "DARCY",
		"SEBASTIAN", "ABIGAIL", "BRIAR", "RYAN", "ARCHER", "ADELAIDE", "ASPEN",
		"GRAYSON", "EVANGELINE", "SAWYER", "MILO", "ALICE", "ADDISON", "EMMETT",
		"ELIZABETH", "HAYDEN", "ISAAC", "LILY", "AUBREY", "JACK", "ELOISE", "ORION",
		"EVERETT", "GRACE", "NOVA", "WILLIAM", "GENEVIEVE", "DYLAN", "ATLAS",
		"PENELOPE", "PIPER", "ARTHUR", "ROSE", "ELLIOT", "THEO", "SOPHIA", "BAILEY",
		"RONAN", "CHLOE", "POPPY", "SAMUEL", "LYDIA", "BLAKE", "CALEB", "EMMA",
		"INDIGO", "AIDEN", "ANASTASIA", "RORY", "MILES", "CLARA", "EVERLY", "ELLIOTT",
		"ADELINE", "RAIN", "LANDON", "ATHENA", "BECKETT", "AXEL", "ELIZA", "BLAIR",
		"ARLO", "CLAIRE", "SKYE", "ELIAS", "ELLA", "ECHO", "ELI", "ARABELLA",
		"EMERSON", "ANDREW", "MILA", "HARLOW", "CALLUM", "STELLA", "JUDE", "XANDER",
		"JUNIPER", "MORGAN", "LUCAS", "ESME", "RAVEN", "WYATT", "ASTRID", "SKYLAR",
		"SOREN", "CORA", "PARKER",
	];
}




export async function reportGangInfo(ns: NS): Promise<void> {
	const info = ns.gang.getGangInformation();
	const gangMembers = ns.gang.getMemberNames();
	const factionRep = ns.singularity.getFactionRep(info.faction);
	const memberInfos = gangMembers
							.map(ns.gang.getMemberInformation)
							.map(m => { return { name: m.name, task: m.task }; } );
	const combinedInfo: GangReport = {
		gangInfo: info,
		factionRep,
		members: memberInfos 
	}

	await ports.setPortValue(ns, ports.GANG_REPORTS_PORT, JSON.stringify(combinedInfo));
}


