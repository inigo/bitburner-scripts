/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { studyCs, listSleeves, workout, studyCharisma, travelTo, reportSleeveTasks, recoverShock, commitCrime, SleeveNo } from "sleeve/libSleeve";
import { NS } from '@ns'

/// Set all sleeves to be working on a particular task - typically "spread", "crime" or "study"

export function autocomplete(): string[] {
    return ["spread", "strength", "agility", "dexterity", 
			"charisma", "defense", "study", "crime", "shock", 
			"home", "volhaven"];
}

export async function main(ns: NS): Promise<void> {
	const goal = (ns.args[0] as string) ?? null;

	const tasks = [
		{ name: "Study", fn: (i: SleeveNo) => studyCs(ns, i) },
		{ name: "Agility", fn: (i: SleeveNo) => workout(ns, i, "Agility") },
		{ name: "Dexterity", fn: (i: SleeveNo) => workout(ns, i, "Dexterity") },
		{ name: "Strength", fn: (i: SleeveNo) => workout(ns, i, "Strength") },
		{ name: "Defense", fn: (i: SleeveNo) => workout(ns, i, "Defense") },
		{ name: "Charisma", fn: (i: SleeveNo) => studyCharisma(ns, i) },
		{ name: "Shock", fn: (i: SleeveNo) => recoverShock(ns, i) },
		{ name: "Crime", fn: (i: SleeveNo) => commitCrime(ns, i) },
		{ name: "Home", fn: (i: SleeveNo) => travelTo(ns, i, "Sector-12") },
		{ name: "Volhaven", fn: (i: SleeveNo) => travelTo(ns, i, "Volhaven") },
	]
	const selectedTask = (goal==null || goal=="spread") ? null : tasks.find(t => t.name.toLowerCase() == goal.toLowerCase()) !;

	for (const i of listSleeves(ns)) {
		const taskFn = selectedTask?.fn ?? tasks.at( i % 6 )!.fn;
		taskFn(i);
	}

	await reportSleeveTasks(ns);
}
