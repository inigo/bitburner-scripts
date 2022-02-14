/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { studyCs, listSleeves, workout, studyCharisma, travelTo, reportSleeveTasks, recoverShock, commitCrime, SleeveNo
		, setSleeveInstructions, SleeveInstructions } from "sleeve/libSleeve";
import { NS } from '@ns'

export function autocomplete(): string[] {
    return ["spread", "strength", "agility", "dexterity", 
			"charisma", "defense", "study", "crime", "shock", 
			"home", "volhaven", "clear", "gym"];
}

/**
 * Set all sleeves to be working on a particular task - typically "spread", "crime" or "study".
 * Once a particular task has been set manually here, then it will not be overridden by the
 * standard selectSleeveTask until it has been cleared.
 */
export async function main(ns: NS): Promise<void> {
	const goal = (ns.args[0] as string) ?? null;

	const tasks = [
		{ name: "Shock", fn: (i: SleeveNo) => recoverShock(ns, i) },		
		{ name: "Study", fn: (i: SleeveNo) => studyCs(ns, i) },		
		{ name: "Agility", fn: (i: SleeveNo) => workout(ns, i, "Agility") },
		{ name: "Dexterity", fn: (i: SleeveNo) => workout(ns, i, "Dexterity") },
		{ name: "Strength", fn: (i: SleeveNo) => workout(ns, i, "Strength") },
		{ name: "Defense", fn: (i: SleeveNo) => workout(ns, i, "Defense") },
		{ name: "Charisma", fn: (i: SleeveNo) => studyCharisma(ns, i) },
		{ name: "Crime", fn: (i: SleeveNo) => commitCrime(ns, i) },
		{ name: "Home", fn: (i: SleeveNo) => travelTo(ns, i, "Sector-12") },
		{ name: "Volhaven", fn: (i: SleeveNo) => travelTo(ns, i, "Volhaven") },
	]
	const selectedTask = (goal==null || goal=="spread") ? null : tasks.find(t => t.name.toLowerCase() == goal.toLowerCase()) !;

	for (const i of listSleeves(ns)) {
		const taskFn = (goal=="gym") ? tasks.at( 2 + (i % 4) )!.fn :
						(goal=="spread") ? tasks.at( i % 7 )!.fn :
						selectedTask?.fn;
		if (taskFn!=null) {
			taskFn(i);
		}
	}

	const useManualControl: boolean = (selectedTask!=null || goal=="spread" || goal=="gym");
	const instructions: SleeveInstructions = { useManualControl };

	await reportSleeveTasks(ns);
	// Don't update instructions when just travelling
	if (goal!="home" && goal!="volhaven") {
		await setSleeveInstructions(ns, instructions);
	}
}
