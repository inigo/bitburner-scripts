/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as ports from "libPorts";
import { NS, SleeveTask } from '@ns'

type SleeveTaskInfo = { name: string, emoji: string };
export type SleeveNo = number;

export function listSleeves(ns: NS): SleeveNo[] {
	const sleeveCount = ns.sleeve.getNumSleeves();
	return [...Array(sleeveCount).keys()];
}

export function travelTo(ns: NS, sleeveNo: SleeveNo, city: string): void {
	const info = ns.sleeve.getInformation(sleeveNo);
	if (info.city!=city) {
		ns.sleeve.travel(sleeveNo, city);
	}
}

export function studyCs(ns: NS, sleeveNo: SleeveNo): void {
	const availableMoney = ns.getServerMoneyAvailable("home");
	const course = (availableMoney>100000) ? "Algorithms" : "Study Computer Science";
	studyCourse(ns, sleeveNo, course);
}

export function studyCharisma(ns: NS, sleeveNo: SleeveNo): void {
	studyCourse(ns, sleeveNo, "Leadership");
}

function studyCourse(ns: NS, sleeveNo: SleeveNo, course: string): void {
	const city = ns.sleeve.getInformation(sleeveNo).city;
	const uni = (city=="Volhaven") ? "ZB Institute of Technology" : "Rothman University";
	const task = ns.sleeve.getTask(sleeveNo);
	if (task.location != uni || task.task != course) {
		ns.sleeve.setToUniversityCourse(sleeveNo, uni, course);
	}
}

export function workout(ns: NS, sleeveNo: SleeveNo, stat: string): void {
	const location = "Powerhouse Gym";

	const task = ns.sleeve.getTask(sleeveNo);
	if (task.gymStatType != stat) {
		ns.sleeve.setToGymWorkout(sleeveNo, location, stat);
	}
}

export function commitCrime(ns: NS, sleeveNo: SleeveNo): void {
	const meanStats = getMeanCombatStat(ns, sleeveNo);
	const crime = (meanStats < 50) ? "Mug" : "Homicide";

	const task = ns.sleeve.getTask(sleeveNo);
	if (task.crime!=crime) {
		ns.sleeve.setToCommitCrime(sleeveNo, crime);
	}
}

export function recoverShock(ns: NS, sleeveNo: SleeveNo): void {
	const task = ns.sleeve.getTask(sleeveNo);
	if (task.task!="Recovery") {
		ns.sleeve.setToShockRecovery(sleeveNo);
	}
}

export function getMeanCombatStat(ns: NS, sleeveNo: SleeveNo): number {
	const slv = ns.sleeve.getSleeveStats(sleeveNo);
	const stats = [slv.agility, slv.defense, slv.dexterity, slv.strength];
	return stats.reduce((a,b) => a + b ) / stats.length;
}

export function getLowestPlayerCombatStat(ns: NS): CombatStat {
    const p = ns.getPlayer() as CombatStats;
    return getOrderedCombatStats(p)[0];
}

export function getOrderedCombatStats(skills: CombatStats): CombatStat[] {
    const combatStats = [ { name: "Agility", value: skills.agility }, { name: "Defense", value: skills.defense }, { name: "Dexterity", value: skills.dexterity }, { name: "Strength", value: skills.strength } ];
    return combatStats.sort((a, b) => a.value - b.value );
}

export type CombatStat = { name: string, value: number };

export type CombatStats = { strength: number, defense: number, dexterity: number, agility: number }

// --- Augmentations

export function installSleeveAugments(ns: NS, sleeveNo: SleeveNo, moneyToRetain = 600_000_000_000): void {
    const unwantedAugs = listUnwantedAugs();
    const potentialAugs = ns.sleeve.getSleevePurchasableAugs(sleeveNo);
    const interestingAugs = potentialAugs.filter( aug => ! unwantedAugs.includes(aug.name) ).sort((a, b) => a.cost - b.cost);
    if (interestingAugs.length==0) {
        ns.print("Already installed everything for sleeve "+sleeveNo);
    } else {
        for (const aug of interestingAugs) {
            const moneyToSpend = ns.getServerMoneyAvailable("home") - moneyToRetain;
            if (moneyToSpend > aug.cost) {
                ns.print("Buying "+aug.name+" for sleeve "+sleeveNo);
                ns.sleeve.purchaseSleeveAug(sleeveNo, aug.name);
            } else {
                ns.print("Not enough money to buy remaining augs");
                break;
            }
        }
        
    }
}

function listUnwantedAugs(): string[] {
    return [
        "Hydroflame Left Arm" // Too expensive
        , "QLink" // Too expensive
        , "Hacknet Node CPU Architecture Neural-Upload"  // Hacknet is useless for sleeves
        , "Hacknet Node Cache Architecture Neural-Upload"
        , "Hacknet Node NIC Architecture Neural-Upload"
        , "Hacknet Node Kernel Direct-Neural Interface"
        , "Hacknet Node Core Direct-Neural Interface"
        , "The Red Pill" // Useless for sleeves
    ];
}

// --- Reporting on sleeves

export async function reportSleeveTasks(ns: NS): Promise<void> {
	const tasks = listSleeves(ns).map(ns.sleeve.getTask);
	await ports.setPortValue(ns, ports.SLEEVE_REPORTS_PORT, JSON.stringify(tasks));
}

export function retrieveSleeveTasks(ns: NS): SleeveTask[] {
	const sleeveTasks = ports.checkPort(ns, ports.SLEEVE_REPORTS_PORT, JSON.parse) as (SleeveTask[] | null);
	return sleeveTasks ?? [];
}

/** Used by the dashboard */
export function lookupSleeveIcon(task: string): string {
	return listSleeveTasks().find(n => n.name.toLowerCase() === task.toLowerCase())?.emoji ?? "";
}

function listSleeveTasks(): SleeveTaskInfo[] {
	return [
		{ name: "Class", emoji: "📚" }
		, { name: "Gym", emoji: "🏋️‍♂️" }
		, { name: "Crime", emoji: "🔫" }
		, { name: "Faction", emoji: "👪" }	
		, { name: "Company", emoji: "👔" }
		, { name: "Recovery", emoji: "⚡" }
		, { name: "Synchro", emoji: "🕺🏻" }
		, { name: "Idle", emoji: "🛏️" }
	];
}

export async function setSleeveInstructions(ns: NS, instructions: SleeveInstructions): Promise<void> {
	await ports.setPortValue(ns, ports.SLEEVE_CONTROL_PORT, JSON.stringify(instructions));
}

export function retrieveSleeveInstructions(ns: NS): (SleeveInstructions | null) {
    return ports.checkPort(ns, ports.SLEEVE_CONTROL_PORT, JSON.parse);
}

export type SleeveInstructions = { useManualControl: boolean };