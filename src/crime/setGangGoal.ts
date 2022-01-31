import { setGangInstructions } from "crime/libGang";
import { NS } from '@ns';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return ["money", "territory", "respect", "general", "training"];
}

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
	const goal = (ns.args[0] as string) ?? "general";
	const stage = (ns.args[1] as string) ?? "early";
	const instructions = { goal: goal, stage: stage };
	await setGangInstructions(ns, instructions);
}