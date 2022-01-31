import { reportGangInfo, mostLucrativeTask, buyAffordableEquipmentForIndividual } from "crime/libGang";
import { NS } from '@ns';

/// Set all gang members to be working on a particular task - e.g. terrorism

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return ["terrorism", "territory", "war", "peace", 
			"money", "training", "charisma", "buy"];
}

export async function main(ns: NS): Promise<void> {
	const goal = (ns.args[0] as string).toLowerCase() ?? null;

	const tasks = [
		{ name: "Terrorism", fn: (name: string) => ns.gang.setMemberTask(name, "Terrorism") },
		{ name: "Territory", fn: (name: string) => ns.gang.setMemberTask(name, "Territory Warfare") },
		{ name: "War", fn: (name: string) => ns.gang.setMemberTask(name, "Terrorism") },
		{ name: "Money", fn: (name: string) => ns.gang.setMemberTask(name, mostLucrativeTask(ns, name)) },
		{ name: "Train", fn: (name: string) => ns.gang.setMemberTask(name, "Train Combat") },
		{ name: "Charisma", fn: (name: string) => ns.gang.setMemberTask(name, "Train Charisma") },
		{ name: "Buy", fn: (name: string) => buyAffordableEquipmentForIndividual(ns, name) },
	]

	const selectedTask = tasks.find(t => t.name.toLowerCase() == goal?.toLowerCase());
	if (selectedTask==null) {
		ns.tprint("WARN Gang task not recognized - should be one of "+tasks.map(t => t.name.toLowerCase()));
	}	


	if (goal.toLowerCase()=="territory") {
		const gangInfo = ns.gang.getGangInformation();
		if (gangInfo.territoryClashChance > 0.005) {
			ns.tprint("WARN Cannot improve territory while warfare going on - starting to end warfare");
			ns.gang.setTerritoryWarfare(false);
			ns.exit();
		}
	}

	const gangMembers = ns.gang.getMemberNames();
	for (const name of gangMembers) {
		selectedTask?.fn(name)
	}
	if (goal=="war") {
		ns.gang.setTerritoryWarfare(true);
	}

	await reportGangInfo(ns);
}